import logging
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger("lessons.security")


ALLOWED_UPLOAD_CONTENT_TYPES = set(settings.SECURE_UPLOAD_ALLOWED_CONTENT_TYPES)
MAX_UPLOAD_SIZE_BYTES = settings.SECURE_UPLOAD_MAX_SIZE_MB * 1024 * 1024


def rate_limit(key, limit, timeout_seconds):
    attempts = cache.get(key, 0)
    if attempts >= limit:
        log_security_event("rate_limit_blocked", key=key, limit=limit)
        return False
    cache.set(key, attempts + 1, timeout=timeout_seconds)
    return True


def staff_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            log_security_event("staff_route_unauthenticated", path=request.path)
            return JsonResponse({"error": "Authentication required."}, status=401)
        if not request.user.is_staff:
            log_security_event("staff_route_forbidden", user_id=request.user.id, path=request.path)
            return JsonResponse({"error": "Staff access required."}, status=403)
        return view_func(request, *args, **kwargs)

    return wrapper


def validate_private_upload(upload):
    if upload.size > MAX_UPLOAD_SIZE_BYTES:
        return False, f"File is too large. Maximum size is {settings.SECURE_UPLOAD_MAX_SIZE_MB} MB."
    content_type = getattr(upload, "content_type", "")
    if content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        return False, "Unsupported file type."
    return True, ""


def log_security_event(event, **context):
    logger.warning("security_event=%s context=%s", event, context)
