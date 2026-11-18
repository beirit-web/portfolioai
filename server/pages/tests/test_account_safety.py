from datetime import timedelta
from io import StringIO
import json
from pathlib import Path
import runpy
import smtplib
import socket
import ssl
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command, CommandError
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from pages.models import LoginAttemptBucket


@override_settings(
    LOGIN_REQUIRED=False, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SITE_URL="https://portfolio.example.test", PASSWORD_RESET_USE_HTTPS=None,
    PASSWORD_RESET_DOMAIN="", PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class AccountSafetyTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="safe-account@example.test", email="safe-account@example.test", password="Fictional-password-42!",
        )

    def test_delete_requires_current_password_and_invalidates_other_sessions(self):
        self.client.force_login(self.user)
        other = Client()
        other.force_login(self.user)
        for payload in ({}, {"password": "wrong-password"}):
            response = self.client.post("/account/delete/", payload)
            self.assertEqual(response.status_code, 200)
            self.assertIn("password", response.context["form"].errors)
            self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
        response = self.client.post("/account/delete/", {"password": "Fictional-password-42!"})
        self.assertEqual(response.status_code, 302)
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(other.get("/profil/").status_code, 302)

    def test_deletion_password_attempts_are_limited(self):
        self.client.force_login(self.user)
        for _ in range(5):
            self.assertEqual(self.client.post("/account/delete/", {"password": "wrong"}).status_code, 200)
        self.assertEqual(self.client.post("/account/delete/", {"password": "Fictional-password-42!"}).status_code, 429)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_account_changes_require_csrf_and_get_logout_does_not_end_session(self):
        strict = Client(enforce_csrf_checks=True)
        strict.force_login(self.user)
        for path in ("/register/", "/password-reset/", "/email-bestaetigung/", "/account/delete/", "/logout/"):
            self.assertEqual(strict.post(path, {"password": "Fictional-password-42!"}).status_code, 403)
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/logout/?next=https://external.example.test/").status_code, 200)
        self.assertIn("_auth_user_id", self.client.session)
        response = self.client.post("/logout/", {"next": "https://external.example.test/"})
        self.assertEqual(response["Location"], "/")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_learning_password_checks_cannot_bypass_sensitive_account_budget(self):
        login = self.client.post("/deutschlive/api/auth/login/", {
            "username": self.user.email, "password": "Fictional-password-42!",
        }, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        for action in ("delete-account", "change-password", "delete-account", "change-password", "delete-account"):
            response = self.client.post(f"/deutschlive/api/auth/{action}/", {
                "password": "wrong", "currentPassword": "wrong", "newPassword": "Another-fictional-password!",
            }, content_type="application/json")
            self.assertEqual(response.status_code, 400)
        response = self.client.post("/account/delete/", {"password": "Fictional-password-42!"})
        self.assertEqual(response.status_code, 429)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    @override_settings(ADMIN_IP_WHITELIST=[])
    def test_django_and_admin_password_changes_share_sensitive_budget(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_login(self.user)
        django_path = f"/{settings.AUTH_URL_PREFIX.strip('/')}/password_change/"
        admin_path = f"/{settings.ADMIN_URL.strip('/')}/password_change/"
        payload = {
            "old_password": "wrong", "new_password1": "Another-fictional-password!",
            "new_password2": "Another-fictional-password!",
        }
        for path in (django_path, admin_path, django_path, admin_path, django_path):
            response = self.client.post(path, payload)
            self.assertEqual(response.status_code, 200)
            self.assertIn("old_password", response.context["form"].errors)
        for path in (django_path, admin_path, "/account/delete/"):
            self.assertEqual(self.client.post(path, payload).status_code, 429)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Fictional-password-42!"))

    def test_recovery_aliases_and_resend_share_a_budget_without_sending_excess_mail(self):
        for path in ("/password-reset/", "/auth/password_reset/", "/email-bestaetigung/", "/password-reset/", "/auth/password_reset/"):
            response = self.client.post(path, {"email": self.user.email.upper()})
            self.assertEqual(response.status_code, 302)
        sent = len(mail.outbox)
        response = Client().post("/password-reset/", {"email": self.user.email}, HTTP_X_FORWARDED_FOR="192.0.2.45")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], "900")
        self.assertEqual(len(mail.outbox), sent)
        LoginAttemptBucket.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.client.post("/password-reset/", {"email": self.user.email}).status_code, 302)

    def test_registration_aliases_cannot_bypass_budget(self):
        for path in ("/register/", "/deutschlive/api/auth/register/", "/wohnungssuche-api/register/", "/register/", "/deutschlive/api/auth/register/"):
            data = {"email": "missing@example.test"}
            response = self.client.post(path, data, content_type="application/json") if "api" in path else self.client.post(path, data)
            self.assertIn(response.status_code, (200, 400))
        response = self.client.post("/wohnungssuche-api/register/", {"email": "missing@example.test"}, content_type="application/json")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "account_rate_limited")

    def test_housing_rejects_form_encoded_json_before_authentication(self):
        # Otherwise Django's form parser sees a rotating username inside the
        # ignored field, while the housing JSON parser guesses the real account.
        for content_type in ("application/x-www-form-urlencoded", "text/plain"):
            with self.subTest(content_type=content_type):
                body = json.dumps({
                    "username": self.user.email, "password": "wrong",
                    "ignored": "&username=another-budget&",
                })
                with patch("pages.views.authenticate", return_value=None) as authenticate:
                    response = self.client.post("/wohnungssuche-api/token-auth/", body, content_type=content_type)
                self.assertEqual(response.status_code, 415)
                authenticate.assert_not_called()

    def test_housing_registration_rejects_simple_cross_origin_form_content(self):
        body = json.dumps({
            "username": "cross-origin@example.test", "email": "cross-origin@example.test",
            "password": "Fictional-account-42!", "password_confirm": "Fictional-account-42!",
        })
        strict = Client(enforce_csrf_checks=True)
        response = strict.post("/wohnungssuche-api/register/", body, content_type="text/plain", HTTP_ORIGIN="https://other.example.test")
        self.assertEqual(response.status_code, 415)
        self.assertFalse(get_user_model().objects.filter(email="cross-origin@example.test").exists())

    def test_form_parser_cannot_bypass_an_exhausted_housing_login_budget(self):
        path = "/wohnungssuche-api/token-auth/"
        for _ in range(5):
            response = self.client.post(path, {"username": self.user.email, "password": "wrong"}, content_type="application/json")
            self.assertEqual(response.status_code, 400)
        body = json.dumps({
            "username": self.user.email, "password": "Fictional-password-42!",
            "ignored": "&username=unused-budget&",
        })
        self.assertEqual(self.client.post(path, body, content_type="application/x-www-form-urlencoded").status_code, 415)

    def test_csrf_rejection_does_not_exhaust_account_budget(self):
        strict = Client(enforce_csrf_checks=True)
        for _ in range(6):
            self.assertEqual(strict.post("/password-reset/", {"email": self.user.email}).status_code, 403)
        self.assertFalse(LoginAttemptBucket.objects.exists())

    def test_public_https_origin_is_used_for_reset_even_behind_http_proxy(self):
        self.client.post("/password-reset/", {"email": self.user.email})
        self.assertIn("https://portfolio.example.test/reset/", mail.outbox[0].body)


@override_settings(
    ACCOUNT_EMAIL_DELIVERY_ENABLED=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="smtp.example.test", EMAIL_HOST_USER="accounts@example.test",
    EMAIL_HOST_PASSWORD="fictional-mail-password", DEFAULT_FROM_EMAIL="accounts@example.test",
    EMAIL_USE_TLS=True, EMAIL_USE_SSL=False, EMAIL_SSL_SKIP_VERIFY=False, EMAIL_TIMEOUT=10,
    SITE_URL="https://portfolio.example.test", PASSWORD_RESET_USE_HTTPS=None,
)
class AccountMailCheckTests(SimpleTestCase):
    def test_default_check_never_opens_a_connection(self):
        with patch("pages.management.commands.check_account_mail.get_connection") as connection:
            call_command("check_account_mail", stdout=StringIO())
        connection.assert_not_called()

    def test_connect_authenticates_without_sending_and_redacts_failures(self):
        output = StringIO()
        with patch("pages.management.commands.check_account_mail.get_connection") as connection:
            call_command("check_account_mail", connect=True, stdout=output)
            connection.return_value.__enter__.assert_called_once()
            connection.return_value.send_messages.assert_not_called()
        with patch("pages.management.commands.check_account_mail.get_connection", side_effect=OSError("private SMTP error")):
            with self.assertRaises(CommandError) as error:
                call_command("check_account_mail", connect=True, stdout=StringIO())
        self.assertNotIn("private SMTP error", str(error.exception))
        self.assertNotIn("fictional-mail-password", output.getvalue())

    def test_unsafe_transport_and_missing_configuration_fail_before_connecting(self):
        for override in ({"EMAIL_USE_TLS": False}, {"EMAIL_USE_SSL": True}, {"EMAIL_HOST_PASSWORD": ""}, {"ACCOUNT_EMAIL_DELIVERY_ENABLED": False}, {"SITE_URL": "http://portfolio.example.test"}):
            with self.subTest(override=override), self.settings(**override), patch("pages.management.commands.check_account_mail.get_connection") as connection:
                with self.assertRaises(CommandError):
                    call_command("check_account_mail", connect=True, stdout=StringIO())
                connection.assert_not_called()

    def test_connection_only_clearly_states_that_no_mail_was_sent(self):
        output = StringIO()
        with patch("pages.management.commands.check_account_mail.get_connection"), patch("pages.management.commands.check_account_mail.EmailMessage.send") as send:
            call_command("check_account_mail", connect=True, stdout=output)
        send.assert_not_called()
        self.assertIn("Keine Testmail gesendet", output.getvalue())
        self.assertIn("--send-test", output.getvalue())

    def test_failures_explain_the_stage_without_printing_provider_details(self):
        cases = (
            (smtplib.SMTPAuthenticationError(535, b"private-provider-response"), "SMTP-Anmeldung abgelehnt", "SMTP 535"),
            (ssl.SSLCertVerificationError("private-provider-response"), "TLS-Zertifikat", None),
            (socket.gaierror("private-provider-response"), "DNS", None),
            (TimeoutError("private-provider-response"), "Zeitüberschreitung", None),
        )
        for error, expected, code in cases:
            with self.subTest(error=type(error).__name__), patch("pages.management.commands.check_account_mail.get_connection", side_effect=error), patch("pages.management.commands.check_account_mail.EmailMessage.send") as send:
                with self.assertRaises(CommandError) as raised:
                    call_command("check_account_mail", connect=True, send_test=True, stdout=StringIO())
                message = str(raised.exception)
                self.assertIn(expected, message)
                if code:
                    self.assertIn(code, message)
                self.assertNotIn("private-provider-response", message)
                send.assert_not_called()

    def test_delivery_rejection_is_not_reported_as_success(self):
        output = StringIO()
        with patch("pages.management.commands.check_account_mail.EmailMessage.send", side_effect=smtplib.SMTPDataError(554, b"private-provider-response")):
            with self.assertRaises(CommandError) as raised:
                call_command("check_account_mail", send_test=True, stdout=output)
        self.assertIn("SMTP 554", str(raised.exception))
        self.assertNotIn("private-provider-response", str(raised.exception))
        self.assertNotIn("Testmail angenommen", output.getvalue())


class LocalSmtpLauncherTests(SimpleTestCase):
    def test_launcher_checks_smtp_and_keeps_credentials_out_of_arguments(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        with patch("sys.argv", ["run_local_account_mail.py", "--port", "8001"]), patch("sys.stdin.isatty", return_value=True), patch("builtins.input", return_value="accounts@example.test"), patch("getpass.getpass", return_value="fictional-secret"), patch("subprocess.run", return_value=SimpleNamespace(returncode=0)) as run, patch("os.chdir"), patch("os.execve") as execute, patch("builtins.print") as output:
            entry["main"]()
        environment = run.call_args.kwargs["env"]
        self.assertEqual(environment["EMAIL_HOST_PASSWORD"], "fictional-secret")
        self.assertEqual(environment["EMAIL_USE_SSL"], "true")
        self.assertEqual(environment["LOCAL_ACCOUNT_ACTIVATION_ENABLED"], "false")
        self.assertEqual(environment["SITE_URL"], "http://localhost:8001")
        self.assertTrue(environment["DJANGO_SECRET_KEY"])
        self.assertEqual(environment["DJANGO_SETTINGS_MODULE"], "config.settings")
        self.assertEqual(run.call_count, 2)
        self.assertIn("check_account_mail", run.call_args_list[0].args[0])
        for invocation in run.call_args_list:
            self.assertNotIn("fictional-secret", str(invocation.args))
        self.assertNotIn("fictional-secret", str(execute.call_args.args[1]))
        self.assertNotIn("fictional-secret", str(output.call_args_list))
        self.assertEqual(execute.call_args.args[1][-1], "127.0.0.1:8001")

    def test_failed_smtp_check_does_not_start_server(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        with patch("sys.argv", ["run_local_account_mail.py"]), patch("sys.stdin.isatty", return_value=True), patch("builtins.input", return_value="accounts@example.test"), patch("getpass.getpass", return_value="fictional-secret"), patch("subprocess.run", return_value=SimpleNamespace(returncode=1)), patch("os.execve") as execute:
            self.assertEqual(entry["main"](), 1)
        execute.assert_not_called()

    def test_mail_check_only_leaves_database_and_server_untouched(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        with patch("sys.argv", ["run_local_account_mail.py", "--check-only", "--send-test"]), patch("sys.stdin.isatty", return_value=True), patch("builtins.input", return_value="accounts@example.test"), patch("getpass.getpass", return_value="fictional-secret"), patch("subprocess.run", return_value=SimpleNamespace(returncode=0)) as run, patch("os.execve") as execute:
            self.assertEqual(entry["main"](), 0)
        run.assert_called_once()
        self.assertEqual(run.call_args.args[0][-3:], ["check_account_mail", "--connect", "--send-test"])
        execute.assert_not_called()

    def test_checks_disable_admin_bootstrap_but_preserve_server_configuration(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        admin = {"DJANGO_ADMIN_NAME": "fictional-admin", "ADMIN_NAME": "fictional-alias", "DJANGO_ADMIN_PASSWORD": "fictional-admin-password", "ADMIN_PASSWORD": "fictional-alias-password"}
        with patch.dict("os.environ", admin), patch("sys.argv", ["run_local_account_mail.py"]), patch("sys.stdin.isatty", return_value=True), patch("builtins.input", return_value="accounts@example.test"), patch("getpass.getpass", return_value="fictional-secret"), patch("subprocess.run", return_value=SimpleNamespace(returncode=0)) as run, patch("os.chdir"), patch("os.execve") as execute, patch("builtins.print"):
            entry["main"]()
        self.assertEqual(run.call_count, 2)
        for invocation in run.call_args_list:
            for key in admin:
                self.assertEqual(invocation.kwargs["env"][key], "")
        for key, value in admin.items():
            self.assertEqual(execute.call_args.args[2][key], value)

    def test_database_preparation_failure_prevents_server_start(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        with patch("sys.argv", ["run_local_account_mail.py"]), patch("sys.stdin.isatty", return_value=True), patch("builtins.input", return_value="accounts@example.test"), patch("getpass.getpass", return_value="fictional-secret"), patch("subprocess.run", side_effect=[SimpleNamespace(returncode=0), SimpleNamespace(returncode=1)]), patch("os.execve") as execute:
            self.assertEqual(entry["main"](), 1)
        execute.assert_not_called()

    def test_preparation_backs_up_before_migrating_and_aborts_on_backup_failure(self):
        entry = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/run_local_account_mail.py"))
        with TemporaryDirectory() as directory:
            database = Path(directory) / "fictional.sqlite3"
            database.write_bytes(b"fictional-existing-database")
            with patch("django.setup"), patch("django.db.connections") as connections, patch("django.db.migrations.executor.MigrationExecutor") as executor, patch("django.core.management.call_command") as command:
                connections.__getitem__.return_value.settings_dict = {"NAME": str(database)}
                executor.return_value.migration_plan.return_value = [object()]
                entry["prepare_database"]()
                self.assertEqual([call.args[0] for call in command.call_args_list], ["backup_db", "migrate"])
                command.reset_mock()
                command.side_effect = CommandError("Fictional backup failure")
                with self.assertRaises(CommandError):
                    entry["prepare_database"]()
                command.assert_called_once_with("backup_db", keep=0)
                command.reset_mock()
                executor.return_value.migration_plan.return_value = []
                entry["prepare_database"]()
                command.assert_not_called()


@override_settings(
    LOGIN_REQUIRED=False, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class MailDeliveryFailureTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="delivery@example.test", email="delivery@example.test", password="Fictional-password-42!")
    def test_dummy_backend_does_not_create_unusable_accounts(self):
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.dummy.EmailBackend"):
            response = self.client.post("/register/", {
                "email": "not-created@example.test", "password1": "Fictional-account-42!",
                "password2": "Fictional-account-42!", "privacy_consent": "on",
            })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(get_user_model().objects.filter(email="not-created@example.test").exists())

    def test_password_recovery_does_not_log_provider_exception_content(self):
        with patch("pages.account_views.EmailMultiAlternatives.send", side_effect=OSError("private-provider-response")):
            with self.assertLogs("pages.account_views", level="WARNING") as logs:
                response = self.client.post("/password-reset/", {"email": self.user.email})
        self.assertEqual(response.status_code, 302)
        self.assertNotIn("private-provider-response", " ".join(logs.output))
