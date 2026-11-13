from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import resolve
from django.utils import timezone
from pages.models import Profile

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

class UserProfileModelTests(TestCase):
    def test_profile_defaults_match_account_foundation(self):
        user = get_user_model().objects.create_user(username="learner", password="secret-pass-123")
        profile = UserProfile.objects.create(user=user)

        self.assertEqual(profile.role, "learner")
        self.assertEqual(profile.premium_status, "free")
        self.assertEqual(profile.interface_language, "ru")
        self.assertEqual(profile.explanation_language, "ru")
        self.assertEqual(profile.level, "start")
        self.assertTrue(profile.save_progress)
        self.assertFalse(profile.has_premium_access)

    def test_profile_reports_premium_access_for_trial_active_or_role(self):
        user = get_user_model().objects.create_user(username="premium", password="secret-pass-123")
        profile = UserProfile.objects.create(user=user, premium_status="trial")
        self.assertTrue(profile.has_premium_access)

        profile.premium_status = "active"
        profile.role = "learner"
        self.assertTrue(profile.has_premium_access)

        profile.premium_status = "free"
        profile.role = "premium"
        self.assertTrue(profile.has_premium_access)

@override_settings(
    DEBUG=True, AUTH_PASSWORD_VALIDATORS=[],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SITE_URL="http://testserver",
)
class AccountFlowTests(TestCase):
    def test_ukrainian_interface_preference_survives_a_new_login(self):
        user = get_user_model().objects.create_user(
            username="ukrainian-example", email="ukrainian@example.test", password="Example-Language-42!",
        )
        credentials = {"username": user.username, "password": "Example-Language-42!"}
        self.assertEqual(self.client.post("/deutschlive/api/auth/login/", credentials, content_type="application/json").status_code, 200)
        response = self.client.patch("/deutschlive/api/settings/", {"interfaceLanguage": "uk"}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["settings"]["interfaceLanguage"], "uk")
        self.assertEqual(UserProfile.objects.get(user=user).interface_language, "uk")
        other = Client()
        other.post("/deutschlive/api/auth/login/", credentials, content_type="application/json")
        self.assertEqual(other.get("/deutschlive/api/auth/me/").json()["user"]["settings"]["interfaceLanguage"], "uk")

    def assert_registration_requires_confirmation(self):
        response = self.client.post(
            "/deutschlive/api/auth/register/",
            data={"username": "newuser", "email": "new@example.test", "password": "strong-pass-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["emailVerificationRequired"])
        self.assertEqual(payload["emailDelivery"], "email")
        self.assertNotIn("emailVerificationToken", payload)
        self.assertNotIn("user", payload)
        profile = UserProfile.objects.get(user__username="newuser")
        self.assertFalse(profile.email_verified)
        user = profile.user
        self.assertFalse(user.is_active)
        self.assertTrue(user.profile.email_verification_pending)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@example.test"])
        confirmation_url = next(
            line for line in mail.outbox[0].body.splitlines()
            if line.startswith("http://testserver/")
        )
        link = urlsplit(confirmation_url)
        self.assertEqual(resolve(link.path).view_name, "pages:verify_email")
        self.assertEqual(parse_qs(link.query)["next"], ["/deutschlive/account?emailConfirmed=1"])

        blocked = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "newuser", "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.json()["code"], "email_verification_required")
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertNotIn("learning_auth_token", self.client.cookies)
        incorrect_password = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "incorrect-example-password"},
            content_type="application/json",
        )
        self.assertEqual(incorrect_password.status_code, 400)
        self.assertNotIn("code", incorrect_password.json())

        confirmed = self.client.get(f"{link.path}?{link.query}")
        self.assertEqual(confirmed.status_code, 302)
        self.assertEqual(confirmed["Location"], "/deutschlive/account?emailConfirmed=1")
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        profile.refresh_from_db()
        self.assertTrue(profile.email_verified)
        # Confirmation signs into the shared account and must also authenticate
        # the DeutschLive destination, without requiring a second login.
        self.assertIn("learning_auth_token", self.client.cookies)
        self.assertEqual(self.client.get("/deutschlive/api/auth/me/").json()["user"]["id"], user.pk)

        logged_in = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "newuser", "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["user"]["username"], "newuser")

    @override_settings(DEBUG=False)
    def test_register_requires_email_confirmation_before_login(self):
        self.assert_registration_requires_confirmation()

    def test_debug_registration_still_requires_email_confirmation_before_login(self):
        self.assert_registration_requires_confirmation()

    def test_failed_confirmation_delivery_rolls_back_the_account_and_allows_retry(self):
        payload = {"username": "retry-example", "email": "retry@example.test", "password": "strong-pass-123"}
        users_before = get_user_model().objects.count()
        profiles_before = Profile.objects.count()
        learning_profiles_before = UserProfile.objects.count()
        with patch("pages.verification.send_account_verification_email", return_value=False):
            response = self.client.post(
                "/deutschlive/api/auth/register/", data=payload, content_type="application/json",
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(get_user_model().objects.count(), users_before)
        self.assertEqual(Profile.objects.count(), profiles_before)
        self.assertEqual(UserProfile.objects.count(), learning_profiles_before)
        self.assertEqual(len(mail.outbox), 0)

        retried = self.client.post(
            "/deutschlive/api/auth/register/", data=payload, content_type="application/json",
        )
        self.assertEqual(retried.status_code, 201)
        self.assertFalse(get_user_model().objects.get(username=payload["username"]).is_active)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(DEBUG=False)
    def test_existing_active_account_keeps_access_without_a_new_confirmation(self):
        user = get_user_model().objects.create_user(
            username="existing-example", email="existing@example.test", password="strong-pass-123",
        )
        profile = UserProfile.objects.create(user=user, email_verified=False)
        response = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/deutschlive/api/auth/me/").json()["user"]["id"], user.pk)
        profile.refresh_from_db()
        self.assertFalse(profile.email_verified)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_confirmation_changes_password(self):
        user = get_user_model().objects.create_user(
            username="resetuser",
            email="reset@example.test",
            password="old-pass-123",
        )
        response = self.client.post(
            "/deutschlive/api/auth/password-reset/",
            data={"identifier": user.email},
            content_type="application/json",
        )
        token = response.json()["resetToken"]

        confirm = self.client.post(
            "/deutschlive/api/auth/password-reset/confirm/",
            data={"token": token, "password": "new-pass-456"},
            content_type="application/json",
        )

        self.assertEqual(confirm.status_code, 200)
        self.assertTrue(self.client.login(username="resetuser", password="new-pass-456"))

    def test_export_contains_only_current_user_learning_data(self):
        user = get_user_model().objects.create_user(username="exporter", password="strong-pass-123")
        other = get_user_model().objects.create_user(username="other", password="strong-pass-123")
        UserProfile.objects.create(user=user, main_goal="Arzttermin", email_verified=True)
        UserProfile.objects.create(user=other, main_goal="Nicht exportieren")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        response = self.client.get("/deutschlive/api/auth/export/")

        self.assertEqual(response.status_code, 200)
        exported = response.json()["export"]
        self.assertEqual(exported["account"]["username"], "exporter")
        self.assertEqual(exported["profile"]["mainGoal"], "Arzttermin")
        self.assertNotIn("password", exported["account"])
