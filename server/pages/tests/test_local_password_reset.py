"""Local recovery keeps its short-lived token out of email and other browsers."""

from datetime import datetime, timezone as datetime_timezone
from unittest.mock import patch
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.views import INTERNAL_RESET_SESSION_TOKEN
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from pages.account_views import RETURN_SESSION_KEY
from pages.local_password_reset import SESSION_KEY, local_token_generator


PASSWORD = "Fictional-local-recovery-42!"
NEW_PASSWORD = "Fictional-updated-recovery-73!"


@override_settings(
    DEBUG=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=True,
    ACCOUNT_EMAIL_DELIVERY_ENABLED=False, LOGIN_REQUIRED=False,
    EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    SITE_URL="http://localhost:8000",
    ALLOWED_HOSTS=["localhost", "127.0.0.1", "[::1]", "testserver", "portfolio.example.test"],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    AUTH_PASSWORD_VALIDATORS=[{
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    }],
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class LocalPasswordResetTests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="localhost")
        self.user = get_user_model().objects.create_user(
            username="local-recovery@example.test", email="local-recovery@example.test", password=PASSWORD,
        )

    def request_reset(self, *, email=None, next_url=None):
        payload = {"email": email or self.user.email}
        if next_url is not None:
            payload["next"] = next_url
        with patch("pages.account_views.AccountPasswordResetForm.save") as send_mail:
            response = self.client.post(reverse("password_reset"), payload)
        send_mail.assert_not_called()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("password_reset_done"))
        return dict(self.client.session[SESSION_KEY])

    def confirm_url(self, challenge, *, raw_token=False):
        return reverse("password_reset_confirm", kwargs={
            "uidb64": challenge["uidb64"], "token": challenge["token"] if raw_token else "set-password",
        })

    def open_form(self):
        response = self.client.post(reverse("password_reset_done"))
        self.assertEqual(response.status_code, 302)
        page = self.client.get(response["Location"])
        self.assertTrue(page.context["validlink"])
        return response["Location"]

    def test_local_token_changes_password_once_without_mail_token_urls_or_login(self):
        page = self.client.get(reverse("password_reset"))
        self.assertContains(page, "Es wird keine E-Mail verschickt")
        challenge = self.request_reset(next_url="/wohnungssuche/login")
        self.assertTrue(local_token_generator.check_token(self.user, challenge["token"]))
        self.assertFalse(default_token_generator.check_token(self.user, challenge["token"]))
        message = self.client.get(reverse("password_reset_done"))
        self.assertContains(message, challenge["token"])
        self.assertNotContains(message, self.user.email)
        self.assertIn("no-store", message["Cache-Control"])
        path = self.open_form()
        self.assertNotIn(challenge["token"], path)
        self.assertTrue(path.endswith("/set-password/"))
        changed = self.client.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
        self.assertRedirects(changed, reverse("password_reset_complete") + "?" + urlencode({"next": "/wohnungssuche/login"}))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertNotIn(INTERNAL_RESET_SESSION_TOKEN, self.client.session)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertContains(self.client.get(reverse("password_reset_complete")), 'href="/wohnungssuche/login"')
        self.assertNotContains(self.client.get(reverse("password_reset_done")), challenge["token"])
        self.assertFalse(self.client.get(path).context["validlink"])
        self.assertFalse(self.client.get(self.confirm_url(challenge, raw_token=True)).context["validlink"])

    def test_other_browser_cannot_see_or_use_the_token(self):
        challenge = self.request_reset()
        other = Client(HTTP_HOST="localhost")
        self.assertNotContains(other.get(reverse("password_reset_done")), challenge["token"])
        for raw_token in (False, True):
            response = other.get(self.confirm_url(challenge, raw_token=raw_token))
            self.assertFalse(response.context["validlink"])
        self.assertRedirects(other.post(reverse("password_reset_done")), reverse("password_reset_invalid"))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_authenticated_reset_keeps_the_return_destination_after_session_invalidation(self):
        logged_in = self.client.post(reverse("pages:login"), {
            "username": self.user.email, "password": PASSWORD,
        })
        self.assertEqual(logged_in.status_code, 302)
        self.assertEqual(str(self.client.session["_auth_user_id"]), str(self.user.pk))
        self.request_reset(next_url="/wohnungssuche/login")
        path = self.open_form()
        changed = self.client.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
        complete_url = reverse("password_reset_complete") + "?" + urlencode({"next": "/wohnungssuche/login"})
        self.assertEqual(changed.status_code, 302)
        self.assertEqual(changed["Location"], complete_url)
        complete = self.client.get(complete_url)
        self.assertContains(complete, 'href="/wohnungssuche/login"')
        self.assertEqual(complete.context["account_login_url"], "/wohnungssuche/login")
        self.assertNotIn("_auth_user_id", self.client.session)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_token_expires_at_ten_minutes_even_when_password_form_is_already_open(self):
        challenge = self.request_reset()
        path = self.open_form()
        expires = datetime.fromtimestamp(challenge["expires_at"], tz=datetime_timezone.utc)
        with patch("pages.local_password_reset.timezone.now", return_value=expires):
            invalid = self.client.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
            self.assertFalse(invalid.context["validlink"])
            self.assertNotContains(self.client.get(reverse("password_reset_done")), challenge["token"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertNotIn(INTERNAL_RESET_SESSION_TOKEN, self.client.session)

    def test_unknown_inactive_and_unusable_accounts_get_a_neutral_message(self):
        inactive = get_user_model().objects.create_user(
            username="inactive-recovery", email="inactive-recovery@example.test", password=PASSWORD, is_active=False,
        )
        unusable = get_user_model().objects.create_user(
            username="unusable-recovery", email="unusable-recovery@example.test", password=None,
        )
        for email in ("missing-recovery@example.test", inactive.email, unusable.email):
            with self.subTest(email=email):
                challenge = self.request_reset(email=email)
                self.assertIsNone(challenge["user_id"])
                page = self.client.get(reverse("password_reset_done"))
                self.assertContains(page, "Wenn ein aktives Konto mit dieser E-Mail existiert")
                self.assertContains(page, "Token verwenden und Passwort setzen")
                self.assertContains(page, challenge["token"])
                self.assertNotContains(page, email)
                self.assertRedirects(self.client.post(reverse("password_reset_done")), reverse("password_reset_invalid"))
        self.assertEqual(get_user_model().objects.count(), 3)
        inactive.refresh_from_db()
        self.assertFalse(inactive.is_active)

    def test_explicit_local_settings_loopback_host_and_address_are_required(self):
        for overrides, headers in (
            ({"DEBUG": False}, {}),
            ({"LOCAL_ACCOUNT_ACTIVATION_ENABLED": False}, {}),
            ({"ACCOUNT_EMAIL_DELIVERY_ENABLED": True}, {}),
            ({"EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend"}, {}),
            ({}, {"HTTP_HOST": "portfolio.example.test"}),
            ({}, {"REMOTE_ADDR": "192.0.2.1", "HTTP_X_FORWARDED_FOR": "127.0.0.1"}),
        ):
            with self.subTest(overrides=overrides, headers=headers):
                challenge = self.request_reset()
                path = self.open_form()
                with override_settings(**overrides):
                    self.assertFalse(self.client.get(path, **headers).context["validlink"])
                    self.assertNotContains(self.client.get(reverse("password_reset_done"), **headers), challenge["token"])
                    self.assertEqual(self.client.post(reverse("password_reset_done"), **headers).status_code, 405)
                    self.assertFalse(self.client.get(self.confirm_url(challenge, raw_token=True), **headers).context["validlink"])

    def test_login_destination_is_preserved_and_only_allows_known_relative_logins(self):
        for candidate, expected in (
            ("/wohnungssuche/login", "/wohnungssuche/login"),
            ("/wohnungssuche/login/", "/wohnungssuche/login"),
            ("https://external.example.test/login", reverse("pages:login")),
            ("//external.example.test/login", reverse("pages:login")),
            ("/admin/", reverse("pages:login")),
            ('/wohnungssuche/login\" autofocus onfocus=\"alert(1)', reverse("pages:login")),
            (None, reverse("pages:login")),
        ):
            with self.subTest(candidate=candidate):
                params = "?" + urlencode({"next": candidate}) if candidate else ""
                start = self.client.get(reverse("password_reset") + params)
                self.assertContains(start, f'name="next" value="{expected}"')
                self.request_reset(next_url=candidate)
                self.assertEqual(self.client.session[RETURN_SESSION_KEY], expected)
                done = self.client.get(reverse("password_reset_done"))
                self.assertContains(done, f'href="{expected}"')
                self.assertEqual(done.context["account_login_url"], expected)

    def test_reset_request_and_token_use_require_csrf(self):
        self.request_reset()
        strict = Client(enforce_csrf_checks=True, HTTP_HOST="localhost")
        strict.cookies = self.client.cookies
        self.assertEqual(strict.post(reverse("password_reset"), {"email": self.user.email}).status_code, 403)
        self.assertEqual(strict.post(reverse("password_reset_done")).status_code, 403)
        path = self.open_form()
        strict.cookies = self.client.cookies
        self.assertEqual(strict.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD}).status_code, 403)

    def test_password_policy_errors_keep_the_token_usable(self):
        self.request_reset()
        path = self.open_form()
        invalid = self.client.post(path, {"new_password1": "short", "new_password2": "short"})
        self.assertTrue(invalid.context["validlink"])
        self.assertIn("new_password2", invalid.context["form"].errors)
        changed = self.client.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
        self.assertRedirects(changed, reverse("password_reset_complete"))

    def test_deactivated_account_cannot_use_an_already_issued_token(self):
        self.request_reset()
        path = self.open_form()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(path, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
        self.assertFalse(response.context["validlink"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_ipv4_and_ipv6_loopback_are_supported(self):
        for host, address in (("127.0.0.1:8000", "127.0.0.1"), ("[::1]:8000", "::1")):
            with self.subTest(host=host):
                client = Client(HTTP_HOST=host, REMOTE_ADDR=address)
                with patch("pages.account_views.AccountPasswordResetForm.save") as send_mail:
                    response = client.post(reverse("password_reset"), {"email": self.user.email})
                self.assertEqual(response.status_code, 302)
                send_mail.assert_not_called()
                self.assertIn(SESSION_KEY, client.session)
