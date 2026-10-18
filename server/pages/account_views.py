"""Shared password recovery forms for all portfolio accounts."""

from urllib.parse import urlsplit

from django import forms
from django.conf import settings
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache


class AccountPasswordResetForm(PasswordResetForm):
    email = forms.EmailField(
        label="E-Mail-Adresse", max_length=254,
        widget=forms.EmailInput(attrs={
            "autocomplete": "email", "autocapitalize": "none",
            "spellcheck": "false", "class": "auth-input", "autofocus": True,
        }),
    )


class AccountSetPasswordForm(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name in ("new_password1", "new_password2"):
            self.fields[name].widget.attrs.update({
                "autocomplete": "new-password", "class": "auth-input",
            })


class AccountContextMixin:
    def get_context_data(self, **kwargs):
        from .views import build_base_context

        context = super().get_context_data(**kwargs)
        context.update(build_base_context(self.request))
        context["account_mail_is_console"] = settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend"
        return context

    def render_to_response(self, context, **response_kwargs):
        response = super().render_to_response(context, **response_kwargs)
        response["X-Robots-Tag"] = "noindex, follow"
        return response


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetView(AccountContextMixin, auth_views.PasswordResetView):
    form_class = AccountPasswordResetForm

    def form_valid(self, form):
        use_https = settings.PASSWORD_RESET_USE_HTTPS
        form.save(
            use_https=self.request.is_secure() if use_https is None else use_https,
            domain_override=settings.PASSWORD_RESET_DOMAIN or urlsplit(settings.SITE_URL).netloc or self.request.get_host(),
            token_generator=self.token_generator,
            from_email=settings.DEFAULT_FROM_EMAIL,
            email_template_name=settings.PASSWORD_RESET_EMAIL_TEMPLATE_NAME,
            subject_template_name=settings.PASSWORD_RESET_SUBJECT_TEMPLATE_NAME,
            request=self.request,
        )
        return HttpResponseRedirect(self.get_success_url())


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetDoneView(AccountContextMixin, auth_views.PasswordResetDoneView):
    pass


class AccountPasswordResetConfirmView(AccountContextMixin, auth_views.PasswordResetConfirmView):
    form_class = AccountSetPasswordForm


@method_decorator(never_cache, name="dispatch")
class AccountPasswordResetCompleteView(AccountContextMixin, auth_views.PasswordResetCompleteView):
    pass
