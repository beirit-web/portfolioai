from datetime import timedelta
from unittest.mock import patch
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from pages.models import EmailChangeRequest
from pages.housing_api import make_housing_auth_token
from pages.email_change import request_email_change
from pages.forms import UserAccountForm


@override_settings(
    LOGIN_REQUIRED=False, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SITE_URL="https://portfolio.example.test",
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class EmailChangeTests(TestCase):
    password = "Fictional-password-42!"

    def setUp(self):
        self.user = get_user_model().objects.create_user(username="old@example.test", email="old@example.test", password=self.password)
        self.client.force_login(self.user)

    def initiate(self, **extra):
        return self.client.post("/profil/", {"account-first_name": "Mila", "account-email": "new@example.test", "account-current_password": self.password, **extra})

    def confirmation(self, client=None):
        url = next(line for line in mail.outbox[-1].body.splitlines() if line.startswith("https://"))
        client = client or self.client
        response = client.get(urlsplit(url).path)
        return response["Location"]

    def test_email_stays_verified_until_password_and_inbox_confirmation(self):
        other = Client()
        other.force_login(self.user)
        original_hash = self.user.get_session_auth_hash()
        housing_token = make_housing_auth_token(self.user)
        housing = Client(HTTP_AUTHORIZATION="Token " + housing_token)
        self.assertEqual(housing.get("/wohnungssuche-api/search-profiles/").status_code, 200)
        learning = Client()
        self.assertEqual(learning.post("/deutschlive/api/auth/login/", {
            "username": self.user.email, "password": self.password,
        }, content_type="application/json").status_code, 200)
        learning_cookie = learning.cookies["learning_auth_token"].value
        self.assertEqual(learning.get("/deutschlive/api/auth/me/").json()["user"]["id"], self.user.pk)
        self.user.refresh_from_db()
        reset_token = default_token_generator.make_token(self.user)
        self.assertEqual(self.initiate().status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")
        self.assertEqual([m.to for m in mail.outbox], [["old@example.test"], ["new@example.test"]])
        self.client.post("/password-reset/", {"email": self.user.email})
        self.assertEqual(mail.outbox.pop().to, ["old@example.test"])
        path = self.confirmation()
        self.assertNotIn(EmailChangeRequest.objects.get().token_digest, path)
        self.client.get(path)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")
        wrong = self.client.post(path, {"password": "wrong"})
        self.assertIn("password", wrong.context["form"].errors)
        self.assertEqual(self.client.post(path, {"password": self.password}).status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new@example.test")
        self.assertEqual(self.user.username, "new@example.test")
        self.assertNotEqual(self.user.get_session_auth_hash(), original_hash)
        self.assertTrue(self.user.check_password(self.password))
        self.assertFalse(EmailChangeRequest.objects.exists())
        self.assertEqual(other.get("/profil/").status_code, 302)
        self.assertEqual(housing.get("/wohnungssuche-api/search-profiles/").status_code, 401)
        self.assertIsNone(learning.get("/deutschlive/api/auth/me/").json()["user"])
        # Even paired with a fresh valid Django session, the old learning cookie
        # cannot authenticate after the recovery address has changed.
        learning.force_login(self.user)
        learning.cookies["learning_auth_token"] = learning_cookie
        self.assertIsNone(learning.get("/deutschlive/api/auth/me/").json()["user"])
        self.assertFalse(default_token_generator.check_token(self.user, reset_token))
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertFalse(self.client.post(path, {"password": self.password}).context["valid_change"])

    def test_stolen_session_cannot_change_recovery_email(self):
        for password in ("", "wrong"):
            response = self.initiate(**{"account-current_password": password})
            self.assertEqual(response.status_code, 200)
            self.assertIn("current_password", response.context["account_form"].errors)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")
        self.assertFalse(EmailChangeRequest.objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_expired_replaced_and_password_invalidated_links_fail(self):
        self.initiate()
        old_path = self.confirmation()
        other = Client()
        self.confirmation(other)
        self.initiate()
        self.assertFalse(other.get(old_path).context["valid_change"])
        path = self.confirmation()
        EmailChangeRequest.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertFalse(self.client.get(path).context["valid_change"])
        self.initiate()
        path = self.confirmation()
        self.user.set_password("A-different-password-42!")
        self.user.save()
        self.assertFalse(self.client.get(path).context["valid_change"])

    def test_delivery_failure_and_dummy_backend_do_not_change_account(self):
        with patch("pages.email_change.send_notification_email", return_value=False):
            self.assertEqual(self.initiate().status_code, 200)
        self.assertFalse(EmailChangeRequest.objects.exists())
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.dummy.EmailBackend"):
            self.assertEqual(self.initiate().status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")
        self.assertEqual(self.user.first_name, "")

    def test_failed_confirmation_delivery_invalidates_link_after_owner_notice(self):
        with patch("pages.email_change.send_notification_email", side_effect=[True, False]) as send:
            response = self.initiate()
        self.assertEqual(response.status_code, 200)
        self.assertEqual([call.args[2] for call in send.call_args_list], ["old@example.test", "new@example.test"])
        self.assertFalse(EmailChangeRequest.objects.exists())
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")

    def test_older_failed_delivery_does_not_delete_replacement_request(self):
        def request_replacement(*_args):
            with patch("pages.email_change.send_notification_email", return_value=True):
                self.assertTrue(request_email_change(self.user, "replacement@example.test"))
            return False

        with patch("pages.email_change.send_notification_email", side_effect=request_replacement):
            self.assertFalse(request_email_change(self.user, "first@example.test"))
        self.assertEqual(EmailChangeRequest.objects.get().new_email, "replacement@example.test")

    def test_profile_save_during_delivery_cannot_undo_password_reset(self):
        new_password = "Changed-during-delivery-42!"

        def reset_password(*_args):
            latest = get_user_model().objects.get(pk=self.user.pk)
            latest.set_password(new_password)
            latest.save(update_fields=["password"])
            return True

        with patch("pages.email_change.send_notification_email", side_effect=reset_password):
            self.assertEqual(self.initiate().status_code, 302)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.assertFalse(self.user.check_password(self.password))
        self.assertEqual(self.user.email, "old@example.test")
        self.assertNotEqual(EmailChangeRequest.objects.get().auth_hash, self.user.get_session_auth_hash())

    def test_model_form_save_cannot_restore_stale_account_credentials(self):
        form = UserAccountForm({"first_name": "Mila", "email": self.user.email}, instance=self.user)
        self.assertTrue(form.is_valid(), form.errors)
        latest = get_user_model().objects.get(pk=self.user.pk)
        latest.set_password("Already-reset-password-42!")
        latest.email = latest.username = "already-confirmed@example.test"
        latest.save(update_fields=["password", "email", "username"])
        form.save()
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Already-reset-password-42!"))
        self.assertEqual(self.user.email, "already-confirmed@example.test")
        self.assertEqual(self.user.username, "already-confirmed@example.test")
        self.assertEqual(self.user.first_name, "Mila")

    def test_deactivated_account_and_changed_email_invalidate_confirmation(self):
        self.initiate()
        guest = Client()
        path = self.confirmation(guest)
        get_user_model().objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertFalse(guest.post(path, {"password": self.password}).context["valid_change"])
        get_user_model().objects.filter(pk=self.user.pk).update(is_active=True, email="changed-elsewhere@example.test")
        self.assertFalse(guest.get(path).context["valid_change"])

    def test_confirmation_requires_csrf_and_limits_password_attempts(self):
        self.initiate()
        strict = Client(enforce_csrf_checks=True)
        path = self.confirmation(strict)
        self.assertEqual(strict.post(path, {"password": self.password}).status_code, 403)
        path = self.confirmation()
        for _ in range(5):
            self.assertEqual(self.client.post(path, {"password": "wrong"}).status_code, 200)
        self.assertEqual(self.client.post(path, {"password": self.password}).status_code, 429)

    def test_address_claimed_after_request_is_rejected(self):
        self.initiate()
        path = self.confirmation()
        get_user_model().objects.create_user(username="new@example.test", email="new@example.test", password=self.password)
        response = self.client.post(path, {"password": self.password})
        self.assertTrue(response.context["form"].non_field_errors())
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "old@example.test")
