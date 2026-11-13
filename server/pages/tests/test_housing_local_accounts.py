from urllib.parse import parse_qs, urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from pages.local_activation import SESSION_KEY
from pages.models import Profile


PASSWORD = "Fictional-local-housing-42!"


@override_settings(
    DEBUG=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=True,
    ACCOUNT_EMAIL_DELIVERY_ENABLED=False, LOGIN_REQUIRED=False,
    EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    ALLOWED_HOSTS=["localhost", "127.0.0.1", "portfolio.example.test", "testserver"],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class HousingLocalAccountTests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="localhost")
        self.user = get_user_model().objects.create_user(
            username="local-housing-demo", email="housing-local@example.test", password=PASSWORD, is_active=False,
        )
        Profile.objects.update_or_create(user=self.user, defaults={"email_verification_pending": True})

    def sign_in(self, password=PASSWORD):
        return self.client.post(reverse("pages:housing_token_auth_api"), {
            "username": self.user.username, "password": password,
        }, content_type="application/json")

    def test_config_explains_local_delivery_and_uses_real_configured_paths(self):
        response = self.client.get(reverse("pages:housing_auth_config"))
        data = response.json()
        self.assertTrue(data["localActivationAvailable"])
        self.assertEqual(data["emailDelivery"], "local")
        self.assertEqual(data["exampleMailUrl"], reverse("pages:example_mail"))
        reset = urlsplit(data["passwordResetUrl"])
        self.assertEqual(reset.path, reverse("password_reset"))
        self.assertEqual(parse_qs(reset.query), {"next": ["/wohnungssuche/login"]})
        self.assertIsNone(data["activationUrl"])
        self.assertIn("private", response["Cache-Control"])
        self.assertIn("no-store", response["Cache-Control"])
        self.assertIn("Cookie", response["Vary"])
        self.assertIn("noindex", response["X-Robots-Tag"])
        self.assertNotIn(SESSION_KEY, self.client.session)

    def test_correct_pending_credentials_open_the_existing_browser_code_flow(self):
        response = self.sign_in()
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertEqual(data["code"], "email_verification_required")
        self.assertEqual(data["emailDelivery"], "local")
        self.assertNotIn("token", data)
        self.assertIn("keine E-Mail", data["errors"]["detail"][0])
        activation = urlsplit(data["activationUrl"])
        self.assertEqual(activation.path, reverse("pages:login"))
        self.assertEqual(parse_qs(activation.query)["next"], ["/wohnungssuche/dashboard"])
        challenge = self.client.session[SESSION_KEY]
        self.assertEqual(challenge["user_id"], self.user.pk)
        self.assertEqual(len(challenge["code"]), 6)
        self.assertNotIn(challenge["code"], response.content.decode())
        own_config = self.client.get(reverse("pages:housing_auth_config")).json()
        self.assertEqual(own_config["activationUrl"], data["activationUrl"])
        other = Client(HTTP_HOST="localhost")
        self.assertIsNone(other.get(reverse("pages:housing_auth_config")).json()["activationUrl"])
        self.assertNotContains(other.get(reverse("pages:example_mail")), challenge["code"])

    def test_wrong_password_and_disabled_account_do_not_issue_a_challenge(self):
        self.assertEqual(self.sign_in("Fictional-wrong-password-42!").status_code, 400)
        self.assertNotIn(SESSION_KEY, self.client.session)
        Profile.objects.filter(user=self.user).update(email_verification_pending=False)
        response = self.sign_in()
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("activationUrl", response.json())
        self.assertNotIn(SESSION_KEY, self.client.session)

    def test_local_hints_require_every_local_mode_guard(self):
        cases = [
            ({"DEBUG": False}, {}),
            ({"LOCAL_ACCOUNT_ACTIVATION_ENABLED": False}, {}),
            ({"ACCOUNT_EMAIL_DELIVERY_ENABLED": True}, {}),
            ({"EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend"}, {}),
            ({}, {"HTTP_HOST": "portfolio.example.test"}),
            ({}, {"REMOTE_ADDR": "203.0.113.10", "HTTP_X_FORWARDED_FOR": "127.0.0.1"}),
        ]
        for options, headers in cases:
            with self.subTest(options=options, headers=headers), override_settings(**options):
                response = self.client.get(reverse("pages:housing_auth_config"), **headers)
                data = response.json()
                self.assertFalse(data["localActivationAvailable"])
                self.assertIsNone(data["exampleMailUrl"])
                self.assertIsNone(data["activationUrl"])
                self.assertNotEqual(data["emailDelivery"], "local")

    @override_settings(LOCAL_ACCOUNT_ACTIVATION_ENABLED=False)
    def test_console_only_mode_does_not_issue_local_codes_on_pending_login(self):
        response = self.sign_in()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "email_verification_required")
        self.assertNotIn("activationUrl", response.json())
        self.assertNotIn(SESSION_KEY, self.client.session)
