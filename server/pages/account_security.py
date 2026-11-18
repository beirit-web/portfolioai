"""Shared database-backed budgets for account creation and recovery."""

from datetime import timedelta
import hashlib
import json

from config.client_ip import client_ip

from django.contrib.auth import get_user_model
from django.db.models import F
from django.http import JsonResponse
from django.utils import timezone

from .models import LoginAttemptBucket

WINDOW_SECONDS = 15 * 60


def consume_budget(scope, value, limit):
    key = hashlib.sha256(f"account:{scope}:{value}".encode()).hexdigest()
    now = timezone.now()
    LoginAttemptBucket.objects.filter(expires_at__lte=now).delete()
    LoginAttemptBucket.objects.get_or_create(
        key=key, defaults={"expires_at": now + timedelta(seconds=WINDOW_SECONDS)},
    )
    return bool(LoginAttemptBucket.objects.filter(key=key, attempts__lt=limit).update(attempts=F("attempts") + 1))


class AccountSubmissionLimitMiddleware:
    """Apply budgets after CSRF validation, including every alias of a view."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.method != "POST":
            return None
        view_class = getattr(view_func, "view_class", None)
        view = (view_func.__module__, view_class.__name__ if view_class else view_func.__name__)
        if view in {("pages.views", "register"), ("pages.views", "housing_register_api"), ("lessons.views", "register")}:
            scope = "register"
        elif view in {("pages.account_views", "AccountPasswordResetView"), ("pages.verification", "AccountVerificationResendView")}:
            scope = "recovery"
        elif view == ("pages.email_change", "confirm_email_change"):
            scope = "email_change"
        elif view in {
            ("pages.views", "profile_page"), ("pages.views", "delete_account"),
            ("lessons.views", "delete_account"), ("lessons.views", "change_password"),
            ("django.contrib.auth.views", "PasswordChangeView"),
            ("django.contrib.admin.sites", "password_change"),
        }:
            if not request.user.is_authenticated:
                return None
            scope = "sensitive"
        else:
            return None
        if request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except (ValueError, UnicodeDecodeError, RecursionError):
                data = {}
            if not isinstance(data, dict):
                data = {}
        else:
            data = request.POST
        identifier = data.get("email", "")
        identifier = get_user_model().normalize_username(identifier.strip()).casefold() if isinstance(identifier, str) else ""
        if scope == "sensitive":
            identifier = str(request.user.pk)
        elif scope == "email_change":
            identifier = str(view_kwargs.get("user_id", ""))
        # Only configured proxy headers are trusted. A second budget prevents bypass by
        # rotating addresses, while the first applies equally to unknown users.
        peer = client_ip(request)
        allowed = consume_budget(scope + ":peer", peer, 50)
        if allowed:
            allowed = consume_budget(scope + ":identity", f"{peer}|{identifier}", 5)
        if allowed:
            return None
        from config.error_views import error_response, wants_json_error_response

        response = JsonResponse({"error": "Zu viele Anfragen. Bitte versuchen Sie es später erneut.", "code": "account_rate_limited"}, status=429) if wants_json_error_response(request) else error_response(request, 429)
        response["Retry-After"] = str(WINDOW_SECONDS)
        response["Cache-Control"] = "no-store"
        return response
