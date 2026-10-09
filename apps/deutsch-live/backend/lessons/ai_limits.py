from dataclasses import dataclass
from math import ceil

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


@dataclass(frozen=True)
class AIUsageDecision:
    allowed: bool
    code: str = ""
    message: str = ""
    estimated_tokens: int = 0
    daily_limit: int = 0
    remaining: int = 0


def estimate_input_tokens(*parts):
    text = "\n".join(str(part or "") for part in parts)
    return max(1, ceil(len(text) / 4))


def check_and_consume_ai_usage(user, profile, *input_parts):
    estimated_tokens = estimate_input_tokens(*input_parts)
    if estimated_tokens > settings.AI_MAX_INPUT_TOKENS:
        return AIUsageDecision(
            allowed=False,
            code="ai_input_too_long",
            message="Der Text ist zu lang fuer eine einzelne KI-Anfrage.",
            estimated_tokens=estimated_tokens,
            daily_limit=_daily_limit(profile),
        )

    if settings.AI_PREMIUM_REQUIRED and not profile.has_premium_access:
        return AIUsageDecision(
            allowed=False,
            code="premium_required",
            message="Premium access required.",
            estimated_tokens=estimated_tokens,
            daily_limit=_daily_limit(profile),
        )

    limit = _daily_limit(profile)
    cache_key = _usage_cache_key(user.id)
    used = cache.get(cache_key, 0)
    if used >= limit:
        return AIUsageDecision(
            allowed=False,
            code="ai_daily_limit_reached",
            message="Das Tageslimit fuer KI-Anfragen ist erreicht.",
            estimated_tokens=estimated_tokens,
            daily_limit=limit,
            remaining=0,
        )

    cache.set(cache_key, used + 1, timeout=_seconds_until_tomorrow())
    return AIUsageDecision(
        allowed=True,
        estimated_tokens=estimated_tokens,
        daily_limit=limit,
        remaining=max(0, limit - used - 1),
    )


def _daily_limit(profile):
    if profile.has_premium_access:
        return settings.AI_DAILY_PREMIUM_LIMIT
    return settings.AI_DAILY_FREE_LIMIT


def _usage_cache_key(user_id):
    return f"ai-usage:{timezone.localdate().isoformat()}:{user_id}"


def _seconds_until_tomorrow():
    now = timezone.localtime()
    tomorrow = (now + timezone.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(60, int((tomorrow - now).total_seconds()))
