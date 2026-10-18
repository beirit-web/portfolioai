"""One database-backed login budget shared by all authentication entry points."""

from datetime import timedelta
import hashlib

from django.db.models import F
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone

from .models import LoginAttemptBucket

LOGIN_ATTEMPT_LIMIT = 5
LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60


def login_attempt_key(request, identifier):
    # Use the direct peer, not an untrusted X-Forwarded-For header.
    peer = request.META.get("REMOTE_ADDR", "unknown")
    identifier = User.normalize_username(identifier.strip()).casefold()
    user_id = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).values_list("pk", flat=True).first()
    account = f"user:{user_id}" if user_id else f"name:{identifier}"
    value = f"{peer}|{account}"
    return hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


def consume_login_attempt(request, identifier):
    key = login_attempt_key(request, identifier)
    now = timezone.now()
    # Expired rows are removed on authentication traffic, so this table stays bounded.
    LoginAttemptBucket.objects.filter(expires_at__lte=now).delete()
    LoginAttemptBucket.objects.get_or_create(
        key=key,
        defaults={"expires_at": now + timedelta(seconds=LOGIN_ATTEMPT_WINDOW_SECONDS)},
    )
    # Conditional SQL increment is atomic across processes and concurrent requests.
    allowed = LoginAttemptBucket.objects.filter(key=key, attempts__lt=LOGIN_ATTEMPT_LIMIT).update(
        attempts=F("attempts") + 1,
    )
    request.login_attempt_bucket = key
    return bool(allowed)


def clear_login_attempts(request):
    key = getattr(request, "login_attempt_bucket", None)
    if key:
        LoginAttemptBucket.objects.filter(key=key).delete()
