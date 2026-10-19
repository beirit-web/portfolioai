"""A session-scoped example mailbox for registrations on the local demo server."""

from .account_i18n import account_text_lazy as account_copy

from datetime import datetime, timedelta, timezone as datetime_timezone
import secrets
from urllib.parse import urlencode

from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import Http404
from django.http.request import split_domain_port
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods

from .login_security import login_attempt_key
from .models import LoginAttemptBucket, Profile


SESSION_KEY = "local_account_activation"
CODE_LIFETIME_SECONDS = 60
CODE_ATTEMPT_LIMIT = 5


def local_activation_enabled(request):
    host, _ = split_domain_port(request.get_host().lower())
    return (
        settings.DEBUG
        and settings.LOCAL_ACCOUNT_ACTIVATION_ENABLED
        and not settings.ACCOUNT_EMAIL_DELIVERY_ENABLED
        and settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend"
        and host in {"localhost", "127.0.0.1", "[::1]"}
        and request.META.get("REMOTE_ADDR") in {"127.0.0.1", "::1"}
    )


def pending_local_activation(request):
    if not local_activation_enabled(request):
        return None
    challenge = request.session.get(SESSION_KEY)
    if not isinstance(challenge, dict):
        return None
    user = get_user_model().objects.filter(
        pk=challenge.get("user_id"), is_active=False,
        profile__email_verification_pending=True,
    ).first()
    if user is None:
        request.session.pop(SESSION_KEY, None)
        return None
    return user, challenge


def issue_local_activation(request, user, *, next_url=""):
    expires_at = timezone.now() + timedelta(seconds=CODE_LIFETIME_SECONDS)
    previous = request.session.get(SESSION_KEY, {}).get("code")
    code = f"{secrets.randbelow(1_000_000):06d}"
    while code == previous:
        code = f"{secrets.randbelow(1_000_000):06d}"
    request.session[SESSION_KEY] = {
        "user_id": user.pk,
        "code": code,
        "expires_at": expires_at.timestamp(),
        "attempts": 0,
        "next_url": next_url,
    }
    # The owner of this browser challenge can retry with a newly generated code.
    LoginAttemptBucket.objects.filter(key=login_attempt_key(request, user.email)).delete()


def local_activation_login_url(request, user, *, next_url=""):
    params = {"email": user.email}
    if next_url:
        params["next"] = next_url
    return f"{reverse('pages:login')}?{urlencode(params)}"


def local_registration_payload(request, user, *, next_url=""):
    if not local_activation_enabled(request):
        return {}
    return {
        "activationUrl": local_activation_login_url(request, user, next_url=next_url),
        "exampleMailUrl": reverse("pages:example_mail"),
    }


class LocalActivationForm(forms.Form):
    activation_code = forms.RegexField(
        r"^[0-9]{6}$", label=account_copy("Aktivierungscode"), min_length=6, max_length=6,
        help_text=account_copy("Geben Sie den sechsstelligen Code aus /examplemail ein. Er ist eine Minute gültig."),
        error_messages={"invalid": account_copy("Bitte geben Sie den sechsstelligen Aktivierungscode ein.")},
        widget=forms.TextInput(attrs={
            "autocomplete": "one-time-code", "inputmode": "numeric",
            "pattern": "[0-9]{6}", "autofocus": True,
        }),
    )


def activate_local_account(request, code):
    pending = pending_local_activation(request)
    if pending is None:
        return False, account_copy("Bitte fordern Sie zuerst einen Aktivierungscode an.")
    user, challenge = pending
    if timezone.now().timestamp() >= challenge["expires_at"] or not challenge["code"]:
        return False, account_copy("Der Aktivierungscode ist abgelaufen. Bitte fordern Sie unter /examplemail einen neuen Code an.")
    if not constant_time_compare(code, challenge["code"]):
        challenge = {**challenge, "attempts": challenge["attempts"] + 1}
        if challenge["attempts"] >= CODE_ATTEMPT_LIMIT:
            challenge["code"] = ""
        request.session[SESSION_KEY] = challenge
        return False, account_copy("Der Aktivierungscode ist ungültig. Prüfen Sie den Code unter /examplemail.")
    with transaction.atomic():
        # Start with a conditional write. SQLite cannot upgrade two concurrent
        # deferred read transactions to writers; SELECT FOR UPDATE is a no-op
        # there. The update also consumes activation only once on other DBs.
        activated = get_user_model().objects.filter(
            pk=user.pk, is_active=False, profile__email_verification_pending=True,
        ).update(is_active=True)
        if not activated:
            return False, account_copy("Der Aktivierungscode wurde bereits verwendet.")
        Profile.objects.filter(user=user).update(email_verification_pending=False)
        from lessons.models import UserProfile

        UserProfile.objects.update_or_create(user=user, defaults={"email_verified": True})
    request.session.pop(SESSION_KEY, None)
    return True, account_copy("Ihr Konto ist aktiviert. Sie können sich jetzt mit E-Mail-Adresse und Passwort anmelden.")


@never_cache
@require_http_methods(["GET", "POST"])
def example_mail(request):
    if not local_activation_enabled(request):
        raise Http404
    from .views import build_base_context

    pending = pending_local_activation(request)
    if request.method == "POST" and pending:
        user, challenge = pending
        issue_local_activation(request, user, next_url=challenge["next_url"])
        messages.success(request, account_copy("Ein neuer Aktivierungscode wurde erstellt. Er ist eine Minute gültig."))
        return redirect("pages:example_mail")
    context = {**build_base_context(request), "local_mailbox": True}
    if pending:
        user, challenge = pending
        context.update({
            "activation_email": user.email,
            "activation_code": challenge["code"],
            "activation_expired": timezone.now().timestamp() >= challenge["expires_at"] or not challenge["code"],
            "activation_expires_at": datetime.fromtimestamp(challenge["expires_at"], tz=datetime_timezone.utc),
            "activation_login_url": local_activation_login_url(request, user, next_url=challenge["next_url"]),
        })
    response = render(request, "registration/example_mail.html", context)
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response
