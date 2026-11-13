"""Short-lived password recovery messages visible only in a local browser session."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.views import INTERNAL_RESET_SESSION_TOKEN
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .local_activation import local_activation_enabled


SESSION_KEY = "local_password_reset"
LIFETIME_SECONDS = 600


class LocalPasswordResetTokenGenerator(PasswordResetTokenGenerator):
    # Keep Django's password/email-bound, single-use tokens in a separate scope:
    # a token shown in this local demo can never be used by the emailed flow.
    key_salt = "pages.local_password_reset.LocalPasswordResetTokenGenerator"


local_token_generator = LocalPasswordResetTokenGenerator()


def clear_local_password_reset(request):
    challenge = request.session.pop(SESSION_KEY, None)
    if isinstance(challenge, dict) and request.session.get(INTERNAL_RESET_SESSION_TOKEN) == challenge.get("token"):
        request.session.pop(INTERNAL_RESET_SESSION_TOKEN, None)


def pending_local_password_reset(request):
    challenge = request.session.get(SESSION_KEY)
    if not isinstance(challenge, dict):
        return None
    if (
        not local_activation_enabled(request)
        or not isinstance(challenge.get("expires_at"), (float, int))
        or timezone.now().timestamp() >= challenge["expires_at"]
        or not isinstance(challenge.get("token"), str)
    ):
        clear_local_password_reset(request)
        return None
    return challenge


def issue_local_password_reset(request, form):
    if not local_activation_enabled(request):
        return
    clear_local_password_reset(request)
    user = next(form.get_users(form.cleaned_data["email"]), None)
    # Unknown and inactive addresses receive the same browser message, but no
    # account that could be changed. Do not display an address or account name.
    token_user = user or get_user_model()(email=form.cleaned_data["email"])
    if user is None:
        token_user.set_unusable_password()
    request.session[SESSION_KEY] = {
        "user_id": user.pk if user else None,
        "uidb64": urlsafe_base64_encode(force_bytes(user.pk)) if user else "",
        "token": local_token_generator.make_token(token_user),
        "expires_at": (timezone.now() + timedelta(seconds=LIFETIME_SECONDS)).timestamp(),
    }


def local_password_reset_user(challenge):
    if not challenge or challenge.get("user_id") is None:
        return None
    user = get_user_model().objects.filter(pk=challenge["user_id"], is_active=True).first()
    if user is None or not user.has_usable_password():
        return None
    if not local_token_generator.check_token(user, challenge["token"]):
        return None
    return user
