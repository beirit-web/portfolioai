from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Profile

SESSION_GENERATION_SESSION_KEY = "auth_session_generation"
SESSION_IDLE_TIMEOUT_REASON = "idle_timeout"
SESSION_REVOKED_REASON = "session_revoked"


@dataclass
class AuthSessionState:
    profile: Profile
    session_generation: int
    valid: bool
    reason: str = ""


def get_session_idle_timeout_seconds() -> int:
    return max(1, int(getattr(settings, "SESSION_IDLE_TIMEOUT_SECONDS", 600)))


def get_session_status_poll_seconds() -> int:
    return max(5, int(getattr(settings, "SESSION_IDLE_STATUS_POLL_SECONDS", 15)))


def get_session_activity_throttle_seconds() -> int:
    return max(1, int(getattr(settings, "SESSION_IDLE_ACTIVITY_THROTTLE_SECONDS", 15)))


def get_user_profile(user) -> Profile:
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


def initialize_authenticated_session(request, user, now=None, reset_activity: bool = False) -> Profile:
    now = now or timezone.now()
    profile = get_user_profile(user)
    update_fields = []

    if reset_activity or profile.last_activity_at is None:
        profile.last_activity_at = now
        update_fields.append("last_activity_at")

    if update_fields:
        profile.save(update_fields=update_fields)

    request.session[SESSION_GENERATION_SESSION_KEY] = int(profile.session_generation or 0)
    return profile


def touch_user_activity(user, now=None) -> Profile:
    now = now or timezone.now()
    profile = get_user_profile(user)
    profile.last_activity_at = now
    profile.save(update_fields=["last_activity_at"])
    return profile


def invalidate_user_sessions(user, now=None) -> Profile:
    now = now or timezone.now()
    profile = get_user_profile(user)
    profile.session_generation = int(profile.session_generation or 0) + 1
    profile.last_activity_at = now
    profile.save(update_fields=["session_generation", "last_activity_at"])
    return profile


def check_authenticated_session(request, now=None) -> AuthSessionState | None:
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    now = now or timezone.now()
    profile = get_user_profile(user)
    current_generation = int(profile.session_generation or 0)
    session_generation = _coerce_session_generation(
        request.session.get(SESSION_GENERATION_SESSION_KEY)
    )

    if session_generation is None:
        request.session[SESSION_GENERATION_SESSION_KEY] = current_generation
        session_generation = current_generation

    if session_generation != current_generation:
        return AuthSessionState(
            profile=profile,
            session_generation=session_generation,
            valid=False,
            reason=SESSION_REVOKED_REASON,
        )

    if profile.last_activity_at is None:
        profile.last_activity_at = now
        profile.save(update_fields=["last_activity_at"])

    idle_delta = now - profile.last_activity_at
    if idle_delta >= timedelta(seconds=get_session_idle_timeout_seconds()):
        profile = invalidate_user_sessions(user, now=now)
        return AuthSessionState(
            profile=profile,
            session_generation=session_generation,
            valid=False,
            reason=SESSION_IDLE_TIMEOUT_REASON,
        )

    return AuthSessionState(
        profile=profile,
        session_generation=session_generation,
        valid=True,
    )


def get_remaining_session_seconds(profile: Profile, now=None) -> int:
    now = now or timezone.now()
    if profile.last_activity_at is None:
        return get_session_idle_timeout_seconds()
    elapsed = int((now - profile.last_activity_at).total_seconds())
    return max(0, get_session_idle_timeout_seconds() - elapsed)


def _coerce_session_generation(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
