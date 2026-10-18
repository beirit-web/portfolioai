from django.contrib.auth import authenticate, get_user_model
from django.test import RequestFactory, TestCase, override_settings
from urllib.parse import urlsplit

from pages.forms import LoginForm
from pages.models import Profile
from pages.verification import build_email_verification_url


PASSWORD = "fictional-authentication-password"


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class EmailOrUsernameBackendTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="existing-housing-name", email="shared-account@example.test", password=PASSWORD,
        )

    def test_shared_account_accepts_username_or_email_with_case_and_whitespace(self):
        for identifier in (
            self.user.username, self.user.email,
            self.user.username.upper(), f" {self.user.email.upper()} ",
        ):
            with self.subTest(identifier=identifier):
                self.assertEqual(authenticate(username=identifier, password=PASSWORD), self.user)

    @override_settings(DEBUG=True, LOGIN_REQUIRED=False, AUTH_PASSWORD_VALIDATORS=[])
    def test_learning_registration_and_login_accept_the_same_unicode_username(self):
        username = "ｆｕｌｌｗｉｄｔｈ-example"
        registration = self.client.post("/deutschlive/api/auth/register/", {
            "username": username, "email": "unicode-login@example.test", "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(registration.status_code, 201)
        user = get_user_model().objects.get(email="unicode-login@example.test")
        self.assertEqual(user.username, "fullwidth-example")
        self.assertFalse(user.is_active)
        pending = self.client.post("/deutschlive/api/auth/login/", {
            "username": username, "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(pending.status_code, 403)
        self.assertEqual(pending.json()["code"], "email_verification_required")
        self.client.get(urlsplit(build_email_verification_url(user)).path)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        for path in ("/deutschlive/api/auth/login/", "/wohnungssuche-api/token-auth/"):
            with self.subTest(path=path):
                response = self.client.post(path, {
                    "username": username, "password": PASSWORD,
                }, content_type="application/json")
                self.assertEqual(response.status_code, 200)

    def test_missing_or_inactive_account_and_wrong_password_are_rejected(self):
        self.assertIsNone(authenticate(username="missing@example.test", password=PASSWORD))
        self.assertIsNone(authenticate(username=self.user.email, password="fictional-wrong-password"))
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertIsNone(authenticate(username=self.user.email, password=PASSWORD))

    def test_duplicate_email_does_not_choose_an_arbitrary_account(self):
        other = get_user_model().objects.create_user(
            username="another-housing-name", email=self.user.email.upper(), password="other-example-password",
        )
        for password in (PASSWORD, "other-example-password"):
            self.assertIsNone(authenticate(username=self.user.email, password=password))
        self.assertEqual(authenticate(username=self.user.username, password=PASSWORD), self.user)
        self.assertEqual(authenticate(username=other.username, password="other-example-password"), other)

    def test_username_email_collision_does_not_sign_in_the_wrong_account(self):
        get_user_model().objects.create_user(
            username=self.user.email, email="another@example.test", password="other-example-password",
        )
        for password in (PASSWORD, "other-example-password"):
            self.assertIsNone(authenticate(username=self.user.email, password=password))

    def test_native_email_form_authenticates_an_existing_non_email_username(self):
        form = LoginForm(RequestFactory().post("/login/"), data={
            "username": f" {self.user.email.upper()} ", "password": PASSWORD,
        })
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["username"], self.user.email)
        self.assertEqual(form.get_user(), self.user)

    def test_native_email_form_retains_the_activation_explanation(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        Profile.objects.create(user=self.user, email_verification_pending=True)
        form = LoginForm(RequestFactory().post("/login/"), data={
            "username": self.user.email, "password": PASSWORD,
        })
        self.assertFalse(form.is_valid())
        self.assertIn("bestätigen Sie zuerst Ihre E-Mail-Adresse", str(form.non_field_errors()))

    def test_disabled_account_does_not_receive_the_pending_activation_explanation(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        Profile.objects.create(user=self.user)
        form = LoginForm(RequestFactory().post("/login/"), data={
            "username": self.user.email, "password": PASSWORD,
        })
        self.assertFalse(form.is_valid())
        self.assertNotIn("bestätigen Sie zuerst Ihre E-Mail-Adresse", str(form.non_field_errors()))
