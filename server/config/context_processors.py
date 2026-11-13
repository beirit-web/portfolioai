"""Custom template context processors for shared data."""

from django.urls import reverse
from pages.account_projects import project_account_context

from pages.auth_session import (
    get_session_activity_throttle_seconds,
    get_session_idle_timeout_seconds,
    get_session_status_poll_seconds,
)

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
        **project_account_context(_request),
        "auth_session_js_config": {
            "isAuthenticated": bool(getattr(getattr(_request, "user", None), "is_authenticated", False)),
            "activityUrl": reverse("pages:session_activity"),
            "statusUrl": reverse("pages:session_status"),
            "loginUrl": reverse("pages:login"),
            "idleTimeoutMs": session_idle_timeout_ms,
            "statusPollMs": session_idle_status_poll_ms,
            "activityThrottleMs": session_idle_activity_throttle_ms,
        },
    }
