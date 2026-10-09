from datetime import timedelta
import json
from pathlib import Path
import tempfile

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import JsonResponse
from django.test import Client, RequestFactory, TestCase, override_settings
from django.utils import timezone

from ..admin import UserProfileAdmin
from ..audit import log_audit_event
from ..management.commands.public_launch_report import build_public_launch_report
from ..management.commands.production_check import build_production_checks
from ..management.commands.validate_ticket_plan import validate_ticket_plan
from ..middleware import APIErrorMiddleware, RequestContextMiddleware, mask_sensitive_context
from ..security import validate_private_upload
from ..models import AuditEvent, Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class SecurityEpicTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_csrf_protects_feedback_post(self):
        csrf_client = Client(enforce_csrf_checks=True)
        response = csrf_client.post(
            "/api/feedback/",
            data={"category": "bug", "message": "Dieser Text ist lang genug."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_xss_payload_is_stripped_from_feedback(self):
        response = self.client.post(
            "/api/feedback/",
            data={"category": "content", "message": "<b>Hallo</b> <script>alert(1)</script> sichere Nachricht"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("<", Feedback.objects.get().message)

    def test_staff_security_summary_requires_staff_user(self):
        user = get_user_model().objects.create_user(username="normal", password="strong-pass-123")
        staff = get_user_model().objects.create_user(username="staff", password="strong-pass-123", is_staff=True)

        self.client.post("/api/auth/login/", data={"username": user.username, "password": "strong-pass-123"}, content_type="application/json")
        denied = self.client.get("/api/security/admin-summary/")
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(denied.json()["code"], "staff_required")

        self.client.post("/api/auth/login/", data={"username": staff.username, "password": "strong-pass-123"}, content_type="application/json")
        allowed = self.client.get("/api/security/admin-summary/")
        self.assertEqual(allowed.status_code, 200)
        self.assertTrue(allowed.json()["security"]["csrfMiddleware"])

    def test_health_check_is_public_and_reports_database(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True, "checks": {"database": "ok"}})

    @override_settings(
        SECURITY_CONTENT_SECURITY_POLICY="default-src 'self'; object-src 'none'",
        SECURITY_CONTENT_SECURITY_POLICY_REPORT_ONLY=False,
        SECURITY_PERMISSIONS_POLICY="camera=(), microphone=(), geolocation=()",
        SECURITY_CROSS_ORIGIN_OPENER_POLICY="same-origin",
    )
    def test_security_headers_are_added_to_api_responses(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response["Content-Security-Policy"], "default-src 'self'; object-src 'none'")
        self.assertEqual(response["Permissions-Policy"], "camera=(), microphone=(), geolocation=()")
        self.assertEqual(response["Cross-Origin-Opener-Policy"], "same-origin")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["Referrer-Policy"], "same-origin")

    @override_settings(REQUEST_LOGGING_ENABLED=True)
    def test_request_logging_adds_request_id_and_safe_metadata(self):
        with self.assertLogs("lessons.request", level="INFO") as logs:
            response = self.client.get("/api/health/?password=secret", HTTP_X_REQUEST_ID="test-request-123")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["X-Request-ID"], "test-request-123")
        log_line = "\n".join(logs.output)
        self.assertIn("request_completed", log_line)
        self.assertIn("request_id=test-request-123", log_line)
        self.assertIn("path=/api/health/", log_line)
        self.assertNotIn("secret", log_line)
        self.assertNotIn("password", log_line)

    def test_api_error_middleware_normalizes_missing_api_route(self):
        response = self.client.get("/api/does-not-exist/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json()["code"], "not_found")
        self.assertEqual(response.json()["error"], "Resource not found.")

    @override_settings(API_ERROR_INCLUDE_DEBUG=False)
    def test_api_error_middleware_hides_unexpected_exception_details(self):
        request = RequestFactory().get("/api/failing/")
        request.request_id = "error-request-1"

        def failing_response(_request):
            raise RuntimeError("database password leaked")

        with self.assertLogs("lessons.request", level="ERROR") as logs:
            response = APIErrorMiddleware(failing_response)(request)

        payload = json.loads(response.content.decode("utf-8"))
        self.assertEqual(response.status_code, 500)
        self.assertEqual(payload["code"], "server_error")
        self.assertEqual(payload["requestId"], "error-request-1")
        self.assertNotIn("debug", payload)
        self.assertNotIn("database password leaked", response.content.decode("utf-8"))
        self.assertIn("api_unhandled_exception", "\n".join(logs.output))

    @override_settings(API_ERROR_INCLUDE_DEBUG=True, API_ERROR_LOGGING_ENABLED=False)
    def test_api_error_middleware_can_include_debug_details(self):
        request = RequestFactory().get("/api/failing/")

        def failing_response(_request):
            raise ValueError("debug detail")

        response = APIErrorMiddleware(failing_response)(request)

        payload = json.loads(response.content.decode("utf-8"))
        self.assertEqual(response.status_code, 500)
        self.assertEqual(payload["debug"]["type"], "ValueError")
        self.assertEqual(payload["debug"]["message"], "debug detail")

    @override_settings(
        MAINTENANCE_MODE=True,
        MAINTENANCE_MESSAGE="Maintenance window.",
        MAINTENANCE_RETRY_AFTER_SECONDS=120,
    )
    def test_maintenance_mode_blocks_api_with_retry_after(self):
        response = self.client.get("/api/topics/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "maintenance_mode")
        self.assertEqual(response.json()["error"], "Maintenance window.")
        self.assertEqual(response.json()["retryAfter"], 120)
        self.assertEqual(response["Retry-After"], "120")
        self.assertEqual(response["Cache-Control"], "no-store")

    @override_settings(MAINTENANCE_MODE=True)
    def test_maintenance_mode_keeps_health_check_available(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)

    @override_settings(MAINTENANCE_MODE=True)
    def test_maintenance_mode_keeps_admin_available(self):
        response = self.client.get("/secure-admin/login/")

        self.assertNotEqual(response.status_code, 503)

    def test_locale_context_defaults_to_russian_and_learning_language_de(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response["Content-Language"], "ru")
        self.assertEqual(response["X-Interface-Language"], "ru")
        self.assertEqual(response["X-Explanation-Language"], "ru")
        self.assertEqual(response["X-Learning-Language"], "de")

    def test_locale_context_uses_browser_language_for_anonymous_user(self):
        response = self.client.get("/api/health/", HTTP_ACCEPT_LANGUAGE="de-DE,de;q=0.8")

        self.assertEqual(response["Content-Language"], "de")
        self.assertEqual(response["X-Interface-Language"], "de")
        self.assertEqual(response["X-Learning-Language"], "de")
        self.assertIn("Accept-Language", response.get("Vary", ""))

    def test_locale_context_prefers_profile_language_over_browser_language(self):
        user = get_user_model().objects.create_user(username="locale-user", password="strong-pass-123")
        UserProfile.objects.create(user=user, interface_language="en", explanation_language="ru")
        self.client.force_login(user)

        response = self.client.get("/api/health/", HTTP_ACCEPT_LANGUAGE="de-DE,de;q=0.8")

        self.assertEqual(response["Content-Language"], "en")
        self.assertEqual(response["X-Interface-Language"], "en")
        self.assertEqual(response["X-Explanation-Language"], "ru")
        self.assertEqual(response["X-Learning-Language"], "de")

    def test_theme_context_defaults_to_system_and_light_without_client_hint(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response["X-Theme-Preference"], "system")
        self.assertEqual(response["X-Resolved-Theme"], "light")

    def test_theme_context_resolves_system_from_client_hint(self):
        response = self.client.get("/api/health/", HTTP_SEC_CH_PREFERS_COLOR_SCHEME="dark")

        self.assertEqual(response["X-Theme-Preference"], "system")
        self.assertEqual(response["X-Resolved-Theme"], "dark")
        self.assertIn("Sec-CH-Prefers-Color-Scheme", response.get("Vary", ""))

    def test_theme_context_prefers_profile_theme(self):
        user = get_user_model().objects.create_user(username="theme-user", password="strong-pass-123")
        UserProfile.objects.create(user=user, theme_preference="dark")
        self.client.force_login(user)

        response = self.client.get("/api/health/", HTTP_X_THEME_PREFERENCE="light")

        self.assertEqual(response["X-Theme-Preference"], "dark")
        self.assertEqual(response["X-Resolved-Theme"], "dark")

    def test_settings_update_persists_theme_preference_and_rejects_invalid_value(self):
        user = get_user_model().objects.create_user(username="theme-settings", password="strong-pass-123")
        UserProfile.objects.create(user=user)
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        saved = self.client.patch(
            "/api/settings/",
            data={"themePreference": "dark"},
            content_type="application/json",
        )
        invalid = self.client.patch(
            "/api/settings/",
            data={"themePreference": "neon"},
            content_type="application/json",
        )

        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["settings"]["themePreference"], "dark")
        self.assertEqual(UserProfile.objects.get(user=user).theme_preference, "dark")
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.json()["code"], "invalid_settings_value")

    def test_request_context_header_is_added_to_api_response(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response["X-Request-Context"], "available")

    def test_request_context_collects_language_theme_user_and_device(self):
        user = get_user_model().objects.create_user(username="context-user", password="strong-pass-123")
        UserProfile.objects.create(user=user, role="mentor")
        request = RequestFactory().get("/api/health/", HTTP_USER_AGENT="Mozilla/5.0 Mobile")
        request.user = user
        request.request_id = "context-request"
        request.interface_language = "ru"
        request.explanation_language = "de"
        request.learning_language = "de"
        request.theme_preference = "dark"
        request.resolved_theme = "dark"

        response = RequestContextMiddleware(lambda current_request: JsonResponse({"ok": True}))(request)

        context = request.app_context
        self.assertEqual(response["X-Request-Context"], "available")
        self.assertEqual(context["request_id"], "context-request")
        self.assertEqual(context["language"]["interface"], "ru")
        self.assertEqual(context["theme"]["resolved"], "dark")
        self.assertEqual(context["user"]["role"], "mentor")
        self.assertTrue(context["device"]["mobile"])

    def test_request_context_handles_anonymous_desktop_user(self):
        request = RequestFactory().get("/api/health/", HTTP_USER_AGENT="Desktop Browser")
        request.user = AnonymousUser()

        RequestContextMiddleware(lambda current_request: JsonResponse({"ok": True}))(request)

        self.assertFalse(request.app_context["user"]["authenticated"])
        self.assertEqual(request.app_context["user"]["role"], "anonymous")
        self.assertEqual(request.app_context["device"]["kind"], "desktop")

    def test_sensitive_context_values_are_masked_before_logging(self):
        context = mask_sensitive_context(
            {
                "username": "olga",
                "password": "plain",
                "nested": {"csrfToken": "csrf-value", "topic": "Baeckerei"},
                "authorization": "Bearer token",
            }
        )

        self.assertEqual(context["username"], "olga")
        self.assertEqual(context["password"], "[masked]")
        self.assertEqual(context["nested"]["csrfToken"], "[masked]")
        self.assertEqual(context["nested"]["topic"], "Baeckerei")
        self.assertEqual(context["authorization"], "[masked]")

    def test_audit_event_masks_sensitive_metadata(self):
        actor = get_user_model().objects.create_user(username="auditor", password="strong-pass-123")
        event = log_audit_event(
            "permission_denied",
            actor=actor,
            target_type="UserProfile",
            target_id="42",
            metadata={"token": "secret-token", "field": "role"},
        )

        self.assertEqual(event.actor, actor)
        self.assertEqual(event.metadata["token"], "[masked]")
        self.assertEqual(event.metadata["field"], "role")

    def test_admin_role_change_creates_audit_event(self):
        actor = get_user_model().objects.create_user(username="staff-auditor", password="strong-pass-123", is_staff=True)
        user = get_user_model().objects.create_user(username="role-target", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user, role="learner")
        request = RequestFactory().post("/secure-admin/lessons/userprofile/")
        request.user = actor
        request.request_id = "audit-request-1"
        form = type("AuditForm", (), {"changed_data": ["role"]})()
        admin_view = UserProfileAdmin(UserProfile, admin.site)

        profile.role = "premium"
        admin_view.save_model(request, profile, form, change=True)

        event = AuditEvent.objects.get(action="role_changed")
        self.assertEqual(event.actor, actor)
        self.assertEqual(event.target_type, "UserProfile")
        self.assertEqual(event.target_id, str(profile.id))
        self.assertEqual(event.request_id, "audit-request-1")
        self.assertEqual(event.metadata["changed_fields"], ["role"])

    def test_login_rate_limit_blocks_repeated_failures(self):
        for _index in range(5):
            response = self.client.post(
                "/api/auth/login/",
                data={"username": "missing", "password": "wrong"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)

        blocked = self.client.post(
            "/api/auth/login/",
            data={"username": "missing", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked["X-RateLimit-Remaining"], "0")

    @override_settings(
        RATE_LIMIT_POLICIES={
            "login": {"path": "/api/auth/login/", "methods": ["POST"], "limit": 50, "window_seconds": 900},
            "feedback": {"path": "/api/feedback/", "methods": ["POST"], "limit": 50, "window_seconds": 600},
            "quiz_attempt": {"path": "/api/quiz-attempts/", "methods": ["POST"], "limit": 1, "window_seconds": 600},
            "api_write": {"path_prefix": "/api/", "methods": ["POST", "PUT", "PATCH", "DELETE"], "limit": 50, "window_seconds": 60},
        }
    )
    def test_rate_limit_middleware_blocks_quiz_spam(self):
        first = self.client.post(
            "/api/quiz-attempts/",
            data={"topicId": "baeckerei", "score": 1, "total": 1},
            content_type="application/json",
        )
        blocked = self.client.post(
            "/api/quiz-attempts/",
            data={"topicId": "baeckerei", "score": 1, "total": 1},
            content_type="application/json",
        )

        self.assertIn(first.status_code, [401, 403])
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.json()["code"], "rate_limited")
        self.assertEqual(blocked["Retry-After"], "600")
        self.assertEqual(blocked["X-RateLimit-Limit"], "1")

    def test_upload_validation_rejects_unsafe_type_and_large_file(self):
        unsafe = SimpleUploadedFile("payload.html", b"<script>alert(1)</script>", content_type="text/html")
        is_valid, message = validate_private_upload(unsafe)
        self.assertFalse(is_valid)
        self.assertIn("Unsupported", message)

        oversized = SimpleUploadedFile("large.pdf", b"0" * (6 * 1024 * 1024), content_type="application/pdf")
        is_valid, message = validate_private_upload(oversized)
        self.assertFalse(is_valid)
        self.assertIn("too large", message)

    def test_upload_validation_middleware_rejects_unsafe_multipart_type(self):
        upload = SimpleUploadedFile("payload.html", b"<script>alert(1)</script>", content_type="text/html")

        response = self.client.post("/api/does-not-exist/", data={"file": upload})

        self.assertEqual(response.status_code, 415)
        self.assertEqual(response.json()["code"], "unsupported_upload_type")

    def test_upload_validation_middleware_rejects_large_multipart_upload(self):
        upload = SimpleUploadedFile("large.pdf", b"0" * (6 * 1024 * 1024), content_type="application/pdf")

        response = self.client.post("/api/does-not-exist/", data={"file": upload})

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["code"], "upload_too_large")

    def test_upload_validation_middleware_allows_safe_multipart_type(self):
        upload = SimpleUploadedFile("safe.pdf", b"%PDF-1.4", content_type="application/pdf")

        response = self.client.post("/api/does-not-exist/", data={"file": upload})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "not_found")

    def test_orm_lookup_treats_sql_injection_payload_as_plain_text(self):
        Category.objects.create(slug="safe-test", title_de="Sicher", title_ru="Безопасно")
        payload = "safe-test' OR '1'='1"

        response = self.client.get(f"/api/topics/{payload}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Category.objects.count(), Category.objects.all().count())

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        SESSION_COOKIE_SECURE=False,
        CSRF_COOKIE_SECURE=False,
        SECURE_SSL_REDIRECT=False,
    )
    def test_production_check_flags_local_debug_settings(self):
        checks = build_production_checks()
        codes = {item["code"]: item["level"] for item in checks}

        self.assertEqual(codes["debug_enabled"], "error")
        self.assertEqual(codes["email_backend"], "error")

    @override_settings(
        SECURITY_CONTENT_SECURITY_POLICY="",
        SECURITY_PERMISSIONS_POLICY="",
        SECURITY_CROSS_ORIGIN_OPENER_POLICY="",
    )
    def test_production_check_requires_browser_security_headers(self):
        checks = build_production_checks()
        codes = {item["code"]: item["level"] for item in checks}

        self.assertEqual(codes["security_headers"], "error")

    @override_settings(
        DEBUG=False,
        ALLOWED_HOSTS=["deutschlive.example.com"],
        CSRF_TRUSTED_ORIGINS=["https://deutschlive.example.com"],
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        SECURE_SSL_REDIRECT=True,
        SECURE_HSTS_SECONDS=31536000,
        SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
        DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "deutschlive"}},
        DATABASE_BACKUP_STRATEGY="managed-postgres-snapshot",
        DATABASE_BACKUP_RETENTION_DAYS=14,
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST="smtp.example.com",
        DEFAULT_FROM_EMAIL="noreply@portfolio.example.invalid",
        DEUTSCHLIVE_PUBLIC_URL="https://deutschlive.example.com",
        SECURE_CONTENT_TYPE_NOSNIFF=True,
        X_FRAME_OPTIONS="DENY",
        REDIS_URL="redis://redis.example.com:6379/0",
        CACHES={"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": "redis://redis.example.com:6379/0"}},
        CHANNEL_LAYERS={"default": {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": ["redis://redis.example.com:6379/0"]}}},
    )
    def test_production_check_accepts_hardened_settings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "index.html").write_text("<div id=\"root\"></div>", encoding="utf-8")
            with override_settings(WHITENOISE_ROOT=tmpdir):
                checks = build_production_checks()
        errors = [item for item in checks if item["level"] == "error"]
        codes = {item["code"]: item["level"] for item in checks}

        self.assertEqual(errors, [])
        self.assertEqual(codes["frontend_dist"], "ok")
        self.assertEqual(codes["proxy_ssl_header"], "ok")
        self.assertEqual(codes["database_backup"], "ok")
        self.assertEqual(codes["redis"], "ok")
        self.assertEqual(codes["monitoring_logging"], "ok")
        self.assertEqual(codes["monitoring_provider"], "ok")

    @override_settings(
        DEBUG=False,
        ALLOWED_HOSTS=["deutschlive.example.com"],
        CSRF_TRUSTED_ORIGINS=["https://deutschlive.example.com"],
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        SECURE_SSL_REDIRECT=True,
        SECURE_HSTS_SECONDS=31536000,
        SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
        DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "deutschlive"}},
        DATABASE_BACKUP_STRATEGY="managed-postgres-snapshot",
        DATABASE_BACKUP_RETENTION_DAYS=14,
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST="smtp.example.com",
        DEFAULT_FROM_EMAIL="noreply@portfolio.example.invalid",
        DEUTSCHLIVE_PUBLIC_URL="https://deutschlive.example.com",
        SECURE_CONTENT_TYPE_NOSNIFF=True,
        X_FRAME_OPTIONS="DENY",
        REDIS_URL="redis://redis.example.com:6379/0",
        CACHES={"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": "redis://redis.example.com:6379/0"}},
        CHANNEL_LAYERS={"default": {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": ["redis://redis.example.com:6379/0"]}}},
    )
    def test_public_launch_report_separates_manual_launch_checks(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "index.html").write_text("<div id=\"root\"></div>", encoding="utf-8")
            with override_settings(WHITENOISE_ROOT=tmpdir):
                report = build_public_launch_report(include_dns=False)

        self.assertTrue(report["ok"])
        self.assertFalse(report["launchReady"])
        self.assertEqual(report["errorCount"], 0)
        self.assertGreater(report["manualCount"], 0)
        sections = {section["name"]: section for section in report["sections"]}
        self.assertIn("production", sections)
        self.assertIn("mailDns", sections)
        self.assertIn("manualProduction", sections)

    def test_ticket_plan_validator_accepts_current_plan(self):
        plan_path = Path(__file__).resolve().parents[3] / "ticket_plan.txt"

        report = validate_ticket_plan(plan_path)

        self.assertTrue(report["ok"], report["issues"])
        self.assertGreater(report["ticketCount"], 190)
