"""Shared password recovery forms for all portfolio accounts."""

from .account_i18n import account_text_lazy as account_copy
from .account_projects import project_account_context, recovery_login_url

from datetime import datetime, timezone as datetime_timezone
from urllib.parse import urlencode, urlsplit

from django import forms
from django.conf import settings
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.http import HttpResponseNotAllowed, HttpResponseRedirect
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView

from .local_activation import local_activation_enabled
from .local_password_reset import (
    clear_local_password_reset, issue_local_password_reset,
    local_password_reset_user, local_token_generator, pending_local_password_reset,
)


RETURN_SESSION_KEY = "password_reset_return_to"


def password_reset_return_to(request, *, from_session=True):
    candidate = request.POST.get("next") or request.GET.get("next")
    if not candidate and from_session:
        candidate = request.session.get(RETURN_SESSION_KEY)
    return recovery_login_url(candidate)


def password_reset_request_url(login_url):
    url = reverse("password_reset")
    if login_url != reverse("pages:login"):
        url += "?" + urlencode({"next": login_url})
    return url


class AccountPasswordResetForm(PasswordResetForm):
    email = forms.EmailField(
        label=account_copy("E-Mail-Adresse"), max_length=254,
        widget=forms.EmailInput(attrs={
            "autocomplete": "email", "autocapitalize": "none",
            "spellcheck": "false", "class": "auth-input", "autofocus": True,
            "placeholder": "name@example.com",
        }),
    )


class AccountSetPasswordForm(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name in ("new_password1", "new_password2"):
            self.fields[name].widget.attrs.update({
                "autocomplete": "new-password", "class": "auth-input",
                "placeholder": account_copy("Neues Passwort" if name == "new_password1" else "Passwort wiederholen"),
            })


class AccountContextMixin:
    def get_context_data(self, **kwargs):
        from .views import build_base_context

        context = super().get_context_data(**kwargs)
        context.update(build_base_context(self.request))
        context["account_mail_is_console"] = settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend"
        context["local_activation_available"] = local_activation_enabled(self.request)
        context["local_password_reset_available"] = context["local_activation_available"]
        context["account_login_url"] = password_reset_return_to(
            self.request, from_session=not isinstance(self, AccountPasswordResetView),
        )
        context.update(project_account_context(self.request, target=context["account_login_url"]))
        context["account_password_reset_url"] = password_reset_request_url(context["account_login_url"])
        return context

    def render_to_response(self, context, **response_kwargs):
        response = super().render_to_response(context, **response_kwargs)
        response["X-Robots-Tag"] = "noindex, follow"
        return response


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetView(AccountContextMixin, auth_views.PasswordResetView):
    form_class = AccountPasswordResetForm

    def form_valid(self, form):
        self.request.session[RETURN_SESSION_KEY] = password_reset_return_to(self.request, from_session=False)
        if local_activation_enabled(self.request):
            # Do not send even a console email: this browser owns its example
            # message, and no recovery token is written to server-wide logs.
            issue_local_password_reset(self.request, form)
            return HttpResponseRedirect(self.get_success_url())
        use_https = settings.PASSWORD_RESET_USE_HTTPS
        form.save(
            use_https=self.request.is_secure() if use_https is None else use_https,
            domain_override=settings.PASSWORD_RESET_DOMAIN or urlsplit(settings.SITE_URL).netloc or self.request.get_host(),
            token_generator=self.token_generator,
            from_email=settings.DEFAULT_FROM_EMAIL,
            email_template_name=settings.PASSWORD_RESET_EMAIL_TEMPLATE_NAME,
            subject_template_name=settings.PASSWORD_RESET_SUBJECT_TEMPLATE_NAME,
            request=self.request,
            extra_email_context={"account_reset_return_to": self.request.session[RETURN_SESSION_KEY]},
        )
        return HttpResponseRedirect(self.get_success_url())


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetDoneView(AccountContextMixin, auth_views.PasswordResetDoneView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        challenge = pending_local_password_reset(self.request)
        if challenge:
            context.update({
                "local_password_reset_token": challenge["token"],
                "local_password_reset_expires_at": datetime.fromtimestamp(
                    challenge["expires_at"], tz=datetime_timezone.utc,
                ),
            })
        return context

    def post(self, request, *args, **kwargs):
        if not local_activation_enabled(request):
            return HttpResponseNotAllowed(["GET"])
        challenge = pending_local_password_reset(request)
        if local_password_reset_user(challenge) is None:
            return HttpResponseRedirect(reverse("password_reset_invalid"))
        # Django's confirmation view already understands the token held in the
        # session. Never place the real token in a URL or an access log.
        request.session[auth_views.INTERNAL_RESET_SESSION_TOKEN] = challenge["token"]
        return HttpResponseRedirect(reverse("password_reset_confirm", kwargs={
            "uidb64": challenge["uidb64"], "token": auth_views.PasswordResetConfirmView.reset_url_token,
        }))


class AccountPasswordResetConfirmView(AccountContextMixin, auth_views.PasswordResetConfirmView):
    form_class = AccountSetPasswordForm

    def get_success_url(self):
        url = super().get_success_url()
        login_url = password_reset_return_to(self.request)
        if login_url != reverse("pages:login"):
            # Password changes invalidate an existing authenticated session on
            # the next request. Carry this allowlisted destination explicitly so
            # the completion page still links to the originating login screen.
            separator = "&" if "?" in url else "?"
            url += separator + urlencode({"next": login_url})
        return url

    def dispatch(self, request, *args, **kwargs):
        if "next" in request.GET:
            request.session[RETURN_SESSION_KEY] = password_reset_return_to(request, from_session=False)
        self.local_reset_challenge = None
        challenge = pending_local_password_reset(request)
        if (
            challenge and challenge["uidb64"] == kwargs.get("uidb64")
            and local_password_reset_user(challenge) is not None
            and (
                kwargs.get("token") == challenge["token"]
                or (
                    kwargs.get("token") == self.reset_url_token
                    and request.session.get(auth_views.INTERNAL_RESET_SESSION_TOKEN) == challenge["token"]
                )
            )
        ):
            self.token_generator = local_token_generator
            self.local_reset_challenge = challenge
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.local_reset_challenge:
            clear_local_password_reset(self.request)
        return response


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetCompleteView(AccountContextMixin, auth_views.PasswordResetCompleteView):
    pass


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetInvalidView(AccountContextMixin, TemplateView):
    template_name = "registration/password_reset_invalid.html"
