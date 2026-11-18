"""Password-confirmed, single-use changes to the account recovery address."""

from datetime import timedelta
import hashlib
import secrets

from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model, logout
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods

from .account_i18n import account_text_lazy as account_copy
from .models import EmailChangeRequest
from .modules.mail import send_notification_email

SESSION_KEY = "pending_email_change_confirmation"


def request_email_change(user, new_email):
    if settings.EMAIL_BACKEND == "django.core.mail.backends.dummy.EmailBackend":
        return False
    token = secrets.token_urlsafe(32)
    now = timezone.now()
    EmailChangeRequest.objects.filter(expires_at__lte=now).delete()
    change, _ = EmailChangeRequest.objects.update_or_create(user=user, defaults={
        "current_email": user.email, "new_email": new_email,
        "token_digest": hashlib.sha256(token.encode()).hexdigest(),
        "auth_hash": user.get_session_auth_hash(), "expires_at": now + timedelta(minutes=30),
    })
    link = settings.SITE_URL.rstrip("/") + reverse("pages:confirm_email_change", args=[user.pk, token])
    notice = str(account_copy("Eine Änderung Ihrer Konto-E-Mail wurde angefordert. Wenn Sie das nicht waren, setzen Sie bitte Ihr Passwort zurück."))
    body = str(account_copy("Bestätigen Sie Ihre neue E-Mail-Adresse innerhalb von 30 Minuten. Ihr aktuelles Passwort wird benötigt.")) + "\n\n" + link
    subject = str(account_copy("E-Mail-Adresse ändern")) + " | Beirit Web"
    # Inform the current owner before sending a confirmation to the new inbox.
    sent = (send_notification_email(subject, notice, user.email)
            and send_notification_email(subject, body, new_email))
    if not sent:
        EmailChangeRequest.objects.filter(user=user, token_digest=change.token_digest).delete()
    return sent


class ConfirmEmailChangeForm(forms.Form):
    password = forms.CharField(
        label=account_copy("Aktuelles Passwort"), strip=False, max_length=1024,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )


def valid_change(change, token):
    return bool(change and change.user.is_active and change.expires_at > timezone.now()
                and change.current_email == change.user.email
                and constant_time_compare(change.auth_hash, change.user.get_session_auth_hash())
                and constant_time_compare(change.token_digest, hashlib.sha256(token.encode()).hexdigest()))


@never_cache
@csrf_protect
@sensitive_post_parameters("password")
@require_http_methods(["GET", "POST"])
def confirm_email_change(request, user_id, token):
    # Strip the secret from the form URL. A scanner's GET never changes an account.
    if token != "confirm":
        if request.method == "POST":
            return redirect("pages:confirm_email_change", user_id=user_id, token="confirm")
        request.session[SESSION_KEY] = {"user_id": user_id, "token": token}
        response = redirect("pages:confirm_email_change", user_id=user_id, token="confirm")
        response["Referrer-Policy"] = "no-referrer"
        return response
    pending = request.session.get(SESSION_KEY, {})
    secret = pending.get("token", "") if pending.get("user_id") == user_id else ""
    change = EmailChangeRequest.objects.select_related("user").filter(user_id=user_id).first()
    valid = valid_change(change, secret)
    form = ConfirmEmailChangeForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and valid and form.is_valid():
        try:
            with transaction.atomic():
                change = EmailChangeRequest.objects.select_for_update().select_related("user").filter(user_id=user_id).first()
                if not valid_change(change, secret):
                    valid = False
                elif not change.user.check_password(form.cleaned_data["password"]):
                    form.add_error("password", account_copy("Das aktuelle Passwort ist nicht korrekt."))
                elif get_user_model().objects.filter(Q(email__iexact=change.new_email) | Q(username__iexact=change.new_email)).exclude(pk=user_id).exists():
                    form.add_error(None, account_copy("Diese E-Mail wird bereits verwendet."))
                else:
                    # Atomic consume also protects databases without row locks.
                    deleted, _ = EmailChangeRequest.objects.filter(user_id=user_id, token_digest=change.token_digest).delete()
                    if not deleted:
                        valid = False
                    else:
                        user = change.user
                        user.email = user.username = change.new_email
                        # Same password, new salt: invalidate all Django sessions,
                        # housing bearer tokens and learning authentication cookies.
                        user.set_password(form.cleaned_data["password"])
                        user.save(update_fields=["email", "username", "password"])
                        logout(request)
                        messages.success(request, account_copy("Ihre E-Mail-Adresse wurde bestätigt. Bitte melden Sie sich erneut an."))
                        response = redirect("pages:login")
                        response.delete_cookie("learning_auth_token", samesite="Lax")
                        return response
        except IntegrityError:
            form.add_error(None, account_copy("Diese E-Mail wird bereits verwendet."))
    from .views import build_base_context
    response = render(request, "registration/email_change_confirm.html", {
        **build_base_context(request), "valid_change": valid, "form": form,
    })
    response["Referrer-Policy"] = "no-referrer"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response
