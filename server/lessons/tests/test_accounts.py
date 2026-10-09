from datetime import timedelta
from urllib.parse import parse_qs, urlsplit
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

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

@override_settings(DEBUG=True, AUTH_PASSWORD_VALIDATORS=[])
class AccountFlowTests(TestCase):
    @override_settings(
        DEBUG=False,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="mail.test.invalid",
        SITE_URL="http://testserver",
    )
    def test_register_requires_email_confirmation_before_login(self):
        response = self.client.post(
            "/deutschlive/api/auth/register/",
            data={"username": "newuser", "email": "new@example.com", "password": "strong-pass-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["emailVerificationRequired"])
        self.assertNotIn("emailVerificationToken", payload)
        self.assertNotIn("user", payload)
        profile = UserProfile.objects.get(user__username="newuser")
        self.assertFalse(profile.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@example.com"])
        confirmation_url = next(
            line for line in mail.outbox[0].body.splitlines()
            if line.startswith("http://testserver/")
        )
        self.assertEqual(urlsplit(confirmation_url).path, "/deutschlive/api/auth/email/confirm/")
        token = parse_qs(urlsplit(confirmation_url).query)["token"][0]

        blocked = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "newuser", "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(blocked.status_code, 403)

        confirmed = self.client.post(
            "/deutschlive/api/auth/email/confirm/",
            data={"token": token},
            content_type="application/json",
        )
        self.assertEqual(confirmed.status_code, 200)
        profile.refresh_from_db()
        self.assertTrue(profile.email_verified)

        logged_in = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "newuser", "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["user"]["username"], "newuser")

    def test_debug_registration_allows_login_without_email_confirmation(self):
        response = self.client.post(
            "/deutschlive/api/auth/register/",
            data={"username": "devuser", "email": "dev@example.com", "password": "strong-pass-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()["emailVerificationRequired"])
        self.assertTrue(UserProfile.objects.get(user__username="devuser").email_verified)

        logged_in = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "devuser", "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["user"]["username"], "devuser")

    def test_password_reset_confirmation_changes_password(self):
        user = get_user_model().objects.create_user(
            username="resetuser",
            email="reset@example.com",
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
