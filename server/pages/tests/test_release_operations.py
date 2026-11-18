from io import StringIO
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import runpy
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command, CommandError
from django.test import SimpleTestCase, override_settings
from dotenv import dotenv_values


WORKSPACE = Path(__file__).resolve().parents[3]


class BackupRestoreTests(SimpleTestCase):
    def test_private_snapshot_restores_account_data_and_rotates_only_completed_backups(self):
        with TemporaryDirectory() as directory:
            source = Path(directory) / "accounts.sqlite3"
            with sqlite3.connect(source) as connection:
                connection.execute("CREATE TABLE auth_user (id INTEGER PRIMARY KEY, email TEXT)")
                connection.execute("INSERT INTO auth_user VALUES (1, 'sample@example.test')")
            fake = SimpleNamespace(vendor="sqlite", settings_dict={"NAME": str(source)})
            # Force both names into the same timestamp and descending UUID order:
            # filename sorting used to discard the newer account snapshot.
            uuids = [SimpleNamespace(hex="ffffffff"), SimpleNamespace(hex="00000000")]
            with override_settings(DB_BACKUP_PATH=Path(directory) / "backups"), patch("pages.management.commands.backup_db.connections", {"default": fake}), patch("pages.management.commands.backup_db.datetime") as clock, patch("pages.management.commands.backup_db.uuid.uuid4", side_effect=uuids):
                clock.now.return_value = datetime(2026, 1, 1, tzinfo=timezone.utc)
                call_command("backup_db", keep=1, stdout=StringIO())
                with sqlite3.connect(source) as connection:
                    connection.execute("INSERT INTO auth_user VALUES (2, 'newer@example.test')")
                call_command("backup_db", keep=1, stdout=StringIO())
            backups = list((Path(directory) / "backups").glob("*.sqlite3"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
            restored = Path(directory) / "restored.sqlite3"
            with sqlite3.connect(backups[0]) as snapshot, sqlite3.connect(restored) as target:
                snapshot.backup(target)
                self.assertEqual(target.execute("PRAGMA integrity_check").fetchone(), ("ok",))
                self.assertEqual(target.execute("SELECT email FROM auth_user ORDER BY id").fetchall(), [("sample@example.test",), ("newer@example.test",)])

    def test_failed_snapshot_retains_previous_backup_and_removes_partial_file(self):
        with TemporaryDirectory() as directory:
            source = Path(directory) / "accounts.sqlite3"
            backup_dir = Path(directory) / "backups"
            with sqlite3.connect(source) as connection:
                connection.execute("CREATE TABLE example (id INTEGER)")
            fake = SimpleNamespace(vendor="sqlite", settings_dict={"NAME": str(source)})
            with override_settings(DB_BACKUP_PATH=backup_dir), patch("pages.management.commands.backup_db.connections", {"default": fake}):
                call_command("backup_db", keep=1, stdout=StringIO())
                original = list(backup_dir.iterdir())
                source.write_text("corrupted fictional database")
                with self.assertRaisesMessage(CommandError, "existing backups were retained"):
                    call_command("backup_db", keep=1, stdout=StringIO())
            self.assertEqual(list(backup_dir.iterdir()), original)


@override_settings(
    DEBUG=False, SECURE_SSL_REDIRECT=True, SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True,
    CONTENT_SECURITY_POLICY_ENFORCE=True, SITE_URL="https://portfolio.example.test",
    ALLOWED_HOSTS=["portfolio.example.test"], CSRF_TRUSTED_ORIGINS=["https://portfolio.example.test"],
    SECRET_KEY="fictional-test-secret-with-a-long-length-0123456789-abcdef",
    PASSWORD_RESET_DOMAIN="", CLIENT_IP_HEADER="", TRUSTED_PROXY_CIDRS=[],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "/data/db.sqlite3"}},
)
class ReleaseCheckTests(SimpleTestCase):
    def test_checks_configuration_without_sending_mail_or_deploying(self):
        with patch("pages.management.commands.check_release.call_command") as command:
            call_command("check_release", stdout=StringIO())
        self.assertEqual([call.args[0] for call in command.call_args_list], ["check", "check_account_mail"])
        self.assertFalse(command.call_args.kwargs["connect"])

    def test_rejects_insecure_runtime_and_mismatched_reset_links(self):
        cases = [dict(DEBUG=True), dict(PASSWORD_RESET_DOMAIN="localhost:8000"), dict(ALLOWED_HOSTS=["*"]), dict(CLIENT_IP_HEADER="HTTP_X_FORWARDED_FOR"), dict(CLIENT_IP_HEADER="HTTP_FLY_CLIENT_IP", TRUSTED_PROXY_CIDRS=["0.0.0.0/0"])]
        for values in cases:
            with self.subTest(values=values), self.settings(**values), patch("pages.management.commands.check_release.call_command") as command:
                with self.assertRaises(CommandError):
                    call_command("check_release", stdout=StringIO())
                command.assert_not_called()

    def test_rejects_nonpublic_or_malformed_origins_before_other_checks(self):
        for origin in ("https://localhost", "https://127.0.0.1", "https://[::1]", "https://accounts.localhost", "https://user:private@portfolio.example.test", "https://portfolio.example.test:invalid", "https://portfolio.example.test:0", "https://[invalid", "https://portfolio.example.test/path", "https://portfolio.example.test/?redirect=private"):
            with self.subTest(origin=origin), self.settings(SITE_URL=origin), patch("pages.management.commands.check_release.call_command") as command:
                with self.assertRaises(CommandError):
                    call_command("check_release", stdout=StringIO())
                command.assert_not_called()

    def test_rejects_temporary_database_after_path_resolution(self):
        with self.settings(DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "/data/../tmp/accounts.sqlite3"}}):
            with self.assertRaisesMessage(CommandError, "persistent storage"):
                call_command("check_release", stdout=StringIO())


@override_settings(
    DEBUG=False, ACCOUNT_EMAIL_DELIVERY_ENABLED=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", EMAIL_HOST="smtp.example.test",
    EMAIL_HOST_USER="accounts@example.test", EMAIL_HOST_PASSWORD="fictional-mail-password",
    DEFAULT_FROM_EMAIL="accounts@example.test", EMAIL_USE_TLS=True, EMAIL_USE_SSL=False,
    EMAIL_SSL_SKIP_VERIFY=False, EMAIL_TIMEOUT=10, EMAIL_PORT=587,
    SITE_URL="https://portfolio.example.test", PASSWORD_RESET_USE_HTTPS=None,
)
class MailReleaseCheckTests(SimpleTestCase):
    def test_rejects_invalid_origin_or_port_without_sending_or_connecting(self):
        cases = [
            {"EMAIL_PORT": 0}, {"EMAIL_PORT": 65536},
            *({"SITE_URL": value} for value in (
                "https://localhost", "https://127.0.0.2", "https://0.0.0.0",
                "https://portfolio.example.test:invalid", "https://[invalid",
                "https://portfolio.example.test/path", "https://portfolio.example.test/?private=value",
            )),
        ]
        for values in cases:
            with self.subTest(values=values), self.settings(**values), patch("pages.management.commands.check_account_mail.get_connection") as connection, patch("pages.management.commands.check_account_mail.EmailMessage.send") as send:
                with self.assertRaises(CommandError):
                    call_command("check_account_mail", connect=True, send_test=True, stdout=StringIO())
                connection.assert_not_called()
                send.assert_not_called()

    def test_local_development_origin_is_allowed_only_with_debug(self):
        with self.settings(DEBUG=True, SITE_URL="http://localhost:8001"):
            call_command("check_account_mail", stdout=StringIO())

    def test_send_test_requires_explicit_flag_and_uses_only_configured_sender(self):
        output = StringIO()
        with patch("pages.management.commands.check_account_mail.EmailMessage.send", autospec=True, return_value=1) as send:
            call_command("check_account_mail", stdout=StringIO())
            send.assert_not_called()
            call_command("check_account_mail", send_test=True, stdout=output)
        send.assert_called_once()
        message = send.call_args.args[0]
        self.assertEqual(message.to, ["accounts@example.test"])
        self.assertTrue(message.extra_headers["Message-ID"].endswith("@example.test>"))
        serialized = message.message()
        self.assertEqual(serialized["Message-ID"], message.extra_headers["Message-ID"])
        self.assertEqual(serialized["Date"], message.extra_headers["Date"])
        self.assertIn(message.extra_headers["Message-ID"], output.getvalue())
        self.assertIn("Versandzeit (UTC):", output.getvalue())
        self.assertNotIn("fictional-mail-password", output.getvalue())


class ContainerConfigurationTests(SimpleTestCase):
    def test_runtime_mail_opt_in_preserves_smtp_but_cannot_enable_other_features(self):
        source = """
import json
import container_settings as settings
print(json.dumps({key: getattr(settings, key) for key in (
    'DEBUG', 'ACCOUNT_EMAIL_DELIVERY_ENABLED', 'EMAIL_BACKEND',
    'LOCAL_ACCOUNT_ACTIVATION_ENABLED', 'USER_UPLOADS_ENABLED',
    'SESSION_COOKIE_SECURE', 'CSRF_COOKIE_SECURE', 'CONTENT_SECURITY_POLICY_ENFORCE',
)}))
"""
        with TemporaryDirectory() as directory:
            environment = {
                **os.environ,
                **{key: value for key, value in dotenv_values(WORKSPACE / "server/.env.example").items() if value is not None},
                "PYTHONPATH": os.pathsep.join([str(WORKSPACE / "server"), str(WORKSPACE / "scripts")]),
                "DJANGO_ENV_FILE": str(Path(directory) / "unused.env"),
                "DB_PATH": str(Path(directory) / "db.sqlite3"),
                "DB_BACKUP_PATH": str(Path(directory) / "backups"),
                "MEDIA_ROOT": str(Path(directory) / "media"),
                "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
                "LOCAL_ACCOUNT_ACTIVATION_ENABLED": "true", "USER_UPLOADS_ENABLED": "true",
            }
            for enabled in (False, True):
                with self.subTest(enabled=enabled):
                    result = subprocess.run([sys.executable, "-c", source], env={**environment, "ACCOUNT_EMAIL_DELIVERY_ENABLED": str(enabled)}, check=True, capture_output=True, text=True)
                    actual = json.loads(result.stdout)
                    self.assertEqual(actual["ACCOUNT_EMAIL_DELIVERY_ENABLED"], enabled)
                    self.assertEqual(actual["EMAIL_BACKEND"], f"django.core.mail.backends.{'smtp' if enabled else 'dummy'}.EmailBackend")
                    for key in ("DEBUG", "LOCAL_ACCOUNT_ACTIVATION_ENABLED", "USER_UPLOADS_ENABLED"):
                        self.assertFalse(actual[key], key)
                    for key in ("SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE", "CONTENT_SECURITY_POLICY_ENFORCE"):
                        self.assertTrue(actual[key], key)

    def test_entrypoint_resolves_empty_and_relative_paths_consistently(self):
        entrypoint = runpy.run_path(str(WORKSPACE / "scripts/container-entrypoint.py"))
        with patch.dict(os.environ, {"DB_PATH": "   "}):
            self.assertEqual(entrypoint["runtime_path"]("DB_PATH", "/data/db.sqlite3", Path("/code")), Path("/data/db.sqlite3"))
        with patch.dict(os.environ, {"DB_PATH": "data/../db.sqlite3"}):
            self.assertEqual(entrypoint["runtime_path"]("DB_PATH", "/data/db.sqlite3", Path("/code")), Path("/code/db.sqlite3"))

    @override_settings(ACCOUNT_EMAIL_DELIVERY_ENABLED=True)
    def test_invalid_mail_opt_in_stops_before_migrations_or_web_server(self):
        entrypoint = runpy.run_path(str(WORKSPACE / "scripts/container-entrypoint.py"))
        with TemporaryDirectory() as directory:
            environment = {
                "APP_DIR": directory, "DB_PATH": str(Path(directory) / "accounts.sqlite3"),
                "DB_BACKUP_PATH": str(Path(directory) / "backups"), "MEDIA_ROOT": str(Path(directory) / "media"),
                "DJANGO_SECRET_KEY": "fictional-container-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
            }
            with patch.dict(os.environ, environment), patch("os.chdir"), patch("os.umask"), patch("os.geteuid", return_value=10001), patch("django.setup"), patch("django.core.management.call_command", side_effect=CommandError("Invalid public account configuration")) as command, patch("django.db.migrations.executor.MigrationExecutor") as migrations, patch("os.execvp") as execute:
                with self.assertRaisesMessage(CommandError, "Invalid public account configuration"):
                    entrypoint["main"]()
                command.assert_called_once_with("check_release")
                migrations.assert_not_called()
                execute.assert_not_called()
            self.assertFalse(Path(environment["DB_PATH"]).exists())
