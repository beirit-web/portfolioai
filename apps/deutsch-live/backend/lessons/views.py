import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import connection
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.html import strip_tags
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .ai_service import get_gpt_service
from .ai_limits import check_and_consume_ai_usage
from .api_responses import error_response
from .billing_service import BillingProviderError, WebhookSignatureError, billing_provider_status, checkout_preview, create_stripe_checkout_session, process_paypal_webhook, process_stripe_webhook
from .dashboard_service import build_dashboard_payload
from .data import PAGE_CONTENT, TOPICS
from .email_service import send_email_confirmation, send_password_reset
from .learning_content import (
    category_detail_from_db,
    category_summaries_from_db,
    pronunciation_for_topic,
    scene_cards_from_db,
    scene_exercises,
)
from .models import BotExchange, Category, ChatHistory, Feedback, Plan, QuizAttempt, QuizQuestion, QuizResult, Subscription, UserProgress, UserVocabulary, WritingExercise
from .account_service import get_profile as _get_profile, has_valid_auth_token as _has_valid_auth_token
from .middleware import login_rate_limit_key
from .permissions import api_login_required, premium_required, staff_required
from .realtime import realtime_feature_status, send_user_notification
from .security import log_security_event
from .serializers import (
    serialize_feedback as _serialize_feedback,
    serialize_plan as _serialize_plan,
    serialize_profile as _serialize_profile,
    serialize_subscription as _serialize_subscription,
    serialize_user as _serialize_user,
    serialize_writing_exercise as _serialize_writing_exercise,
)
from .writing_service import create_bot_reply_exercise, create_writing_exercise


@require_GET
def topics(request):
    payload = [
        {
            "id": topic_id,
            "label": topic["label"],
            "icon": topic["icon"],
            "ru": topic["ru"],
            "phraseCount": len(topic["phrases"]),
            "quizCount": len(topic["quiz"]),
        }
        for topic_id, topic in TOPICS.items()
    ]
    db_payload = category_summaries_from_db()
    if db_payload:
        merged = {item["id"]: item for item in payload}
        merged.update({item["id"]: item for item in db_payload})
        payload = list(merged.values())
    return JsonResponse({"topics": payload})


@require_GET
def topic_detail(request, topic_id):
    db_topic = category_detail_from_db(topic_id)
    if db_topic:
        return JsonResponse(db_topic)

    topic = TOPICS.get(topic_id)
    if topic is None:
        return error_response("Тема не найдена.", status=404, code="topic_not_found")

    return JsonResponse({"id": topic_id, **topic})


@require_GET
def scenes(request):
    db_payload = scene_cards_from_db()
    if db_payload:
        return JsonResponse({"scenes": db_payload})

    payload = []
    for topic_id, topic in TOPICS.items():
        payload.append(
            {
                "id": topic_id,
                "title": topic["label"],
                "icon": topic["icon"],
                "ru": topic["ru"],
                "dialogues": topic["phrases"],
                "pronunciation": pronunciation_for_topic(topic_id),
                "exercises": scene_exercises(topic_id),
            }
        )
    return JsonResponse({"scenes": payload})


@require_GET
def page_content(request):
    return JsonResponse(PAGE_CONTENT)


@ensure_csrf_cookie
@require_GET
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def me(request):
    if not request.user.is_authenticated or not _has_valid_auth_token(request):
        logout(request)
        return JsonResponse({"user": None})

    profile = _get_profile(request.user)
    return JsonResponse({"user": _serialize_user(request.user, profile), "authTokenExpiresAt": _token_expires_at()})


@require_POST
def register(request):
    data = _json_body(request)
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return error_response("Укажите имя пользователя, E-Mail и пароль.", code="missing_registration_fields")
    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as error:
        return error_response(" ".join(error.messages), code="invalid_registration_data")
    if User.objects.filter(username__iexact=username).exists() or User.objects.filter(email__iexact=email).exists():
        return error_response("Регистрацию нельзя завершить с этими данными.", code="registration_not_allowed")

    user = User.objects.create_user(username=username, email=email, password=password)
    _ensure_groups()
    learner_group = Group.objects.get(name="learner")
    user.groups.add(learner_group)
    profile = _get_profile(user)
    login(request, user)
    request.session.set_expiry(settings.AUTH_TOKEN_MAX_AGE)
    payload = {"user": _serialize_user(user, profile), "authTokenExpiresAt": _token_expires_at(), "emailVerificationRequired": True}
    email_token = _make_email_confirmation_token(user)
    send_email_confirmation(user, email_token)
    if settings.DEBUG:
        payload["emailVerificationToken"] = email_token
    response = JsonResponse(payload, status=201)
    _set_auth_token(response, user)
    return response


@require_POST
def login_view(request):
    data = _json_body(request)
    username = data.get("username", "").strip()
    password = data.get("password", "")
    rate_key = login_rate_limit_key(request, username)

    user = authenticate(request, username=username, password=password)

    if user is None:
        log_security_event("login_failed", username=username, ip=_client_ip(request))
        return error_response("Неверное имя пользователя или пароль.", code="invalid_credentials")
    if not user.is_active:
        return error_response("Этот аккаунт отключён.", status=403, code="account_disabled")

    login(request, user)
    request.session.set_expiry(settings.AUTH_TOKEN_MAX_AGE)
    cache.delete(rate_key)
    profile = _get_profile(user)
    response = JsonResponse({"user": _serialize_user(user, profile), "authTokenExpiresAt": _token_expires_at()})
    _set_auth_token(response, user)
    return response


@require_POST
def logout_view(request):
    logout(request)
    response = JsonResponse({"ok": True})
    response.delete_cookie("learning_auth_token", samesite="Lax")
    return response


@require_POST
def request_password_reset(request):
    data = _json_body(request)
    identifier = data.get("identifier", "").strip()
    if not identifier:
        return error_response("Укажите имя пользователя или E-Mail.", code="missing_identifier")

    user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
    payload = {
        "ok": True,
        "message": "Если аккаунт найден, мы подготовим ссылку для сброса пароля.",
    }
    if user:
        reset_token = _make_password_reset_token(user)
        send_password_reset(user, reset_token)
        if settings.DEBUG:
            payload["resetToken"] = reset_token
    return JsonResponse(payload)


@require_POST
def confirm_password_reset(request):
    data = _json_body(request)
    token = data.get("token", "")
    password = data.get("password", "")
    user = _user_from_signed_token(token, "password-reset", max_age=60 * 60)
    if user is None:
        return error_response("Ссылка недействительна или устарела.", code="invalid_or_expired_token")
    try:
        validate_password(password, user)
    except ValidationError as error:
        return error_response(" ".join(error.messages), code="invalid_password")
    user.set_password(password)
    user.save(update_fields=["password"])
    return JsonResponse({"ok": True, "message": "Пароль обновлён."})


@require_POST
def confirm_email(request):
    data = _json_body(request)
    user = _user_from_signed_token(data.get("token", ""), "email-confirm", max_age=60 * 60 * 24)
    if user is None:
        return error_response("Ссылка подтверждения недействительна или устарела.", code="invalid_or_expired_token")
    profile = _get_profile(user)
    profile.email_verified = True
    profile.save(update_fields=["email_verified", "updated_at"])
    return JsonResponse({"ok": True, "message": "E-Mail подтверждён."})


@api_login_required
@require_POST
def resend_email_confirmation(request):
    payload = {"ok": True, "message": "Если E-Mail ещё не подтверждён, ссылка подготовлена."}
    profile = _get_profile(request.user)
    if not profile.email_verified:
        email_token = _make_email_confirmation_token(request.user)
        send_email_confirmation(request.user, email_token)
        if settings.DEBUG:
            payload["emailVerificationToken"] = email_token
    return JsonResponse(payload)


@api_login_required
@require_POST
def delete_account(request):
    data = _json_body(request)
    password = data.get("password", "")
    if not check_password(password, request.user.password):
        return error_response("Пароль указан неверно.", code="invalid_password")

    user = request.user
    logout(request)
    user.delete()
    response = JsonResponse({"ok": True})
    response.delete_cookie("learning_auth_token", samesite="Lax")
    return response


@api_login_required
@require_POST
def change_password(request):
    data = _json_body(request)
    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")
    if not check_password(current_password, request.user.password):
        return error_response("Текущий пароль указан неверно.", code="invalid_current_password")
    try:
        validate_password(new_password, request.user)
    except ValidationError as error:
        return error_response(" ".join(error.messages), code="invalid_password")
    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    logout(request)
    response = JsonResponse({"ok": True, "message": "Пароль изменён. Войдите снова."})
    response.delete_cookie("learning_auth_token", samesite="Lax")
    return response


@api_login_required
@require_GET
def export_user_data(request):
    profile = _get_profile(request.user)
    data = {
        "account": {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "dateJoined": request.user.date_joined.isoformat(),
        },
        "profile": _serialize_profile(profile),
        "quizAttempts": [
            {
                "topicId": item.topic_id,
                "topicLabel": item.topic_label,
                "score": item.score,
                "total": item.total,
                "durationSeconds": item.duration_seconds,
                "difficulty": item.difficulty,
                "createdAt": item.created_at.isoformat(),
            }
            for item in QuizAttempt.objects.filter(user=request.user)
        ],
        "sceneProgress": [
            {
                "topicId": item.topic_id,
                "status": item.status,
                "completedExercises": item.completed_exercises,
                "lastActivityAt": item.last_activity_at.isoformat(),
            }
            for item in UserProgress.objects.filter(user=request.user)
        ],
        "vocabulary": [
            {
                "wordDe": item.word_de,
                "translationRu": item.translation_ru,
                "sourceTopicId": item.source_topic_id,
                "notes": item.notes,
                "createdAt": item.created_at.isoformat(),
            }
            for item in UserVocabulary.objects.filter(user=request.user)
        ],
        "writingHistory": [
            _serialize_writing_exercise(item) for item in WritingExercise.objects.filter(user=request.user)
        ],
        "achievements": list(request.user.achievements.values("code", "title")),
    }
    response = JsonResponse({"export": data, "format": "json"}, json_dumps_params={"ensure_ascii": False, "indent": 2})
    response["Content-Disposition"] = 'attachment; filename="deutsch-live-export.json"'
    return response


@api_login_required
@require_POST
def clear_learning_progress(request):
    deleted = {
        "quizAttempts": QuizAttempt.objects.filter(user=request.user).delete()[0],
        "sceneProgress": UserProgress.objects.filter(user=request.user).delete()[0],
        "vocabulary": UserVocabulary.objects.filter(user=request.user).delete()[0],
        "botExchanges": BotExchange.objects.filter(user=request.user).delete()[0],
        "chatHistory": ChatHistory.objects.filter(user=request.user).delete()[0],
        "writingExercises": WritingExercise.objects.filter(user=request.user).delete()[0],
    }
    request.user.achievements.clear()
    return JsonResponse({"ok": True, "deleted": deleted})


@api_login_required
@require_GET
def dashboard(request):
    return JsonResponse(build_dashboard_payload(request.user))


@api_login_required
@require_POST
def save_quiz_attempt(request):
    data = _json_body(request)
    topic_id = data.get("topicId")
    topic_label = _topic_label_for_quiz(topic_id)
    score = int(data.get("score", 0))
    total = int(data.get("total", 0))
    duration_seconds = max(0, int(data.get("durationSeconds", 0)))
    difficulty = data.get("difficulty", "easy")

    if topic_label is None or total <= 0 or score < 0 or score > total or difficulty not in ["easy", "medium", "hard"]:
        return error_response("Некорректный результат викторины.", code="invalid_quiz_attempt")

    attempt = QuizResult.objects.create(
        user=request.user,
        topic_id=topic_id,
        topic_label=topic_label,
        score=score,
        total=total,
        duration_seconds=duration_seconds,
        difficulty=difficulty,
    )
    send_user_notification(
        request.user.id,
        "quiz_attempt_saved",
        {
            "attemptId": attempt.id,
            "topicId": attempt.topic_id,
            "topicLabel": attempt.topic_label,
            "score": attempt.score,
            "total": attempt.total,
            "percentage": attempt.percentage,
            "durationSeconds": attempt.duration_seconds,
            "difficulty": attempt.difficulty,
        },
    )
    return JsonResponse(
        {
            "attempt": {
                "id": attempt.id,
                "topicLabel": attempt.topic_label,
                "score": attempt.score,
                "total": attempt.total,
                "percentage": attempt.percentage,
                "durationSeconds": attempt.duration_seconds,
                "difficulty": attempt.difficulty,
            }
        },
        status=201,
    )


@api_login_required
@require_POST
def save_progress(request):
    data = _json_body(request)
    topic_id = data.get("topicId")
    status = data.get("status", "started")
    topic = TOPICS.get(topic_id)
    if topic is None or status not in ["started", "completed"]:
        return error_response("Некорректные данные прогресса.", code="invalid_progress")

    progress, _created = UserProgress.objects.update_or_create(
        user=request.user,
        topic_id=topic_id,
        defaults={"status": status, "completed_exercises": int(data.get("completedExercises", 0))},
    )
    send_user_notification(
        request.user.id,
        "progress_updated",
        {
            "topicId": progress.topic_id,
            "status": progress.status,
            "completedExercises": progress.completed_exercises,
        },
    )
    return JsonResponse(
        {
            "progress": {
                "topicId": progress.topic_id,
                "status": progress.status,
                "completedExercises": progress.completed_exercises,
            }
        },
        status=201,
    )


@api_login_required
@require_POST
def save_vocabulary(request):
    data = _json_body(request)
    word_de = data.get("wordDe", "").strip()
    translation_ru = data.get("translationRu", "").strip()
    if not word_de or not translation_ru:
        return error_response("Укажите слово и перевод.", code="missing_vocabulary_fields")

    item, _created = UserVocabulary.objects.update_or_create(
        user=request.user,
        word_de=word_de,
        defaults={
            "translation_ru": translation_ru,
            "source_topic_id": data.get("topicId", ""),
            "notes": data.get("notes", ""),
        },
    )
    return JsonResponse({"vocabulary": {"id": item.id, "wordDe": item.word_de, "translationRu": item.translation_ru}}, status=201)


@api_login_required
@require_POST
def bot_reply(request):
    data = _json_body(request)
    question = data.get("question", "").strip()
    if not question:
        return error_response("Напишите вопрос или ответ.", code="missing_question")

    profile = _get_profile(request.user)
    prompt = data.get("prompt", "Свободная письменная практика").strip() or "Свободная письменная практика"
    topic_id = data.get("topicId", profile.preferred_topic or "baeckerei").strip() or "baeckerei"
    topic_label = _topic_label(topic_id)
    usage = check_and_consume_ai_usage(request.user, profile, question, prompt, topic_id)
    if not usage.allowed:
        status = 402 if usage.code == "premium_required" else 429 if usage.code == "ai_daily_limit_reached" else 400
        return error_response(usage.message, status=status, code=usage.code)
    feedback = get_gpt_service().writing_feedback(question, prompt, profile)
    exchange, exercise = create_bot_reply_exercise(request.user, question, prompt, topic_id, topic_label, feedback)
    return JsonResponse({
        "exchange": {"id": exchange.id, "question": question, "answer": feedback.answer},
        "exercise": _serialize_writing_exercise(exercise),
    })


@api_login_required
@require_http_methods(["GET", "POST"])
def writing_exercises(request):
    if request.method == "GET":
        exercises = WritingExercise.objects.filter(user=request.user)[:12]
        return JsonResponse({"exercises": [_serialize_writing_exercise(item) for item in exercises]})

    data = _json_body(request)
    user_text = data.get("text", "").strip()
    prompt = data.get("prompt", "").strip()
    topic_id = data.get("topicId", "baeckerei").strip() or "baeckerei"
    if not user_text or not prompt:
        return error_response("Напишите текст и выберите задание.", code="missing_writing_input")

    profile = _get_profile(request.user)
    usage = check_and_consume_ai_usage(request.user, profile, user_text, prompt, topic_id)
    if not usage.allowed:
        status = 402 if usage.code == "premium_required" else 429 if usage.code == "ai_daily_limit_reached" else 400
        return error_response(usage.message, status=status, code=usage.code)
    feedback = get_gpt_service().writing_feedback(user_text, prompt, profile)
    exercise = create_writing_exercise(request.user, user_text, prompt, topic_id, _topic_label(topic_id), feedback)
    return JsonResponse({"exercise": _serialize_writing_exercise(exercise)}, status=201)


@require_POST
def submit_feedback(request):
    data = _json_body(request)
    category = data.get("category", "suggestion").strip()
    message = _clean_feedback_text(data.get("message", ""))
    contact_email = data.get("contactEmail", "").strip().lower()
    page_path = strip_tags(data.get("pagePath", "").strip())[:220]

    if category not in dict(Feedback.CATEGORY_CHOICES):
        return error_response("Некорректная категория обратной связи.", code="invalid_feedback_category")
    if len(message) < 10:
        return error_response("Сообщение слишком короткое.", code="feedback_too_short")
    if len(message) > 2000:
        return error_response("Сообщение слишком длинное.", code="feedback_too_long")
    if contact_email:
        try:
            validate_email(contact_email)
        except ValidationError:
            return error_response("Укажите корректный E-Mail или оставьте поле пустым.", code="invalid_feedback_email")

    feedback = Feedback.objects.create(
        user=request.user if request.user.is_authenticated else None,
        category=category,
        message=message,
        contact_email=contact_email,
        page_path=page_path,
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:260],
        ip_address=_client_ip(request),
    )
    return JsonResponse({"feedback": _serialize_feedback(feedback)}, status=201)


@api_login_required
@require_GET
def billing_status(request):
    profile = _get_profile(request.user)
    subscriptions = Subscription.objects.filter(user=request.user).select_related("plan")[:5]
    return JsonResponse({
        "billing": {
            "hasPremiumAccess": profile.has_premium_access,
            "premiumStatus": profile.premium_status,
            "plans": [_serialize_plan(plan) for plan in Plan.objects.filter(is_active=True)],
            "subscriptions": [_serialize_subscription(item) for item in subscriptions],
            "providers": billing_provider_status(),
        }
    })


@api_login_required
@require_POST
def billing_checkout_placeholder(request):
    data = _json_body(request)
    provider = data.get("provider", "stripe")
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return error_response(
            "Portfolio demo: payments are disabled.", status=501,
            code="portfolio_demo", provider=provider, demo=True,
        )
    plan_code = data.get("planCode", "premium")
    if provider not in ["stripe", "paypal"]:
        return error_response("Unsupported billing provider.", code="unsupported_billing_provider")
    plan = Plan.objects.filter(code=plan_code, is_active=True).first()
    if plan is None:
        return error_response("Unknown billing plan.", status=404, code="unknown_billing_plan")
    providers = billing_provider_status()
    if not providers[provider]["configured"]:
        return error_response(
            "Billing provider is not configured yet.",
            status=501,
            code="billing_provider_not_configured",
            provider=provider,
            plan=_serialize_plan(plan),
        )
    if provider == "stripe":
        try:
            return JsonResponse({"checkout": create_stripe_checkout_session(request.user, plan)}, status=201)
        except BillingProviderError:
            return error_response("Stripe checkout could not be created.", status=502, code="stripe_checkout_failed")
    return JsonResponse({
        "checkout": checkout_preview(provider, plan)
    })


@csrf_exempt
@require_POST
def stripe_webhook(request):
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return error_response("Portfolio demo: billing webhooks are disabled.", status=404, code="portfolio_demo", demo=True)
    try:
        event, processed = process_stripe_webhook(
            request.body,
            request.META.get("HTTP_STRIPE_SIGNATURE", ""),
        )
    except WebhookSignatureError:
        return error_response("Invalid Stripe webhook signature.", status=400, code="invalid_stripe_signature")
    except Exception:
        return error_response("Stripe webhook could not be processed.", status=400, code="stripe_webhook_failed")
    return JsonResponse({"ok": True, "eventId": event.event_id, "processed": processed})


@csrf_exempt
@require_POST
def paypal_webhook(request):
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return error_response("Portfolio demo: billing webhooks are disabled.", status=404, code="portfolio_demo", demo=True)
    try:
        event, processed = process_paypal_webhook(request.body)
    except BillingProviderError:
        return error_response("PayPal webhook is not configured or invalid.", status=501, code="paypal_webhook_not_configured")
    return JsonResponse({"ok": True, "eventId": event.event_id, "processed": processed})


@premium_required
@require_GET
def premium_feature_preview(request):
    return JsonResponse({"premium": {"ok": True, "message": "Premium route is protected server-side."}})


@api_login_required
@require_GET
def realtime_status(request):
    return JsonResponse({"realtime": realtime_feature_status()})


@api_login_required
@require_POST
def adaptive_scene_preview(request):
    data = _json_body(request)
    profile = _get_profile(request.user)
    topic_id = data.get("topicId", profile.preferred_topic or "baeckerei").strip() or "baeckerei"
    level = data.get("level", profile.level).strip() or profile.level
    goal = data.get("goal", profile.main_goal).strip() or profile.main_goal
    scene = get_gpt_service().adaptive_scene(topic_id=topic_id, level=level, goal=goal)
    return JsonResponse({"adaptiveScene": scene})


@api_login_required
@require_GET
def ai_streaming_status(request):
    return JsonResponse({"streaming": get_gpt_service().streaming_status()})


@require_GET
def health_check(request):
    checks = {"database": "ok"}
    status_code = 200
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        checks["database"] = "error"
        status_code = 503

    return JsonResponse({"ok": status_code == 200, "checks": checks}, status=status_code)


@staff_required
@require_GET
def security_admin_summary(request):
    return JsonResponse({
        "security": {
            "csrfMiddleware": "django.middleware.csrf.CsrfViewMiddleware" in settings.MIDDLEWARE,
            "xFrameOptions": settings.X_FRAME_OPTIONS,
            "contentTypeNosniff": settings.SECURE_CONTENT_TYPE_NOSNIFF,
            "uploadMaxSizeMb": settings.SECURE_UPLOAD_MAX_SIZE_MB,
            "uploadAllowedContentTypes": settings.SECURE_UPLOAD_ALLOWED_CONTENT_TYPES,
        }
    })


@api_login_required
@require_http_methods(["PATCH"])
def update_settings(request):
    data = _json_body(request)
    profile = _get_profile(request.user)
    allowed_values = {
        "interfaceLanguage": {"ru", "de", "en"},
        "explanationLanguage": {"ru", "de", "en"},
        "themePreference": {"system", "light", "dark"},
    }
    field_map = {
        "level": "level",
        "mainGoal": "main_goal",
        "preferredTopic": "preferred_topic",
        "saveProgress": "save_progress",
        "interfaceLanguage": "interface_language",
        "explanationLanguage": "explanation_language",
        "themePreference": "theme_preference",
    }
    for api_field, model_field in field_map.items():
        if api_field in data:
            if api_field in allowed_values and data[api_field] not in allowed_values[api_field]:
                return error_response("Некорректное значение настроек.", code="invalid_settings_value")
            setattr(profile, model_field, data[api_field])
    profile.save()
    return JsonResponse({"settings": _serialize_profile(profile)})


def _clean_feedback_text(value):
    return " ".join(strip_tags(value).split())


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}



def _make_email_confirmation_token(user):
    return signing.TimestampSigner(salt="email-confirm").sign(str(user.id))


def _make_password_reset_token(user):
    return signing.TimestampSigner(salt="password-reset").sign(str(user.id))


def _user_from_signed_token(token, salt, max_age):
    if not token:
        return None
    try:
        user_id = signing.TimestampSigner(salt=salt).unsign(token, max_age=max_age)
    except (signing.BadSignature, signing.SignatureExpired):
        return None
    return User.objects.filter(id=user_id, is_active=True).first()


def _token_expires_at():
    return (timezone_now() + timedelta(seconds=settings.AUTH_TOKEN_MAX_AGE)).isoformat()


def timezone_now():
    from django.utils import timezone

    return timezone.now()


def _set_auth_token(response, user):
    token = signing.TimestampSigner(salt="learning-auth").sign(str(user.id))
    response.set_cookie(
        "learning_auth_token",
        token,
        max_age=settings.AUTH_TOKEN_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )


def _topic_label(topic_id):
    if topic_id in TOPICS:
        return TOPICS[topic_id]["label"]
    category = Category.objects.filter(slug=topic_id).first()
    if category:
        return category.title_de
    return topic_id


def _ensure_groups():
    for group_name in ["learner", "mentor", "content_manager"]:
        Group.objects.get_or_create(name=group_name)


def _topic_label_for_quiz(topic_id):
    if topic_id in TOPICS:
        return TOPICS[topic_id]["ru"]
    category = Category.objects.filter(slug=topic_id, is_published=True).first()
    if category and QuizQuestion.objects.filter(topic_id=topic_id, is_active=True).exists():
        return category.title_ru
    return None


def _build_correction(question):
    return get_gpt_service().writing_feedback(question, "Свободная письменная практика", _NullProfile()).correction


def _build_writing_explanation(question, prompt, profile):
    return get_gpt_service().writing_feedback(question, prompt, profile).explanation


def _build_bot_answer(question, profile, correction=None, explanation=None):
    feedback = get_gpt_service().writing_feedback(question, "Свободная письменная практика", profile)
    if correction and explanation:
        return (
            f"Я прочитал ваш ответ для уровня {profile.get_level_display()} и темы «{profile.preferred_topic or 'повседневная жизнь'}». "
            f"Коррекция: {correction} Объяснение: {explanation}"
        )
    return feedback.answer


class _NullProfile:
    preferred_topic = "повседневная жизнь"
    main_goal = ""
    level = "a1"

    def get_level_display(self):
        return "A1"
