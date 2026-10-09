"""Custom template context processors for shared data."""

from django.contrib.auth.models import User
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse

from pages.auth_session import (
    get_session_activity_throttle_seconds,
    get_session_idle_timeout_seconds,
    get_session_status_poll_seconds,
)
from pages.models import InterpreterApplication

SEO_KEYWORDS = (
    "Beirit Web, Portfolio, Webentwicklung, Softwareentwicklung, "
    "React, Django, Python, JavaScript, Fullstack"
)


def seo_defaults(_request):
    return {"seo_keywords": SEO_KEYWORDS}


def auth_session_config(_request):
    session_idle_timeout_ms = get_session_idle_timeout_seconds() * 1000
    session_idle_status_poll_ms = get_session_status_poll_seconds() * 1000
    session_idle_activity_throttle_ms = (
        get_session_activity_throttle_seconds() * 1000
    )

    return {
        "app_version": settings.APP_VERSION,
        "session_idle_timeout_ms": session_idle_timeout_ms,
        "session_idle_status_poll_ms": session_idle_status_poll_ms,
        "session_idle_activity_throttle_ms": session_idle_activity_throttle_ms,
        "auth_session_js_config": {
            "isAuthenticated": _request.user.is_authenticated,
            "activityUrl": reverse("pages:session_activity"),
            "statusUrl": reverse("pages:session_status"),
            "loginUrl": reverse("pages:login"),
            "idleTimeoutMs": session_idle_timeout_ms,
            "statusPollMs": session_idle_status_poll_ms,
            "activityThrottleMs": session_idle_activity_throttle_ms,
        },
    }


def user_stats(_request):
    """
    Expose platform-wide user counters for the footer.

    Values are cached briefly to avoid repeated COUNT queries on every request.
    """

    cache_key = "footer_user_stats_v2"
    cached = cache.get(cache_key)
    if cached:
        return cached

    total_users = User.objects.filter(
        is_active=True, is_staff=False, is_superuser=False
    ).count()
    interpreter_count = InterpreterApplication.objects.filter(
        status=InterpreterApplication.STATUS_APPROVED
    ).count()

    stats = {
        "registered_user_count": total_users,
        "interpreter_count": interpreter_count,
    }
    cache.set(cache_key, stats, 300)
    return stats
