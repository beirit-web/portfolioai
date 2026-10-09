from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
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
        self.assertEqual(profile.theme_preference, "system")
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

@override_settings(DEBUG=True, AUTH_PASSWORD_VALIDATORS=[], EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AccountFlowTests(TestCase):
    def test_register_returns_user_and_email_confirmation_token(self):
        response = self.client.post(
            "/api/auth/register/",
            data={"username": "newuser", "email": "new@example.com", "password": "strong-pass-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["user"]["username"], "newuser")
        self.assertTrue(payload["emailVerificationRequired"])
        self.assertIn("emailVerificationToken", payload)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@example.com"])
        self.assertIn(payload["emailVerificationToken"], mail.outbox[0].body)

    def test_password_reset_confirmation_changes_password(self):
        user = get_user_model().objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="old-pass-123",
        )
        response = self.client.post(
            "/api/auth/password-reset/",
            data={"identifier": user.email},
            content_type="application/json",
        )
        token = response.json()["resetToken"]
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["reset@example.com"])
        self.assertIn(token, mail.outbox[0].body)

        confirm = self.client.post(
            "/api/auth/password-reset/confirm/",
            data={"token": token, "password": "new-pass-456"},
            content_type="application/json",
        )

        self.assertEqual(confirm.status_code, 200)
        self.assertTrue(self.client.login(username="resetuser", password="new-pass-456"))

    def test_resend_email_confirmation_sends_mail(self):
        user = get_user_model().objects.create_user(
            username="mailuser",
            email="mailuser@example.com",
            password="strong-pass-123",
        )
        UserProfile.objects.create(user=user)
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post("/api/auth/email/resend/", data={}, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        token = response.json()["emailVerificationToken"]
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["mailuser@example.com"])
        self.assertIn(token, mail.outbox[0].body)

    @override_settings(DEFAULT_FROM_EMAIL="noreply@portfolio.example.invalid")
    def test_send_test_email_command_uses_configured_backend(self):
        output = StringIO()

        call_command("send_test_email", "--to", "ops@example.com", "--allow-local-backend", stdout=output)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ops@example.com"])
        self.assertEqual(mail.outbox[0].from_email, "noreply@portfolio.example.invalid")
        self.assertIn("DeutschLive: SMTP-Zustelltest", mail.outbox[0].subject)
        self.assertIn("Local backend used", output.getvalue())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend")
    def test_send_test_email_command_rejects_local_backend_without_override(self):
        with self.assertRaises(CommandError):
            call_command("send_test_email", "--to", "ops@example.com")

    @patch("lessons.management.commands.check_mail_dns.subprocess.run")
    def test_check_mail_dns_command_reports_mail_records(self, run_mock):
        def fake_run(command, **kwargs):
            record_type = command[2]
            name = command[3]
            stdout = ""
            if record_type == "MX":
                stdout = "10 mx.example.com.\n"
            elif record_type == "TXT" and name == "portfolio.example.invalid":
                stdout = '"v=spf1 include:example.com -all"\n'
            elif record_type == "TXT" and name == "_dmarc.portfolio.example.invalid":
                stdout = '"v=DMARC1; p=quarantine"\n'
            elif record_type == "TXT" and name == "mail._domainkey.portfolio.example.invalid":
                stdout = '"v=DKIM1; k=rsa; p=abc"\n'
            return type("Result", (), {"returncode": 0, "stdout": stdout, "stderr": ""})()

        run_mock.side_effect = fake_run
        output = StringIO()

        call_command("check_mail_dns", "--domain", "portfolio.example.invalid", "--dkim-selector", "mail", "--json", stdout=output)

        self.assertIn('"ok": true', output.getvalue())
        self.assertIn('"code": "mx"', output.getvalue())
        self.assertIn('"code": "spf"', output.getvalue())
        self.assertIn('"code": "dmarc"', output.getvalue())
        self.assertIn('"code": "dkim"', output.getvalue())

    @patch("lessons.management.commands.check_mail_dns.subprocess.run")
    def test_check_mail_dns_command_fails_without_mx(self, run_mock):
        run_mock.return_value = type("Result", (), {"returncode": 0, "stdout": "", "stderr": ""})()

        with self.assertRaises(SystemExit):
            call_command("check_mail_dns", "--domain", "portfolio.example.invalid")

    def test_login_rotates_session_and_sets_signed_auth_token(self):
        user = get_user_model().objects.create_user(username="sessionuser", password="strong-pass-123")
        session = self.client.session
        session["pre_login"] = "value"
        session.save()
        old_session_key = session.session_key

        response = self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(self.client.session.session_key, old_session_key)
        self.assertIn("learning_auth_token", response.cookies)
        self.assertTrue(response.cookies["learning_auth_token"]["httponly"])

    def test_protected_api_rejects_authenticated_session_without_auth_token(self):
        user = get_user_model().objects.create_user(username="missingtoken", password="strong-pass-123")
        self.client.force_login(user)

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "session_invalid")
        self.assertEqual(response["X-Session-Status"], "session_invalid")

    @override_settings(SESSION_SECURITY_IDLE_TIMEOUT_SECONDS=1)
    def test_protected_api_rejects_idle_session(self):
        user = get_user_model().objects.create_user(username="idleuser", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        session = self.client.session
        session["session_security_last_activity"] = (timezone.now() - timedelta(seconds=5)).isoformat()
        session.save()

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "session_expired")
        self.assertEqual(response["X-Session-Status"], "session_expired")

    def test_export_contains_only_current_user_learning_data(self):
        user = get_user_model().objects.create_user(username="exporter", password="strong-pass-123")
        other = get_user_model().objects.create_user(username="other", password="strong-pass-123")
        UserProfile.objects.create(user=user, main_goal="Arzttermin")
        UserProfile.objects.create(user=other, main_goal="Nicht exportieren")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        response = self.client.get("/api/auth/export/")

        self.assertEqual(response.status_code, 200)
        exported = response.json()["export"]
        self.assertEqual(exported["account"]["username"], "exporter")
        self.assertEqual(exported["profile"]["mainGoal"], "Arzttermin")
        self.assertNotIn("password", exported["account"])
