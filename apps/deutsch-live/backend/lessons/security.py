import logging

from django.conf import settings
from django.core.cache import cache

from .middleware import mask_sensitive_context

logger = logging.getLogger("lessons.security")


def rate_limit(key, limit, timeout_seconds):
    attempts = cache.get(key, 0)
    if attempts >= limit:
        log_security_event("rate_limit_blocked", key=key, limit=limit)
        return False
    cache.set(key, attempts + 1, timeout=timeout_seconds)
    return True


def validate_private_upload(upload):
    max_upload_size_bytes = settings.SECURE_UPLOAD_MAX_SIZE_MB * 1024 * 1024
    allowed_content_types = set(settings.SECURE_UPLOAD_ALLOWED_CONTENT_TYPES)
    if upload.size > max_upload_size_bytes:
        return False, f"File is too large. Maximum size is {settings.SECURE_UPLOAD_MAX_SIZE_MB} MB."
    content_type = getattr(upload, "content_type", "")
    if content_type not in allowed_content_types:
        return False, "Unsupported file type."
    return True, ""


def log_security_event(event, **context):
    logger.warning("security_event=%s context=%s", event, mask_sensitive_context(context))
