import logging
import re
import time
import uuid


request_logger = logging.getLogger("lessons.request")
security_logger = logging.getLogger("lessons.security")

SENSITIVE_KEY_PARTS = ("password", "token", "secret", "key", "csrf", "cookie", "authorization")
REQUEST_ID_PATTERN = re.compile(r"[^a-zA-Z0-9._-]")


def mask_sensitive_context(context):
    masked = {}
    for key, value in context.items():
        normalized = str(key).lower()
        if any(part in normalized for part in SENSITIVE_KEY_PARTS):
            masked[key] = "[masked]"
        elif isinstance(value, dict):
            masked[key] = mask_sensitive_context(value)
        else:
            masked[key] = value
    return masked


class SecurityHeadersMiddleware:
    """Add browser security headers that are not covered by Django defaults."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return self._apply_headers(response)

    def _apply_headers(self, response):
        from django.conf import settings

        csp = getattr(settings, "SECURITY_CONTENT_SECURITY_POLICY", "")
        csp_report_only = getattr(settings, "SECURITY_CONTENT_SECURITY_POLICY_REPORT_ONLY", False)
        if csp:
            header = "Content-Security-Policy-Report-Only" if csp_report_only else "Content-Security-Policy"
            response.setdefault(header, csp)

        permissions_policy = getattr(settings, "SECURITY_PERMISSIONS_POLICY", "")
        if permissions_policy:
            response.setdefault("Permissions-Policy", permissions_policy)

        opener_policy = getattr(settings, "SECURITY_CROSS_ORIGIN_OPENER_POLICY", "")
        if opener_policy:
            response.setdefault("Cross-Origin-Opener-Policy", opener_policy)

        return response


class RequestLoggingMiddleware:
    """Attach request IDs and log safe request metadata for API observability."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = self._request_id(request)
        request.request_id = request_id
        started_at = time.perf_counter()

        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = self._duration_ms(started_at)
            request_logger.exception(
                "request_failed request_id=%s method=%s path=%s duration_ms=%s user_id=%s authenticated=%s",
                request_id,
                request.method,
                request.path,
                duration_ms,
                self._user_id(request),
                self._is_authenticated(request),
            )
            raise

        duration_ms = self._duration_ms(started_at)
        response["X-Request-ID"] = request_id
        if self._should_log(request):
            request_logger.info(
                "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%s user_id=%s authenticated=%s",
                request_id,
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                self._user_id(request),
                self._is_authenticated(request),
            )
        return response

    def _request_id(self, request):
        incoming = request.META.get("HTTP_X_REQUEST_ID", "")
        cleaned = REQUEST_ID_PATTERN.sub("", incoming)[:80]
        return cleaned or uuid.uuid4().hex

    def _duration_ms(self, started_at):
        return round((time.perf_counter() - started_at) * 1000, 2)

    def _is_authenticated(self, request):
        user = getattr(request, "user", None)
        return bool(getattr(user, "is_authenticated", False))

    def _user_id(self, request):
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return "anonymous"
        return getattr(user, "id", "unknown")

    def _should_log(self, request):
        from django.conf import settings

        if not getattr(settings, "REQUEST_LOGGING_ENABLED", True):
            return False
        return request.path.startswith("/api/")


class APIErrorMiddleware:
    """Normalize API errors as JSON without leaking internal details in production."""

    status_codes = {
        400: ("bad_request", "Bad request."),
        403: ("permission_denied", "Permission denied."),
        404: ("not_found", "Resource not found."),
        405: ("method_not_allowed", "Method not allowed."),
        500: ("server_error", "Unexpected server error."),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not self._is_api_request(request):
            return self.get_response(request)

        try:
            response = self.get_response(request)
        except Exception as exc:
            return self._exception_response(request, exc)

        if response.status_code >= 400 and not self._is_json_response(response):
            return self._status_response(request, response.status_code)
        return response

    def _is_api_request(self, request):
        return request.path.startswith("/api/")

    def _is_json_response(self, response):
        content_type = response.get("Content-Type", "")
        return content_type.startswith("application/json")

    def _exception_response(self, request, exc):
        from django.conf import settings
        from django.core.exceptions import PermissionDenied, SuspiciousOperation
        from django.http import Http404

        if isinstance(exc, Http404):
            return self._status_response(request, 404)
        if isinstance(exc, PermissionDenied):
            return self._status_response(request, 403)
        if isinstance(exc, SuspiciousOperation):
            security_logger.warning(
                "security_event=%s context=%s",
                "api_bad_request",
                mask_sensitive_context({"path": request.path, "request_id": getattr(request, "request_id", ""), "error": str(exc)}),
            )
            return self._status_response(request, 400)

        if getattr(settings, "API_ERROR_LOGGING_ENABLED", True):
            request_logger.exception(
                "api_unhandled_exception request_id=%s method=%s path=%s",
                getattr(request, "request_id", ""),
                request.method,
                request.path,
            )
        return self._status_response(request, 500, exc=exc)

    def _status_response(self, request, status, exc=None):
        from django.conf import settings

        from .api_responses import error_response

        code, message = self.status_codes.get(status, self.status_codes[500])
        extra = {}
        if exc is not None and getattr(settings, "API_ERROR_INCLUDE_DEBUG", False):
            extra["debug"] = {"type": exc.__class__.__name__, "message": str(exc)}
        return error_response(message, status=status, code=code, request=request, **extra)


class SessionSecurityMiddleware:
    """Enforce the session-bound auth token and idle timeout on protected API routes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings

        if not getattr(settings, "SESSION_SECURITY_ENABLED", True):
            return self.get_response(request)
        if not self._is_protected_api_request(request):
            return self.get_response(request)
        if not getattr(getattr(request, "user", None), "is_authenticated", False):
            return self.get_response(request)

        if self._is_expired(request):
            return self._deny(request, "session_expired", "Session expired.", "session_expired")
        if not self._has_valid_auth_token(request):
            return self._deny(request, "session_invalid", "Session is invalid.", "session_token_invalid")

        self._touch(request)
        return self.get_response(request)

    def _is_protected_api_request(self, request):
        from django.conf import settings

        if not request.path.startswith("/api/"):
            return False
        for exempt_path in getattr(settings, "SESSION_SECURITY_EXEMPT_PATHS", []):
            if request.path == exempt_path or request.path.startswith(exempt_path):
                return False
        return True

    def _is_expired(self, request):
        from datetime import timezone as dt_timezone

        from django.conf import settings
        from django.utils import timezone

        timeout_seconds = getattr(settings, "SESSION_SECURITY_IDLE_TIMEOUT_SECONDS", 0)
        if timeout_seconds <= 0:
            return False
        last_activity = request.session.get("session_security_last_activity")
        if not last_activity:
            return False
        try:
            last_activity = timezone.datetime.fromisoformat(last_activity)
        except (TypeError, ValueError):
            return True
        if timezone.is_naive(last_activity):
            last_activity = timezone.make_aware(last_activity, timezone=dt_timezone.utc)
        return (timezone.now() - last_activity).total_seconds() > timeout_seconds

    def _has_valid_auth_token(self, request):
        from .account_service import has_valid_auth_token

        return has_valid_auth_token(request)

    def _touch(self, request):
        from django.utils import timezone

        request.session["session_security_last_activity"] = timezone.now().isoformat()

    def _deny(self, request, code, message, event):
        from django.contrib.auth import logout

        from .api_responses import error_response
        from .security import log_security_event

        log_security_event(event, path=request.path, user_id=getattr(request.user, "id", None), request_id=getattr(request, "request_id", ""))
        logout(request)
        response = error_response(message, status=401, code=code, request=request)
        response.delete_cookie("learning_auth_token", samesite="Lax")
        response["X-Session-Status"] = code
        return response


class MaintenanceModeMiddleware:
    """Temporarily disable public API traffic while health and admin stay reachable."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings

        if not getattr(settings, "MAINTENANCE_MODE", False):
            return self.get_response(request)
        if self._is_exempt(request):
            return self.get_response(request)
        if not self._should_block(request):
            return self.get_response(request)
        return self._maintenance_response(request)

    def _is_exempt(self, request):
        from django.conf import settings

        path = request.path
        for exempt_path in getattr(settings, "MAINTENANCE_EXEMPT_PATHS", []):
            if path == exempt_path or path.startswith(exempt_path):
                return True
        return False

    def _should_block(self, request):
        from django.conf import settings

        return request.path.startswith("/api/") or getattr(settings, "MAINTENANCE_BLOCK_FRONTEND", False)

    def _maintenance_response(self, request):
        from django.conf import settings

        from .api_responses import error_response

        retry_after = max(getattr(settings, "MAINTENANCE_RETRY_AFTER_SECONDS", 300), 0)
        response = error_response(
            getattr(settings, "MAINTENANCE_MESSAGE", "DeutschLive is temporarily in maintenance mode."),
            status=503,
            code="maintenance_mode",
            request=request,
            retryAfter=retry_after,
        )
        response["Retry-After"] = str(retry_after)
        response["Cache-Control"] = "no-store"
        return response


class UploadValidationMiddleware:
    """Validate multipart API uploads before view logic receives files."""

    unsafe_methods = {"POST", "PUT", "PATCH"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.http.multipartparser import MultiPartParserError

        if not getattr(settings, "UPLOAD_VALIDATION_ENABLED", True):
            return self.get_response(request)
        if not self._should_validate(request):
            return self.get_response(request)

        max_size_bytes = getattr(settings, "SECURE_UPLOAD_MAX_SIZE_MB", 5) * 1024 * 1024
        content_length = self._content_length(request)
        if content_length > max_size_bytes:
            return self._rejected_response(request, "File is too large.", "upload_too_large", 413)

        try:
            uploaded_files = request.FILES
        except MultiPartParserError:
            return self._rejected_response(request, "Invalid multipart upload.", "invalid_multipart_upload", 400)

        for upload_list in uploaded_files.lists():
            for upload in upload_list[1]:
                from .security import validate_private_upload

                is_valid, message = validate_private_upload(upload)
                if not is_valid:
                    code = "upload_too_large" if "large" in message.lower() else "unsupported_upload_type"
                    status = 413 if code == "upload_too_large" else 415
                    return self._rejected_response(request, message, code, status, upload)
        return self.get_response(request)

    def _should_validate(self, request):
        from django.conf import settings

        if request.method.upper() not in self.unsafe_methods:
            return False
        content_type = request.META.get("CONTENT_TYPE", "")
        if not content_type.startswith("multipart/form-data"):
            return False
        return any(request.path.startswith(prefix) for prefix in getattr(settings, "UPLOAD_VALIDATION_PATH_PREFIXES", ["/api/"]))

    def _content_length(self, request):
        try:
            return int(request.META.get("CONTENT_LENGTH", 0) or 0)
        except (TypeError, ValueError):
            return 0

    def _rejected_response(self, request, message, code, status, upload=None):
        from .api_responses import error_response
        from .security import log_security_event

        log_security_event(
            "upload_rejected",
            path=request.path,
            code=code,
            content_type=getattr(upload, "content_type", request.META.get("CONTENT_TYPE", "")),
            size=getattr(upload, "size", self._content_length(request)),
            request_id=getattr(request, "request_id", ""),
        )
        return error_response(message, status=status, code=code, request=request)


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def actor_key(request):
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        return f"user:{user.id}"
    return f"ip:{client_ip(request)}"


def login_rate_limit_key(request, username):
    return f"rate-limit:login:{client_ip(request)}:{str(username).lower()}"


class RateLimitMiddleware:
    """Apply centralized API rate-limit policies before view logic runs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rule = self._match_rule(request)
        if not rule:
            return self.get_response(request)

        key = self._key_for_rule(request, rule)
        allowed, attempts = self._increment(key, rule["limit"], rule["window_seconds"])
        if not allowed:
            from .api_responses import error_response

            security_logger.warning(
                "security_event=%s context=%s",
                "rate_limit_blocked",
                mask_sensitive_context({"rule": rule["name"], "key": key, "limit": rule["limit"], "request_id": getattr(request, "request_id", "")}),
            )
            response = error_response("Слишком много запросов. Попробуйте позже.", status=429, code="rate_limited")
            response["Retry-After"] = str(rule["window_seconds"])
            self._set_rate_headers(response, rule, 0)
            return response

        response = self.get_response(request)
        self._set_rate_headers(response, rule, max(rule["limit"] - attempts, 0))
        return response

    def _match_rule(self, request):
        from django.conf import settings

        if not getattr(settings, "RATE_LIMITING_ENABLED", True):
            return None

        method = request.method.upper()
        path = request.path
        policies = getattr(settings, "RATE_LIMIT_POLICIES", {})
        for name in ["login", "feedback", "quiz_attempt"]:
            rule = policies.get(name, {})
            if method in rule.get("methods", []) and path == rule.get("path"):
                return {"name": name, **rule}

        general = policies.get("api_write", {})
        if method in general.get("methods", []) and path.startswith(general.get("path_prefix", "/api/")):
            return {"name": "api_write", **general}
        return None

    def _key_for_rule(self, request, rule):
        if rule["name"] == "login":
            return login_rate_limit_key(request, self._json_value(request, "username"))
        return f"rate-limit:{rule['name']}:{actor_key(request)}"

    def _json_value(self, request, field):
        import json

        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            return ""
        return str(data.get(field, "")).strip()

    def _increment(self, key, limit, window_seconds):
        from django.core.cache import cache

        attempts = cache.get(key, 0)
        if attempts >= limit:
            return False, attempts
        attempts += 1
        cache.set(key, attempts, timeout=window_seconds)
        return True, attempts

    def _set_rate_headers(self, response, rule, remaining):
        response["X-RateLimit-Limit"] = str(rule["limit"])
        response["X-RateLimit-Remaining"] = str(remaining)


class AuditContextMiddleware:
    """Expose immutable request metadata for audit writers further down the stack."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.audit_context = {
            "request_id": getattr(request, "request_id", ""),
            "path": request.path,
            "ip": client_ip(request),
            "method": request.method,
        }
        return self.get_response(request)


class LocaleContextMiddleware:
    """Resolve UI/explanation language while keeping German as the learning language."""

    supported_languages = {"ru", "de", "en"}
    default_language = "ru"
    learning_language = "de"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.utils import translation
        from django.utils.cache import patch_vary_headers

        interface_language = self._interface_language(request)
        explanation_language = self._explanation_language(request, interface_language)
        request.interface_language = interface_language
        request.explanation_language = explanation_language
        request.learning_language = self.learning_language
        translation.activate(interface_language)
        try:
            response = self.get_response(request)
        finally:
            translation.deactivate()

        response.setdefault("Content-Language", interface_language)
        response.setdefault("X-Interface-Language", interface_language)
        response.setdefault("X-Explanation-Language", explanation_language)
        response.setdefault("X-Learning-Language", self.learning_language)
        if not getattr(getattr(request, "user", None), "is_authenticated", False):
            patch_vary_headers(response, ["Accept-Language"])
        return response

    def _interface_language(self, request):
        profile_language = self._profile_value(request, "interface_language")
        if profile_language:
            return profile_language
        return self._accepted_language(request) or self.default_language

    def _explanation_language(self, request, fallback):
        return self._profile_value(request, "explanation_language") or fallback

    def _profile_value(self, request, field):
        from django.core.exceptions import ObjectDoesNotExist

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return ""
        try:
            profile = getattr(user, "learning_profile", None)
        except ObjectDoesNotExist:
            return ""
        value = getattr(profile, field, "")
        return value if value in self.supported_languages else ""

    def _accepted_language(self, request):
        header = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
        for part in header.split(","):
            lang = part.split(";", 1)[0].strip().lower()
            if not lang:
                continue
            base = lang.split("-", 1)[0]
            if base in self.supported_languages:
                return base
        return ""


class ThemeContextMiddleware:
    """Prepare server-side theme context without replacing frontend theme control."""

    supported_preferences = {"system", "light", "dark"}
    default_preference = "system"
    default_resolved_theme = "light"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.utils.cache import patch_vary_headers

        preference = self._theme_preference(request)
        resolved = self._resolved_theme(request, preference)
        request.theme_preference = preference
        request.resolved_theme = resolved

        response = self.get_response(request)
        response.setdefault("X-Theme-Preference", preference)
        response.setdefault("X-Resolved-Theme", resolved)
        if preference == "system":
            patch_vary_headers(response, ["Sec-CH-Prefers-Color-Scheme"])
        return response

    def _theme_preference(self, request):
        profile_value = self._profile_value(request)
        if profile_value:
            return profile_value
        header_value = request.META.get("HTTP_X_THEME_PREFERENCE", "").strip().lower()
        if header_value in self.supported_preferences:
            return header_value
        return self.default_preference

    def _profile_value(self, request):
        from django.core.exceptions import ObjectDoesNotExist

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return ""
        try:
            profile = getattr(user, "learning_profile", None)
        except ObjectDoesNotExist:
            return ""
        value = getattr(profile, "theme_preference", "")
        return value if value in self.supported_preferences else ""

    def _resolved_theme(self, request, preference):
        if preference in {"light", "dark"}:
            return preference
        hint = request.META.get("HTTP_SEC_CH_PREFERS_COLOR_SCHEME", "").strip().strip('"').lower()
        if hint in {"light", "dark"}:
            return hint
        return self.default_resolved_theme


class RequestContextMiddleware:
    """Collect stable request context for services, logging and future middleware."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.app_context = {
            "request_id": getattr(request, "request_id", ""),
            "path": request.path,
            "method": request.method,
            "ip": client_ip(request),
            "language": {
                "interface": getattr(request, "interface_language", ""),
                "explanation": getattr(request, "explanation_language", ""),
                "learning": getattr(request, "learning_language", "de"),
            },
            "theme": {
                "preference": getattr(request, "theme_preference", ""),
                "resolved": getattr(request, "resolved_theme", ""),
            },
            "user": self._user_context(request),
            "device": self._device_context(request),
        }
        response = self.get_response(request)
        response.setdefault("X-Request-Context", "available")
        return response

    def _user_context(self, request):
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return {"authenticated": False, "id": None, "role": "anonymous", "staff": False}
        return {
            "authenticated": True,
            "id": getattr(user, "id", None),
            "role": self._role(request),
            "staff": bool(getattr(user, "is_staff", False)),
        }

    def _role(self, request):
        from django.core.exceptions import ObjectDoesNotExist

        try:
            return getattr(request.user.learning_profile, "role", "learner")
        except ObjectDoesNotExist:
            return "learner"

    def _device_context(self, request):
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        normalized = user_agent.lower()
        is_mobile = any(marker in normalized for marker in ["mobile", "iphone", "android"])
        return {
            "user_agent": user_agent[:260],
            "kind": "mobile" if is_mobile else "desktop",
            "mobile": is_mobile,
        }


class PremiumAccessMiddleware:
    """Guard classified premium API routes before view-specific logic runs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        policy = self._match_policy(request)
        request.premium_access_policy = policy["name"] if policy else ""
        if not policy:
            return self.get_response(request)

        if not self._is_authenticated(request):
            return self._auth_required_response(request, policy)

        if not self._has_premium_access(request):
            return self._premium_required_response(request, policy)

        request.premium_access_granted = True
        return self.get_response(request)

    def _match_policy(self, request):
        from django.conf import settings

        if not getattr(settings, "PREMIUM_ACCESS_ENABLED", True):
            return None

        method = request.method.upper()
        for name, policy in getattr(settings, "PREMIUM_ACCESS_POLICIES", {}).items():
            if method not in policy.get("methods", []):
                continue
            if request.path != policy.get("path"):
                continue
            setting_name = policy.get("requires_setting")
            if setting_name and not getattr(settings, setting_name, False):
                request.premium_access_fallback = policy.get("fallback", "free")
                return None
            return {"name": name, **policy}
        return None

    def _is_authenticated(self, request):
        from django.contrib.auth import logout

        from .account_service import has_valid_auth_token
        from .security import log_security_event

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            log_security_event("premium_route_auth_required", path=request.path, policy=getattr(request, "premium_access_policy", ""))
            return False
        if not has_valid_auth_token(request):
            log_security_event("premium_route_invalid_token", path=request.path, user_id=getattr(user, "id", None), policy=getattr(request, "premium_access_policy", ""))
            logout(request)
            return False
        return True

    def _has_premium_access(self, request):
        from .account_service import get_profile

        return get_profile(request.user).has_premium_access

    def _auth_required_response(self, request, policy):
        from .api_responses import error_response

        response = error_response("Authentication required.", status=401, code="auth_required")
        self._set_headers(response, policy)
        return response

    def _premium_required_response(self, request, policy):
        from .api_responses import error_response
        from .audit import log_audit_event
        from .security import log_security_event

        log_security_event("premium_route_denied", path=request.path, user_id=request.user.id, policy=policy["name"])
        log_audit_event(
            "permission_denied",
            request=request,
            target=request.user,
            metadata={
                "policy": policy["name"],
                "required": "premium",
                "fallback": policy.get("fallback", "deny"),
                "path": request.path,
            },
        )
        response = error_response("Premium access required.", status=402, code="premium_required")
        self._set_headers(response, policy)
        return response

    def _set_headers(self, response, policy):
        response["X-Premium-Required"] = "true"
        response["X-Premium-Policy"] = policy["name"]
