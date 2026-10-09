import json
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db.models import Sum
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect
from django.utils.html import strip_tags
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .ai_service import get_gpt_service
from .data import PAGE_CONTENT, TOPICS
from .learning_content import (
    category_detail_from_db,
    category_summaries_from_db,
    pronunciation_for_topic,
    scene_cards_from_db,
    scene_exercises,
)
from .models import BotExchange, Category, ChatHistory, Feedback, Plan, QuizAttempt, QuizQuestion, QuizResult, Scene, Subscription, UserProfile, UserProgress, UserVocabulary, WritingExercise
from .realtime import realtime_feature_status, send_user_notification
from .security import log_security_event, rate_limit, staff_required


def api_login_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not _has_valid_auth_token(request):
            log_security_event("api_auth_required", path=request.path, user_id=getattr(request.user, "id", None))
            logout(request)
            return JsonResponse({"error": "Authentication required."}, status=401)
        if not _can_use_learning_account(request.user):
            log_security_event("email_verification_required", path=request.path, user_id=request.user.id)
            logout(request)
            return JsonResponse({"error": "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."}, status=403)
        return view_func(request, *args, **kwargs)

    return wrapper


def premium_required(view_func):
    @api_login_required
    def wrapper(request, *args, **kwargs):
        if not _get_profile(request.user).has_premium_access:
            log_security_event("premium_route_denied", path=request.path, user_id=request.user.id)
            return JsonResponse({"error": "Premium access required."}, status=402)
        return view_func(request, *args, **kwargs)

    return wrapper


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
        return JsonResponse({"error": "Тема не найдена."}, status=404)

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
    if not _can_use_learning_account(request.user):
        logout(request)
        return JsonResponse({"user": None})

    profile = _get_profile(request.user)
    if settings.DEBUG and not profile.email_verified:
        profile.email_verified = True
        profile.save(update_fields=["email_verified", "updated_at"])
    return JsonResponse({"user": _serialize_user(request.user, profile), "authTokenExpiresAt": _token_expires_at()})


@require_POST
def register(request):
    data = _json_body(request)
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return JsonResponse({"error": "Укажите имя пользователя, E-Mail и пароль."}, status=400)
    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as error:
        return JsonResponse({"error": " ".join(error.messages)}, status=400)
    if User.objects.filter(username__iexact=username).exists() or User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "Регистрацию нельзя завершить с этими данными."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    _ensure_groups()
    learner_group = Group.objects.get(name="learner")
    user.groups.add(learner_group)
    profile = _get_profile(user)
    if settings.DEBUG and not profile.email_verified:
        profile.email_verified = True
        profile.save(update_fields=["email_verified", "updated_at"])
    if not _send_email_confirmation(user):
        user.delete()
        return JsonResponse({"error": "Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen."}, status=503)

    payload = {
        "ok": True,
        "message": "Registrierung erfolgreich.",
        "emailVerificationRequired": not profile.email_verified,
    }
    if settings.DEBUG and not profile.email_verified:
        payload["emailVerificationToken"] = _make_email_confirmation_token(user)
    response = JsonResponse(payload, status=201)
    return response


@require_POST
def login_view(request):
    data = _json_body(request)
    username = data.get("username", "").strip()
    password = data.get("password", "")
    rate_key = _login_rate_key(request, username)
    if not rate_limit(rate_key, limit=5, timeout_seconds=15 * 60):
        return JsonResponse({"error": "Слишком много попыток входа. Попробуйте позже."}, status=429)

    user = authenticate(request, username=username, password=password)

    if user is None:
        log_security_event("login_failed", username=username, ip=_client_ip(request))
        return JsonResponse({"error": "Неверное имя пользователя или пароль."}, status=400)
    if not user.is_active:
        return JsonResponse({"error": "Этот аккаунт отключён."}, status=403)
    if not _can_use_learning_account(user):
        return JsonResponse({"error": "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."}, status=403)

    login(request, user)
    request.session.set_expiry(settings.AUTH_TOKEN_MAX_AGE)
    cache.delete(rate_key)
    profile = _get_profile(user)
    if settings.DEBUG and not profile.email_verified:
        profile.email_verified = True
        profile.save(update_fields=["email_verified", "updated_at"])
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
        return JsonResponse({"error": "Укажите имя пользователя или E-Mail."}, status=400)

    user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
    payload = {
        "ok": True,
        "message": "Если аккаунт найден, мы подготовим ссылку для сброса пароля.",
    }
    if settings.DEBUG and user:
        payload["resetToken"] = _make_password_reset_token(user)
    return JsonResponse(payload)


@require_POST
def confirm_password_reset(request):
    data = _json_body(request)
    token = data.get("token", "")
    password = data.get("password", "")
    user = _user_from_signed_token(token, "password-reset", max_age=60 * 60)
    if user is None:
        return JsonResponse({"error": "Ссылка недействительна или устарела."}, status=400)
    try:
        validate_password(password, user)
    except ValidationError as error:
        return JsonResponse({"error": " ".join(error.messages)}, status=400)
    user.set_password(password)
    user.save(update_fields=["password"])
    return JsonResponse({"ok": True, "message": "Пароль обновлён."})


@require_http_methods(["GET", "POST"])
def confirm_email(request):
    token = request.GET.get("token", "") if request.method == "GET" else _json_body(request).get("token", "")
    user = _user_from_signed_token(token, "email-confirm", max_age=60 * 60 * 24)
    if user is None:
        if request.method == "GET":
            return redirect("/deutschlive/account?emailConfirmed=invalid")
        return JsonResponse({"error": "Ссылка подтверждения недействительна или устарела."}, status=400)
    profile = _get_profile(user)
    profile.email_verified = True
    profile.save(update_fields=["email_verified", "updated_at"])
    if request.method == "GET":
        return redirect("/deutschlive/account?emailConfirmed=1")
    return JsonResponse({"ok": True, "message": "E-Mail подтверждён."})


@api_login_required
@require_POST
def resend_email_confirmation(request):
    payload = {"ok": True, "message": "Если E-Mail ещё не подтверждён, ссылка подготовлена."}
    profile = _get_profile(request.user)
    if settings.DEBUG and not profile.email_verified:
        payload["emailVerificationToken"] = _make_email_confirmation_token(request.user)
    return JsonResponse(payload)


@api_login_required
@require_POST
def delete_account(request):
    data = _json_body(request)
    password = data.get("password", "")
    if not check_password(password, request.user.password):
        return JsonResponse({"error": "Пароль указан неверно."}, status=400)

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
        return JsonResponse({"error": "Текущий пароль указан неверно."}, status=400)
    try:
        validate_password(new_password, request.user)
    except ValidationError as error:
        return JsonResponse({"error": " ".join(error.messages)}, status=400)
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
    attempts = QuizResult.objects.filter(user=request.user)
    total_score = attempts.aggregate(total=Sum("score"))["total"] or 0
    total_questions = attempts.aggregate(total=Sum("total"))["total"] or 0
    progress = UserProgress.objects.filter(user=request.user)
    vocabulary = UserVocabulary.objects.filter(user=request.user)

    by_topic = {}
    for attempt in attempts:
        item = by_topic.setdefault(
            attempt.topic_id,
            {"topicId": attempt.topic_id, "topicLabel": attempt.topic_label, "score": 0, "total": 0, "attempts": 0},
        )
        item["score"] += attempt.score
        item["total"] += attempt.total
        item["attempts"] += 1

    recent_attempts = [
        {
            "id": attempt.id,
            "topicId": attempt.topic_id,
            "topicLabel": attempt.topic_label,
            "score": attempt.score,
            "total": attempt.total,
            "percentage": attempt.percentage,
            "durationSeconds": attempt.duration_seconds,
            "difficulty": attempt.difficulty,
            "createdAt": attempt.created_at.isoformat(),
        }
        for attempt in attempts[:8]
    ]
    attempts_with_time = [attempt for attempt in attempts if attempt.duration_seconds > 0]
    average_duration = (
        round(sum(attempt.duration_seconds for attempt in attempts_with_time) / len(attempts_with_time))
        if attempts_with_time
        else 0
    )

    chats = [
        _serialize_writing_exercise(item)
        for item in WritingExercise.objects.filter(user=request.user)[:5]
    ]

    return JsonResponse(
        {
            "summary": {
                "totalScore": total_score,
                "totalQuestions": total_questions,
                "attemptCount": attempts.count(),
                "average": round((total_score / total_questions) * 100) if total_questions else 0,
                "averageDurationSeconds": average_duration,
            },
            "byTopic": list(by_topic.values()),
            "recentAttempts": recent_attempts,
            "botHistory": chats,
            "progress": {
                "completedScenes": progress.filter(status="completed").count(),
                "startedScenes": progress.count(),
                "totalScenes": Scene.objects.filter(is_published=True).count(),
            },
            "learningPlan": _dashboard_learning_plan(request.user, by_topic),
            "premiumHints": _premium_hints_for_user(request.user),
            "vocabulary": [
                {"id": item.id, "wordDe": item.word_de, "translationRu": item.translation_ru}
                for item in vocabulary[:8]
            ],
            "recommendations": _recommendations_for_user(request.user, total_score, total_questions),
            "goals": {"dailyMinutes": 10, "dailyScenes": 1},
            "badges": list(request.user.achievements.values("code", "title")),
            "settings": _serialize_profile(_get_profile(request.user)),
        }
    )


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
        return JsonResponse({"error": "Некорректный результат викторины."}, status=400)

    attempt = QuizResult.objects.create(
        user=request.user,
        topic_id=topic_id,
        topic_label=topic_label,
        score=score,
        total=total,
        duration_seconds=duration_seconds,
        difficulty=difficulty,
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
        return JsonResponse({"error": "Некорректные данные прогресса."}, status=400)

    progress, _created = UserProgress.objects.update_or_create(
        user=request.user,
        topic_id=topic_id,
        defaults={"status": status, "completed_exercises": int(data.get("completedExercises", 0))},
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
        return JsonResponse({"error": "Укажите слово и перевод."}, status=400)

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
        return JsonResponse({"error": "Напишите вопрос или ответ."}, status=400)

    profile = _get_profile(request.user)
    prompt = data.get("prompt", "Свободная письменная практика").strip() or "Свободная письменная практика"
    topic_id = data.get("topicId", profile.preferred_topic or "baeckerei").strip() or "baeckerei"
    topic_label = _topic_label(topic_id)
    feedback = get_gpt_service().writing_feedback(question, prompt, profile)
    correction = feedback.correction
    explanation = feedback.explanation
    answer = feedback.answer
    exchange = BotExchange.objects.create(user=request.user, question=question, answer=answer)
    ChatHistory.objects.create(
        user=request.user,
        mode="writing",
        user_message=question,
        bot_response=answer,
        correction=correction,
    )
    exercise = WritingExercise.objects.create(
        user=request.user,
        topic_id=topic_id,
        topic_label=topic_label,
        prompt=prompt,
        user_text=question,
        correction=correction,
        explanation=explanation,
    )
    send_user_notification(
        request.user.id,
        "bot_reply",
        {"exerciseId": exercise.id, "message": "Новая KI-коррекция готова."},
    )
    return JsonResponse({
        "exchange": {"id": exchange.id, "question": question, "answer": answer},
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
        return JsonResponse({"error": "Напишите текст и выберите задание."}, status=400)

    feedback = get_gpt_service().writing_feedback(user_text, prompt, _get_profile(request.user))
    correction = feedback.correction
    explanation = feedback.explanation
    exercise = WritingExercise.objects.create(
        user=request.user,
        topic_id=topic_id,
        topic_label=_topic_label(topic_id),
        prompt=prompt,
        user_text=user_text,
        correction=correction,
        explanation=explanation,
    )
    ChatHistory.objects.create(
        user=request.user,
        mode="writing",
        user_message=user_text,
        bot_response=explanation,
        correction=correction,
    )
    send_user_notification(
        request.user.id,
        "writing_correction",
        {"exerciseId": exercise.id, "message": "Новая Korrektur ist bereit."},
    )
    return JsonResponse({"exercise": _serialize_writing_exercise(exercise)}, status=201)


@require_POST
def submit_feedback(request):
    data = _json_body(request)
    category = data.get("category", "suggestion").strip()
    message = _clean_feedback_text(data.get("message", ""))
    contact_email = data.get("contactEmail", "").strip().lower()
    page_path = strip_tags(data.get("pagePath", "").strip())[:220]

    if category not in dict(Feedback.CATEGORY_CHOICES):
        return JsonResponse({"error": "Некорректная категория обратной связи."}, status=400)
    if len(message) < 10:
        return JsonResponse({"error": "Сообщение слишком короткое."}, status=400)
    if len(message) > 2000:
        return JsonResponse({"error": "Сообщение слишком длинное."}, status=400)
    if contact_email:
        try:
            validate_email(contact_email)
        except ValidationError:
            return JsonResponse({"error": "Укажите корректный E-Mail или оставьте поле пустым."}, status=400)

    rate_key = _feedback_rate_key(request)
    if not rate_limit(rate_key, limit=3, timeout_seconds=10 * 60):
        return JsonResponse({"error": "Слишком много сообщений. Попробуйте позже."}, status=429)

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
            "providers": _billing_provider_status(),
        }
    })


@api_login_required
@require_POST
def billing_checkout_placeholder(request):
    data = _json_body(request)
    provider = data.get("provider", "stripe")
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return JsonResponse({
            "error": "Portfolio demo: payments are disabled.",
            "provider": provider, "code": "portfolio_demo", "demo": True,
        }, status=501)
    plan_code = data.get("planCode", "premium")
    if provider not in ["stripe", "paypal"]:
        return JsonResponse({"error": "Unsupported billing provider."}, status=400)
    plan = Plan.objects.filter(code=plan_code, is_active=True).first()
    if plan is None:
        return JsonResponse({"error": "Unknown billing plan."}, status=404)
    providers = _billing_provider_status()
    if not providers[provider]["configured"]:
        return JsonResponse({
            "error": "Billing provider is not configured yet.",
            "provider": provider,
            "plan": _serialize_plan(plan),
        }, status=501)
    return JsonResponse({
        "checkout": {
            "provider": provider,
            "plan": _serialize_plan(plan),
            "successUrl": settings.BILLING_SUCCESS_URL,
            "cancelUrl": settings.BILLING_CANCEL_URL,
        }
    })


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
    field_map = {
        "level": "level",
        "mainGoal": "main_goal",
        "preferredTopic": "preferred_topic",
        "saveProgress": "save_progress",
        "interfaceLanguage": "interface_language",
        "explanationLanguage": "explanation_language",
    }
    for api_field, model_field in field_map.items():
        if api_field in data:
            setattr(profile, model_field, data[api_field])
    profile.save()
    return JsonResponse({"settings": _serialize_profile(profile)})


def _serialize_plan(plan):
    return {
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "priceCents": plan.price_cents,
        "currency": plan.currency,
        "interval": plan.interval,
        "isPremium": plan.is_premium,
    }


def _serialize_subscription(subscription):
    return {
        "id": subscription.id,
        "planCode": subscription.plan.code,
        "planName": subscription.plan.name,
        "status": subscription.status,
        "provider": subscription.provider,
        "currentPeriodEnd": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "grantsPremiumAccess": subscription.grants_premium_access,
    }


def _billing_provider_status():
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return {
            provider: {"configured": False, "webhookConfigured": False, "demo": True}
            for provider in ("stripe", "paypal")
        }
    return {
        "stripe": {
            "configured": bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PRICE_PREMIUM_MONTHLY),
            "webhookConfigured": bool(settings.STRIPE_WEBHOOK_SECRET),
        },
        "paypal": {
            "configured": bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET and settings.PAYPAL_PLAN_PREMIUM_MONTHLY),
            "webhookConfigured": bool(settings.PAYPAL_WEBHOOK_ID),
        },
    }


def _serialize_feedback(feedback):
    return {
        "id": feedback.id,
        "category": feedback.category,
        "status": feedback.status,
        "message": feedback.message,
        "createdAt": feedback.created_at.isoformat(),
    }


def _clean_feedback_text(value):
    return " ".join(strip_tags(value).split())


def _feedback_rate_key(request):
    user_part = f"user:{request.user.id}" if request.user.is_authenticated else f"ip:{_client_ip(request)}"
    return f"feedback:{user_part}"


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


def _has_valid_auth_token(request):
    token = request.COOKIES.get("learning_auth_token")
    if not token:
        return False
    try:
        user_id = signing.TimestampSigner(salt="learning-auth").unsign(
            token,
            max_age=settings.AUTH_TOKEN_MAX_AGE,
        )
    except (signing.BadSignature, signing.SignatureExpired):
        return False
    return str(request.user.id) == str(user_id)


def _can_use_learning_account(user):
    if user.is_staff or user.is_superuser:
        return True
    if settings.DEBUG:
        return True
    if not user.email:
        return True
    profile = _get_profile(user)
    return profile.email_verified


def _send_email_confirmation(user):
    if settings.DEBUG:
        return True
    if not getattr(settings, "EMAIL_HOST", "") or not user.email:
        return False

    token = _make_email_confirmation_token(user)
    confirmation_url = f"{settings.SITE_URL.rstrip('/')}/deutschlive/api/auth/email/confirm/?token={quote(token)}"
    subject = "E-Mail-Adresse für DeutschLive bestätigen"
    message = (
        "Hallo,\n\n"
        "bitte bestätigen Sie Ihre E-Mail-Adresse für DeutschLive.\n\n"
        f"Bestätigungslink:\n{confirmation_url}\n\n"
        "Der Link ist 24 Stunden gültig.\n\n"
        "Falls Sie diese Registrierung nicht durchgeführt haben, ignorieren Sie diese E-Mail bitte.\n\n"
        "Beirit Digital"
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception as exc:
        log_security_event("email_confirmation_send_failed", user_id=user.id, error=str(exc))
        return False
    return True


def _get_profile(user):
    profile, _created = UserProfile.objects.get_or_create(user=user)
    return profile


def _serialize_writing_exercise(item):
    return {
        "id": item.id,
        "topicId": item.topic_id,
        "topicLabel": item.topic_label,
        "prompt": item.prompt,
        "userText": item.user_text,
        "correction": item.correction,
        "explanation": item.explanation,
        "status": item.status,
        "createdAt": item.created_at.isoformat(),
    }


def _topic_label(topic_id):
    if topic_id in TOPICS:
        return TOPICS[topic_id]["label"]
    category = Category.objects.filter(slug=topic_id).first()
    if category:
        return category.title_de
    return topic_id


def _serialize_profile(profile):
    return {
        "role": profile.role,
        "premiumStatus": profile.premium_status,
        "hasPremiumAccess": profile.has_premium_access,
        "emailVerified": profile.email_verified,
        "interfaceLanguage": profile.interface_language,
        "explanationLanguage": profile.explanation_language,
        "level": profile.level,
        "mainGoal": profile.main_goal,
        "preferredTopic": profile.preferred_topic,
        "saveProgress": profile.save_progress,
    }


def _serialize_user(user, profile):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "isStaff": user.is_staff,
        "roles": list(user.groups.values_list("name", flat=True)),
        "settings": _serialize_profile(profile),
    }


def _ensure_groups():
    for group_name in ["learner", "mentor", "content_manager"]:
        Group.objects.get_or_create(name=group_name)


def _login_rate_key(request, username):
    ip = request.META.get("REMOTE_ADDR", "unknown")
    return f"login-attempts:{ip}:{username.lower()}"


def _topic_label_for_quiz(topic_id):
    if topic_id in TOPICS:
        return TOPICS[topic_id]["ru"]
    category = Category.objects.filter(slug=topic_id, is_published=True).first()
    if category and QuizQuestion.objects.filter(topic_id=topic_id, is_active=True).exists():
        return category.title_ru
    return None


def _dashboard_learning_plan(user, by_topic):
    profile = _get_profile(user)
    completed_topics = set(
        UserProgress.objects.filter(user=user, status="completed").values_list("topic_id", flat=True)
    )
    scene_query = Scene.objects.filter(is_published=True)
    if not profile.has_premium_access:
        scene_query = scene_query.filter(is_premium=False)
    next_scene = scene_query.exclude(topic_id__in=completed_topics).order_by("category__order", "topic_id", "title").first()
    if next_scene is None:
        next_scene = scene_query.order_by("category__order", "topic_id", "title").first()

    review_topics = []
    for item in by_topic.values():
        percentage = round((item["score"] / item["total"]) * 100) if item["total"] else 0
        if percentage < 75:
            review_topics.append({
                "topicId": item["topicId"],
                "topicLabel": item["topicLabel"],
                "percentage": percentage,
                "reason": "Повторите тему: результат ниже 75%.",
            })
    review_topics = sorted(review_topics, key=lambda item: item["percentage"])[:3]

    return {
        "nextScene": _serialize_dashboard_scene(next_scene) if next_scene else None,
        "reviewTopics": review_topics,
    }


def _serialize_dashboard_scene(scene):
    return {
        "id": scene.slug,
        "topicId": scene.topic_id,
        "title": scene.title,
        "level": scene.level.upper(),
        "isPremium": scene.is_premium,
    }


def _premium_hints_for_user(user):
    profile = _get_profile(user)
    if profile.has_premium_access:
        return []
    scenes = Scene.objects.filter(is_published=True, is_premium=True).order_by("category__order", "topic_id", "title")[:3]
    return [
        {
            "id": scene.slug,
            "title": scene.title,
            "topicId": scene.topic_id,
            "reason": "Premium-Szene: später mit aktivem Premium-Zugang verfügbar.",
        }
        for scene in scenes
    ]


def _recommendations_for_user(user, total_score, total_questions):
    profile = _get_profile(user)
    if total_questions == 0:
        return ["Начните с короткой сцены и сохраните первый результат викторины."]
    average = total_score / total_questions
    if average < 0.7:
        return [f"Повторите тему «{profile.preferred_topic or 'Пекарня'}» в режиме сцен, затем попробуйте викторину ещё раз."]
    return ["Отлично. Теперь попробуйте письменную практику и потренируйте более длинные ответы."]


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
