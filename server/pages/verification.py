"""Shared first-account confirmation and public replacement-email form."""

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.views.decorators.cache import never_cache
from django.views.generic.edit import FormView

from .account_views import AccountContextMixin, AccountPasswordResetForm
from .models import Profile
from .modules.mail import send_account_verification_email
from .modules.tokens import email_verification_token_generator
from .local_activation import issue_local_activation, local_activation_enabled, pending_local_activation


def account_email_delivery_mode(request=None):
    if request is not None and local_activation_enabled(request):
        return "local"
    return "console" if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend" else "email"


def pending_account_for_credentials(identifier, password):
    if not isinstance(identifier, str) or not isinstance(password, str):
        return None
    User = get_user_model()
    identifier = User.normalize_username(identifier.strip())
    users = list(User.objects.filter(
        Q(username__iexact=identifier) | Q(email__iexact=identifier),
    )[:2]) if identifier else []
    if len(users) != 1:
        return None
    user = users[0]
    if (not user.is_active
            and Profile.objects.filter(user=user, email_verification_pending=True).exists()
            and user.check_password(password)):
        return user
    return None


def build_email_verification_url(user, *, next_url=""):
    path = reverse("pages:verify_email", kwargs={
        "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": email_verification_token_generator.make_token(user),
    })
    verification_url = f"{settings.SITE_URL.rstrip('/')}{path}"
    return f"{verification_url}?{urlencode({'next': next_url})}" if next_url else verification_url


def send_pending_account_verification(user, *, next_url="", request=None):
    """Mark a new inactive account pending; caller rolls back on delivery failure."""
    if user.is_active:
        raise ValueError("Only new inactive accounts can await first email confirmation.")
    Profile.objects.update_or_create(user=user, defaults={"email_verification_pending": True})
    if request is not None and local_activation_enabled(request):
        issue_local_activation(request, user, next_url=next_url)
        return True
    return send_account_verification_email(user, build_email_verification_url(user, next_url=next_url))


@method_decorator(never_cache, name="dispatch")
class AccountVerificationResendView(AccountContextMixin, FormView):
    template_name = "registration/email_verification_resend.html"
    form_class = AccountPasswordResetForm

    def get_next_url(self):
        from .views import get_safe_login_redirect

        if self.request.POST.get("next") or self.request.GET.get("next"):
            return get_safe_login_redirect(self.request)
        return ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["verification_sent"] = self.request.GET.get("sent") == "1"
        context["verification_next"] = self.get_next_url()
        return context

    def form_valid(self, form):
        pending = pending_local_activation(self.request)
        if local_activation_enabled(self.request):
            if pending and pending[0].email.casefold() == form.cleaned_data["email"].casefold():
                issue_local_activation(self.request, pending[0], next_url=self.get_next_url() or pending[1]["next_url"])
            return super().form_valid(form)
        users = list(get_user_model().objects.filter(
            email__iexact=form.cleaned_data["email"], is_active=False,
            profile__email_verification_pending=True,
        )[:2])
        if len(users) == 1:
            user = users[0]
            send_account_verification_email(user, build_email_verification_url(user, next_url=self.get_next_url()))
        # Neither the address nor the delivery result is exposed in the response.
        return super().form_valid(form)

    def get_success_url(self):
        params = {"sent": "1"}
        next_url = self.get_next_url()
        if next_url:
            params["next"] = next_url
        return f"{reverse('pages:verification_resend')}?{urlencode(params)}"
