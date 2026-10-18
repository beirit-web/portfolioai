from contextlib import contextmanager
from datetime import datetime, timedelta
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import clear_url_caches, resolve, reverse
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode

from pages.modules.tokens import email_verification_token_generator
from pages.models import Profile


PASSWORD = "fictional-original-password-123"
NEW_PASSWORD = "fictional-updated-password-456"


@contextmanager
def configured_auth_routes(**overrides):
    """Build the real URL patterns under custom settings without reloading global URLs."""
    with override_settings(**overrides):
        spec = importlib.util.spec_from_file_location(
            "config.authentication_forms_test_urls", Path(settings.BASE_DIR) / "config" / "urls.py",
        )
        urlconf = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(urlconf)
        with override_settings(ROOT_URLCONF=urlconf):
            clear_url_caches()
            try:
                yield
            finally:
                clear_url_caches()


@override_settings(
    LOGIN_REQUIRED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="noreply@example.test",
    SITE_URL="https://portfolio.example.test",
    ALLOWED_HOSTS=["testserver", "portfolio.example.test"],
    PASSWORD_RESET_DOMAIN="",
    PASSWORD_RESET_USE_HTTPS=None,
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    AUTH_PASSWORD_VALIDATORS=[{
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    }],
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class NativeAuthenticationFormTests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="portfolio.example.test")

    def make_user(self, *, active=True):
        user = get_user_model().objects.create_user(
            username="native-flow@example.test", email="native-flow@example.test",
            password=PASSWORD, is_active=active,
        )
        if not active:
            Profile.objects.create(user=user, email_verification_pending=True)
        return user

    def email_link(self):
        self.assertEqual(len(mail.outbox), 1)
        match = re.search(r'https?://[^\s<>\"]+', mail.outbox[0].body)
        self.assertIsNotNone(match, mail.outbox[0].body)
        return urlsplit(match.group())

    def assert_visible_errors(self, response, *fields):
        self.assertEqual(response.status_code, 200)
        form = response.context["form"]
        for field in fields:
            self.assertIn(field, form.errors)
            for message in form.errors[field]:
                self.assertContains(response, escape(str(message)))

    def request_reset(self, user):
        response = self.client.post(reverse("password_reset"), {"email": user.email})
        self.assertRedirects(response, reverse("password_reset_done"))
        self.assertEqual(mail.outbox[0].to, [user.email])
        return self.email_link()

    def open_reset_form(self, link):
        response = self.client.get(link.path, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.context["validlink"], True)
        self.assertContains(response, 'name="new_password1"')
        return response.wsgi_request.path

    def test_registration_email_activation_and_login_form_a_complete_flow(self):
        supplied_email = "Native-New@Example.Test"
        response = self.client.post(reverse("pages:register"), {
            "email": supplied_email, "password1": PASSWORD, "password2": PASSWORD,
            "privacy_consent": "on",
        })
        self.assertEqual(response.status_code, 302)
        user = get_user_model().objects.get(email=supplied_email.lower())
        self.assertFalse(user.is_active)
        self.assertTrue(user.profile.email_verification_pending)
        self.assertEqual(user.username, supplied_email.lower())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertIsNotNone(user.profile.privacy_consent_at)
        link = self.email_link()
        self.assertEqual(link.netloc, "portfolio.example.test")
        self.assertEqual(resolve(link.path).view_name, "pages:verify_email")

        blocked = self.client.post(reverse("pages:login"), {"username": supplied_email, "password": PASSWORD})
        self.assert_visible_errors(blocked, "__all__")
        self.assertNotIn("_auth_user_id", self.client.session)
        activated = self.client.get(link.path)
        self.assertEqual(activated.status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))

        self.client.logout()
        logged_in = self.client.post(reverse("pages:login"), {
            "username": supplied_email, "password": PASSWORD, "next": "/botanic/",
        })
        self.assertEqual(logged_in.status_code, 302)
        self.assertEqual(logged_in["Location"], "/botanic/")
        self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))
        self.assertTrue(self.client.session.get_expire_at_browser_close())
        self.client.logout()
        reused = self.client.get(link.path, follow=True)
        self.assertContains(reused, "ungültig oder abgelaufen")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_reset_email_link_changes_password_and_rejects_old_password_and_link(self):
        user = self.make_user()
        link = self.request_reset(user)
        self.assertEqual(resolve(link.path).view_name, "password_reset_confirm")
        form_path = self.open_reset_form(link)
        changed = self.client.post(form_path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
        self.assertRedirects(changed, reverse("password_reset_complete"))
        user.refresh_from_db()
        self.assertTrue(user.check_password(NEW_PASSWORD))
        self.assertFalse(user.check_password(PASSWORD))

        old_login = self.client.post(reverse("pages:login"), {"username": user.email, "password": PASSWORD})
        self.assert_visible_errors(old_login, "__all__")
        self.assertNotIn("_auth_user_id", self.client.session)
        reused = self.client.get(link.path, follow=True)
        self.assertIs(reused.context["validlink"], False)
        self.assertNotContains(reused, 'name="new_password1"')
        logged_in = self.client.post(reverse("pages:login"), {"username": user.email, "password": NEW_PASSWORD})
        self.assertEqual(logged_in.status_code, 302)
        self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))

    def test_registration_displays_field_errors_and_creates_no_account(self):
        response = self.client.post(reverse("pages:register"), {
            "email": "not-an-email", "password1": PASSWORD, "password2": NEW_PASSWORD,
        })
        self.assert_visible_errors(response, "email", "password2", "privacy_consent")
        self.assertContains(response, 'value="not-an-email"')
        self.assertNotContains(response, PASSWORD)
        self.assertFalse(get_user_model().objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_login_displays_invalid_email_and_incorrect_password_errors(self):
        user = self.make_user()
        for username, password, field in (
            ("not-an-email", PASSWORD, "username"),
            (user.email, NEW_PASSWORD, "__all__"),
        ):
            with self.subTest(field=field):
                response = self.client.post(reverse("pages:login"), {"username": username, "password": password})
                self.assert_visible_errors(response, field)
                self.assertNotContains(response, password)
                self.assertNotIn("_auth_user_id", self.client.session)

    def test_reset_request_displays_invalid_email_and_preserves_the_input(self):
        response = self.client.post(reverse("password_reset"), {"email": "not-an-email"})
        self.assert_visible_errors(response, "email")
        self.assertContains(response, 'value="not-an-email"')
        self.assertEqual(len(mail.outbox), 0)

    def test_unknown_reset_email_shows_the_same_confirmation_without_sending_mail(self):
        response = self.client.post(reverse("password_reset"), {"email": "missing-native@example.test"})
        self.assertRedirects(response, reverse("password_reset_done"))
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(get_user_model().objects.exists())

    def test_reset_confirmation_displays_mismatch_and_password_policy_errors(self):
        user = self.make_user()
        form_path = self.open_reset_form(self.request_reset(user))
        for password1, password2, field in (
            (NEW_PASSWORD, PASSWORD, "new_password2"),
            ("too-small", "too-small", "new_password2"),
        ):
            with self.subTest(field=field, password_length=len(password1)):
                response = self.client.post(form_path, {"new_password1": password1, "new_password2": password2})
                self.assert_visible_errors(response, field)
                self.assertIs(response.context["validlink"], True)
                self.assertNotContains(response, password1)
                user.refresh_from_db()
                self.assertTrue(user.check_password(PASSWORD))

    def test_invalid_and_expired_reset_links_show_a_new_link_action(self):
        user = self.make_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        issued_at = datetime(2026, 1, 1, 12)
        with patch.object(default_token_generator, "_now", return_value=issued_at):
            token = default_token_generator.make_token(user)
        expired_at = issued_at + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT + 1)
        for link_uid, link_token in ((uid, "invalid-token"), ("invalid-user", token), (uid, token)):
            with self.subTest(uid=link_uid, token=link_token), patch.object(default_token_generator, "_now", return_value=expired_at):
                path = reverse("password_reset_confirm", kwargs={"uidb64": link_uid, "token": link_token})
                response = self.client.get(path, follow=True)
                self.assertEqual(response.status_code, 200)
                self.assertIs(response.context["validlink"], False)
                self.assertContains(response, "Link ungültig")
                self.assertContains(response, f'href="{reverse("password_reset")}"')
                self.assertNotContains(response, 'name="new_password1"')
        user.refresh_from_db()
        self.assertTrue(user.check_password(PASSWORD))
        invalid_page = self.client.get(reverse("password_reset_invalid"))
        self.assertEqual(invalid_page.status_code, 200)
        self.assertContains(invalid_page, f'href="{reverse("password_reset")}"')

    def test_invalid_and_expired_activation_links_keep_the_account_inactive(self):
        user = self.make_user(active=False)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        issued_at = datetime(2026, 1, 1, 12)
        with patch.object(email_verification_token_generator, "_now", return_value=issued_at):
            token = email_verification_token_generator.make_token(user)
        expired_at = issued_at + timedelta(seconds=settings.EMAIL_VERIFICATION_TIMEOUT + 1)
        for link_uid, link_token in ((uid, "invalid-token"), ("invalid-user", token), (uid, token)):
            with self.subTest(uid=link_uid, token=link_token), patch.object(email_verification_token_generator, "_now", return_value=expired_at):
                response = self.client.get(reverse("pages:verify_email", kwargs={"uidb64": link_uid, "token": link_token}), follow=True)
                self.assertContains(response, "ungültig oder abgelaufen")
                self.assertNotIn("_auth_user_id", self.client.session)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_pending_account_can_request_and_use_a_replacement_activation_link(self):
        user = self.make_user(active=False)
        response = self.client.post(reverse("pages:verification_resend"), {"email": user.email.upper()})
        self.assertRedirects(response, f"{reverse('pages:verification_resend')}?sent=1")
        link = self.email_link()
        activated = self.client.get(link.path)
        self.assertEqual(activated.status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))

    def test_resend_does_not_reactivate_a_confirmed_account_disabled_later(self):
        user = self.make_user(active=False)
        self.client.post(reverse("pages:verification_resend"), {"email": user.email})
        self.client.get(self.email_link().path)
        self.client.logout()
        user.refresh_from_db()
        user.is_active = False
        user.save(update_fields=["is_active"])
        mail.outbox.clear()

        response = self.client.post(reverse("pages:verification_resend"), {"email": user.email})
        self.assertRedirects(response, f"{reverse('pages:verification_resend')}?sent=1")
        self.assertEqual(len(mail.outbox), 0)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_resend_is_neutral_for_unknown_active_and_unmarked_inactive_accounts(self):
        user = self.make_user()
        for address in ("unknown@example.test", user.email):
            with self.subTest(address=address):
                response = self.client.post(reverse("pages:verification_resend"), {"email": address})
                self.assertRedirects(response, f"{reverse('pages:verification_resend')}?sent=1")
                self.assertEqual(len(mail.outbox), 0)
        user.is_active = False
        user.save(update_fields=["is_active"])
        response = self.client.post(reverse("pages:verification_resend"), {"email": user.email})
        self.assertRedirects(response, f"{reverse('pages:verification_resend')}?sent=1")
        self.assertEqual(len(mail.outbox), 0)

    def test_valid_activation_token_cannot_activate_an_unmarked_disabled_account(self):
        user = self.make_user()
        user.is_active = False
        user.save(update_fields=["is_active"])
        Profile.objects.create(user=user)
        token = email_verification_token_generator.make_token(user)
        self.assertTrue(email_verification_token_generator.check_token(user, token))
        path = reverse("pages:verify_email", kwargs={
            "uidb64": urlsafe_base64_encode(force_bytes(user.pk)), "token": token,
        })
        response = self.client.get(path, follow=True)
        self.assertContains(response, "ungültig oder abgelaufen")
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_failed_replacement_email_keeps_the_pending_account_and_neutral_response(self):
        user = self.make_user(active=False)
        with patch("pages.verification.send_account_verification_email", return_value=False):
            response = self.client.post(reverse("pages:verification_resend"), {"email": user.email})
        self.assertRedirects(response, f"{reverse('pages:verification_resend')}?sent=1")
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertTrue(user.profile.email_verification_pending)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(PASSWORD_RESET_DOMAIN="recovery.example.test", PASSWORD_RESET_USE_HTTPS=True)
    def test_reset_email_honors_configured_domain_and_https(self):
        link = self.request_reset(self.make_user())
        self.assertEqual(link.scheme, "https")
        self.assertEqual(link.netloc, "recovery.example.test")

    def test_custom_auth_and_reset_routes_support_the_complete_reset_flow(self):
        user = self.make_user()
        with configured_auth_routes(
            AUTH_URL_PREFIX="members/",
            PASSWORD_RESET_URL="members/recover/",
            PASSWORD_RESET_DONE_URL="members/recover/sent/",
            PASSWORD_RESET_CONFIRM_PREFIX="members/confirm/",
            PASSWORD_RESET_COMPLETE_URL="members/recovered/",
            PASSWORD_RESET_INVALID_URL="members/invalid/",
        ):
            self.assertEqual(reverse("login"), "/members/login/")
            self.assertEqual(reverse("password_reset"), "/members/recover/")
            self.assertEqual(reverse("password_reset_done"), "/members/recover/sent/")
            self.assertEqual(reverse("password_reset_complete"), "/members/recovered/")
            self.assertEqual(reverse("password_reset_invalid"), "/members/invalid/")
            login_page = self.client.get(reverse("login"))
            self.assertEqual(login_page.status_code, 200)
            self.assertContains(login_page, 'href="/members/recover/"')
            link = self.request_reset(user)
            self.assertTrue(link.path.startswith("/members/confirm/"))
            form_path = self.open_reset_form(link)
            changed = self.client.post(form_path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
            self.assertRedirects(changed, "/members/recovered/")
            logged_in = self.client.post(reverse("login"), {"username": user.email, "password": NEW_PASSWORD})
            self.assertEqual(logged_in.status_code, 302)
            self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))


class AccountEmailSettingsTests(SimpleTestCase):
    def mail_settings(self, opt_in=None):
        probe = """
import json
from unittest.mock import patch
with patch('dotenv.load_dotenv'), patch('smtplib.SMTP') as smtp, patch('smtplib.SMTP_SSL') as smtp_ssl:
    import config.settings as configured
    result = {name: getattr(configured, name) for name in (
        'ACCOUNT_EMAIL_DELIVERY_ENABLED', 'EMAIL_BACKEND', 'EMAIL_HOST',
        'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'DEFAULT_FROM_EMAIL',
    )}
    smtp.assert_not_called()
    smtp_ssl.assert_not_called()
print(json.dumps(result))
"""
        with TemporaryDirectory(prefix="beirit-mail-settings-") as directory:
            environment = {
                "DJANGO_ENV": "local",
                "DJANGO_DEBUG": "true",
                "DJANGO_SECRET_KEY": "fictional-mail-settings-secret",
                "DJANGO_ALLOWED_HOSTS": "testserver,portfolio.example.test",
                "CSRF_TRUSTED_ORIGINS": "https://portfolio.example.test",
                "SITE_URL": "https://portfolio.example.test",
                "DB_PATH": f"{directory}/db.sqlite3",
                "DB_BACKUP_PATH": f"{directory}/backups",
                "MEDIA_ROOT": f"{directory}/media",
                "STATIC_ROOT": f"{directory}/static",
                "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
                "EMAIL_HOST": "smtp.example.test",
                "EMAIL_HOST_USER": "sample-smtp@example.test",
                "EMAIL_HOST_PASSWORD": "fictional-smtp-password",
                "DEFAULT_FROM_EMAIL": "accounts@example.test",
            }
            if opt_in is not None:
                environment["ACCOUNT_EMAIL_DELIVERY_ENABLED"] = opt_in
            result = subprocess.run(
                [sys.executable, "-c", probe], cwd=settings.BASE_DIR,
                env=environment, capture_output=True, text=True, check=True,
            )
        return json.loads(result.stdout)

    def test_old_smtp_configuration_stays_disabled_without_an_explicit_opt_in(self):
        for opt_in in (None, "false"):
            with self.subTest(opt_in=opt_in):
                configured = self.mail_settings(opt_in)
                self.assertIs(configured["ACCOUNT_EMAIL_DELIVERY_ENABLED"], False)
                self.assertEqual(configured["EMAIL_BACKEND"], "django.core.mail.backends.console.EmailBackend")
                for field in ("EMAIL_HOST", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD"):
                    self.assertEqual(configured[field], "")
                self.assertEqual(configured["DEFAULT_FROM_EMAIL"], "noreply@example.com")

    def test_explicit_opt_in_preserves_the_fictional_smtp_configuration(self):
        configured = self.mail_settings("true")
        self.assertIs(configured["ACCOUNT_EMAIL_DELIVERY_ENABLED"], True)
        self.assertEqual(configured["EMAIL_BACKEND"], "django.core.mail.backends.smtp.EmailBackend")
        self.assertEqual(configured["EMAIL_HOST"], "smtp.example.test")
        self.assertEqual(configured["EMAIL_HOST_USER"], "sample-smtp@example.test")
        self.assertEqual(configured["EMAIL_HOST_PASSWORD"], "fictional-smtp-password")
        self.assertEqual(configured["DEFAULT_FROM_EMAIL"], "accounts@example.test")
