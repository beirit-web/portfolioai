"""The browser mailbox activates a persisted local account without signing it in."""

from datetime import datetime, timedelta, timezone as datetime_timezone
from io import BytesIO
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from PIL import Image
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from pages.local_activation import SESSION_KEY
from pages.models import LoginAttemptBucket, Profile


PASSWORD = "Fictional-local-account-42!"


@override_settings(
    DEBUG=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=True,
    ACCOUNT_EMAIL_DELIVERY_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    SITE_URL="http://localhost:8000", LOGIN_REQUIRED=False,
    ALLOWED_HOSTS=["localhost", "127.0.0.1", "portfolio.example.test", "testserver"],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class LocalActivationTests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="localhost")

    def register(self, **extra):
        response = self.client.post(reverse("pages:register"), {
            "email": "local-account@example.test", "password1": PASSWORD,
            "password2": PASSWORD, "privacy_consent": "on", **extra,
        })
        self.assertEqual(response.status_code, 302)
        user = get_user_model().objects.get(email="local-account@example.test")
        return user, response

    def activate(self, code=None, **extra):
        return self.client.post(reverse("pages:login"), {
            "action": "activate_local", "username": "local-account@example.test",
            "activation_code": code or self.client.session[SESSION_KEY]["code"], **extra,
        })

    def test_registration_persists_hashed_password_and_image_then_unlocks_login(self):
        image = BytesIO()
        Image.new("RGB", (2, 2), "green").save(image, format="PNG")
        user, registered = self.register(image=SimpleUploadedFile("profile.png", image.getvalue(), content_type="image/png"), next="/profil/")
        self.assertFalse(user.is_active)
        self.assertNotEqual(user.password, PASSWORD)
        self.assertTrue(user.check_password(PASSWORD))
        self.assertEqual(bytes(user.profile.image_data), image.getvalue())
        self.assertTrue(user.profile.email_verification_pending)
        login_page = self.client.get(registered["Location"])
        self.assertContains(login_page, 'disabled aria-describedby="activation-login-hint"')
        self.assertContains(login_page, 'aria-label="Konto aktivieren"')
        mailbox = self.client.get(reverse("pages:example_mail"))
        code = self.client.session[SESSION_KEY]["code"]
        self.assertRegex(code, r"^[0-9]{6}$")
        self.assertContains(mailbox, code)
        self.assertIn("no-store", mailbox["Cache-Control"])
        self.assertEqual(mailbox["X-Robots-Tag"], "noindex, nofollow")

        activated = self.activate(next="/profil/")
        self.assertEqual(activated.status_code, 302)
        self.assertNotIn("_auth_user_id", self.client.session)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        self.assertNotIn(SESSION_KEY, self.client.session)
        unlocked = self.client.get(activated["Location"])
        self.assertNotContains(unlocked, 'disabled aria-describedby="activation-login-hint"')
        self.assertNotContains(self.client.get(reverse("pages:example_mail")), code)
        other_browser = Client(HTTP_HOST="localhost")
        logged_in = other_browser.post(reverse("pages:login"), {
            "username": user.email, "password": PASSWORD, "next": "/profil/",
        })
        self.assertRedirects(logged_in, "/profil/")
        self.assertEqual(str(other_browser.session["_auth_user_id"]), str(user.pk))

    def test_mailbox_is_bound_to_the_registration_browser(self):
        user, _ = self.register()
        code = self.client.session[SESSION_KEY]["code"]
        other = Client(HTTP_HOST="localhost")
        self.assertNotContains(other.get(reverse("pages:example_mail")), code)
        self.assertNotContains(other.get(reverse("pages:example_mail")), user.email)
        other.post(reverse("pages:login"), {"action": "activate_local", "activation_code": code})
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertNotIn("_auth_user_id", other.session)

    def test_code_expires_at_exactly_one_minute_and_can_be_replaced(self):
        user, _ = self.register()
        original = dict(self.client.session[SESSION_KEY])
        expires = datetime.fromtimestamp(original["expires_at"], tz=datetime_timezone.utc)
        with patch("pages.local_activation.timezone.now", return_value=expires):
            response = self.activate(original["code"])
            self.assertContains(response, "Aktivierungscode ist abgelaufen")
            self.assertNotContains(self.client.get(reverse("pages:example_mail")), original["code"])
            user.refresh_from_db()
            self.assertFalse(user.is_active)
            self.client.post(reverse("pages:example_mail"))
        renewed = self.client.session[SESSION_KEY]
        self.assertEqual(renewed["expires_at"], original["expires_at"] + 60)
        wrong = "000000" if renewed["code"] != "000000" else "000001"
        self.assertContains(self.activate(wrong), "Aktivierungscode ist ungültig")
        self.assertEqual(self.activate(renewed["code"]).status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.client.post(reverse("pages:login"), {"action": "activate_local", "activation_code": renewed["code"]})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_wrong_code_does_not_activate_an_account(self):
        user, _ = self.register()
        code = self.client.session[SESSION_KEY]["code"]
        wrong = "000000" if code != "000000" else "000001"
        for _ in range(5):
            self.activate(wrong)
        self.assertEqual(self.client.session[SESSION_KEY]["code"], "")
        self.assertContains(self.activate(code), "Aktivierungscode ist abgelaufen")
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.client.post(reverse("pages:example_mail"))
        self.assertEqual(self.activate().status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_malformed_codes_do_not_exhaust_the_password_login_budget(self):
        user, _ = self.register()
        native_paths = (reverse("pages:login"), f"/{settings.AUTH_URL_PREFIX.strip('/')}/login/")
        for path in native_paths:
            for _ in range(6):
                with self.subTest(path=path):
                    response = self.client.post(path, {
                        "action": "activate_local", "username": user.email,
                        "activation_code": "abcdef",
                    })
                    self.assertEqual(response.status_code, 200)
                    self.assertIn("activation_code", response.context["activation_form"].errors)
        self.assertFalse(LoginAttemptBucket.objects.exists())
        self.assertEqual(self.client.session[SESSION_KEY]["attempts"], 0)
        self.assertEqual(self.activate().status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_expired_code_retries_can_be_renewed_without_password_lockout(self):
        user, _ = self.register()
        original = self.client.session[SESSION_KEY]
        expires = datetime.fromtimestamp(original["expires_at"], tz=datetime_timezone.utc)
        with patch("pages.local_activation.timezone.now", return_value=expires):
            for _ in range(6):
                self.assertContains(self.activate(original["code"]), "Aktivierungscode ist abgelaufen")
            self.assertFalse(LoginAttemptBucket.objects.exists())
            self.assertEqual(self.client.post(reverse("pages:example_mail")).status_code, 302)
        self.assertEqual(self.activate().status_code, 302)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_cancelling_activation_does_not_consume_the_empty_login_budget(self):
        self.register()
        for path in (reverse("pages:login"), f"/{settings.AUTH_URL_PREFIX.strip('/')}/login/"):
            for _ in range(6):
                with self.subTest(path=path):
                    cancelled = self.client.post(path, {"action": "cancel_local_activation"})
                    self.assertEqual(cancelled.status_code, 302)
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertFalse(LoginAttemptBucket.objects.exists())

    def test_local_mode_keeps_the_shared_password_login_budget(self):
        user = get_user_model().objects.create_user(
            username="local-active", email="local-active@example.test", password=PASSWORD,
        )
        native_paths = (reverse("pages:login"), f"/{settings.AUTH_URL_PREFIX.strip('/')}/login/")
        for index in range(5):
            response = self.client.post(native_paths[index % 2], {
                "username": user.email, "password": "fictional-wrong-password",
            })
            self.assertEqual(response.status_code, 200)
        for path in native_paths:
            blocked = self.client.post(path, {"username": user.email, "password": PASSWORD})
            self.assertEqual(blocked.status_code, 429)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_local_action_names_do_not_bypass_api_password_limits(self):
        user = get_user_model().objects.create_user(
            username="local-api-active", email="local-api-active@example.test", password=PASSWORD,
        )
        for index in range(5):
            response = self.client.post(reverse("pages:housing_token_auth_api"), {
                "action": "activate_local" if index % 2 else "cancel_local_activation",
                "username": user.email, "password": "fictional-wrong-password",
            }, content_type="application/json")
            self.assertEqual(response.status_code, 400)
        blocked = self.client.post(reverse("pages:housing_token_auth_api"), {
            "action": "activate_local", "username": user.email, "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(blocked.status_code, 429)

    def test_existing_pending_account_can_enter_the_local_flow_with_its_password(self):
        user, _ = self.register()
        self.client = Client(HTTP_HOST="localhost")
        response = self.client.post(reverse("pages:login"), {"username": user.email, "password": PASSWORD})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.client.session[SESSION_KEY]["user_id"], user.pk)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_disabled_accounts_are_not_reactivated(self):
        user, _ = self.register()
        Profile.objects.filter(user=user).update(email_verification_pending=False)
        self.activate(self.client.session[SESSION_KEY]["code"])
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertNotIn(SESSION_KEY, self.client.session)

    def test_mailbox_is_unavailable_outside_explicit_local_demo_settings(self):
        self.register()
        for overrides, headers in (
            ({"DEBUG": False}, {}),
            ({"LOCAL_ACCOUNT_ACTIVATION_ENABLED": False}, {}),
            ({"ACCOUNT_EMAIL_DELIVERY_ENABLED": True}, {}),
            ({}, {"REMOTE_ADDR": "192.0.2.1", "HTTP_X_FORWARDED_FOR": "127.0.0.1"}),
            ({}, {"HTTP_HOST": "portfolio.example.test"}),
        ):
            with self.subTest(overrides=overrides, headers=headers), override_settings(**overrides):
                self.assertEqual(self.client.get(reverse("pages:example_mail"), **headers).status_code, 404)

    def test_activation_and_renewal_require_csrf(self):
        self.register()
        strict = Client(enforce_csrf_checks=True, HTTP_HOST="localhost")
        strict.cookies = self.client.cookies
        self.assertEqual(strict.post(reverse("pages:login"), {"action": "activate_local", "activation_code": "123456"}).status_code, 403)
        self.assertEqual(strict.post(reverse("pages:example_mail")).status_code, 403)

    def test_api_registration_enters_same_flow_and_native_login_opens_housing_dashboard(self):
        response = self.client.post(reverse("pages:housing_register_api"), {
            "username": "local-housing", "email": "local-housing@example.test",
            "password": PASSWORD, "password_confirm": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["emailDelivery"], "local")
        self.assertEqual(urlsplit(response.json()["activationUrl"]).path, "/login/")
        user = get_user_model().objects.get(username="local-housing")
        code = self.client.session[SESSION_KEY]["code"]
        self.activate(code, next="/wohnungssuche/dashboard")
        login = self.client.post(reverse("pages:login"), {
            "username": user.email, "password": PASSWORD, "next": "/wohnungssuche/dashboard",
        })
        self.assertEqual(parse_qs(urlsplit(login["Location"]).query)["accountLogin"], ["1"])
        account_session = self.client.get(reverse("pages:housing_account_session_api"))
        token = account_session.json()["token"]
        saved = self.client.post(reverse("pages:housing_search_profiles_api"), {"name": "Fiktives Suchprofil"}, content_type="application/json", HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(saved.status_code, 201)
        self.assertEqual(Client().get(reverse("pages:housing_account_session_api")).status_code, 401)
        self.assertEqual(self.client.post(reverse("pages:housing_logout_api"), HTTP_AUTHORIZATION=f"Token {token}").status_code, 204)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_learning_registration_and_native_login_open_the_existing_account(self):
        registered = self.client.post("/deutschlive/api/auth/register/", {
            "username": "local-learning", "email": "local-learning@example.test", "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(registered.status_code, 201)
        self.assertEqual(registered.json()["emailDelivery"], "local")
        self.activate(next="/deutschlive/account")
        signed_in = self.client.post(reverse("pages:login"), {
            "username": "local-learning@example.test", "password": PASSWORD, "next": "/deutschlive/account",
        })
        self.assertIn("learning_auth_token", signed_in.cookies)
        self.assertEqual(self.client.get("/deutschlive/api/auth/me/").json()["user"]["username"], "local-learning")
