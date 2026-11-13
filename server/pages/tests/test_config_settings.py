import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase
from dotenv import load_dotenv, set_key


SETTINGS_FILE = Path(settings.BASE_DIR) / "config" / "settings.py"


class PortfolioSettingsTests(SimpleTestCase):
    def load_settings(self, directory, overrides=None, local_values=None, create_local=True):
        sample = directory / ".env.example"
        sample.write_text(
            "SECRET_KEY=fake-settings-sample-secret\n"
            "DEBUG=True\n"
            "ALLOWED_HOSTS=localhost,127.0.0.1\n"
            "CSRF_TRUSTED_ORIGINS=http://localhost:8000\n"
            "ADMIN_URL=admin-local/\n"
            "AUTH_URL_PREFIX=sample-auth/\n"
            "PASSWORD_RESET_INVALID_URL=sample-auth/reset/\n"
            "PASSWORD_RESET_URL=sample-password-reset/\n"
            "PASSWORD_RESET_DONE_URL=sample-password-reset/done/\n"
            "PASSWORD_RESET_CONFIRM_PREFIX=sample-reset/\n"
            "PASSWORD_RESET_COMPLETE_URL=sample-reset/done/\n"
            f"DB_PATH={directory / 'sample.sqlite3'}\n",
            encoding="utf-8",
        )
        if create_local:
            local = directory / ".env.local"
            local.write_text(sample.read_text(encoding="utf-8"), encoding="utf-8")
            for key, value in (local_values or {}).items():
                set_key(local, key, value)
        environment = {
            "DB_BACKUP_PATH": str(directory / "backups"),
            "STATIC_ROOT": str(directory / "static"),
            "MEDIA_ROOT": str(directory / "media"),
            **(overrides or {}),
        }
        namespace = {
            "__file__": str(SETTINGS_FILE),
            "__name__": "config.settings_probe",
            "__package__": "config",
        }
        with patch.dict(os.environ, environment, clear=True), patch(
            "dotenv.load_dotenv",
            side_effect=lambda path, **kwargs: load_dotenv(directory / Path(path).name, **kwargs),
        ):
            exec(compile(SETTINGS_FILE.read_text(encoding="utf-8"), str(SETTINGS_FILE), "exec"), namespace)
        return namespace

    def test_local_file_keeps_copied_defaults_and_uses_local_adjustments(self):
        with TemporaryDirectory() as temporary:
            configured = self.load_settings(Path(temporary), local_values={
                "ALLOWED_HOSTS": "local.portfolio.example.test",
                "CSRF_TRUSTED_ORIGINS": "http://local.portfolio.example.test:8000",
            })
            self.assertEqual(configured["ALLOWED_HOSTS"], ["local.portfolio.example.test"])
            self.assertIn(
                "http://local.portfolio.example.test:8000",
                configured["CSRF_TRUSTED_ORIGINS"],
            )
            self.assertNotIn("http://localhost:8000", configured["CSRF_TRUSTED_ORIGINS"])
            self.assertEqual(configured["SECRET_KEY"], "fake-settings-sample-secret")
            self.assertTrue(configured["DEBUG"])

    def test_explicit_process_values_override_local_values(self):
        with TemporaryDirectory() as temporary:
            configured = self.load_settings(Path(temporary), {
                "ALLOWED_HOSTS": "process.portfolio.example.test",
                "CSRF_TRUSTED_ORIGINS": "http://process.portfolio.example.test:8000",
            }, local_values={
                "ALLOWED_HOSTS": "local.portfolio.example.test",
                "CSRF_TRUSTED_ORIGINS": "http://local.portfolio.example.test:8000",
            })
            self.assertEqual(configured["ALLOWED_HOSTS"], ["process.portfolio.example.test"])
            self.assertIn(
                "http://process.portfolio.example.test:8000",
                configured["CSRF_TRUSTED_ORIGINS"],
            )
            self.assertNotIn(
                "http://local.portfolio.example.test:8000",
                configured["CSRF_TRUSTED_ORIGINS"],
            )

    def test_explicit_process_values_override_copied_defaults_without_hosting_markers(self):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary)
            configured = self.load_settings(directory, {
                "SECRET_KEY": "fake-explicit-settings-secret",
                "DEBUG": "False",
                "ALLOWED_HOSTS": "portfolio.example.test",
                "DB_PATH": str(directory / "selected.sqlite3"),
            })
            self.assertEqual(configured["SECRET_KEY"], "fake-explicit-settings-secret")
            self.assertFalse(configured["DEBUG"])
            self.assertEqual(configured["ALLOWED_HOSTS"], ["portfolio.example.test"])
            self.assertEqual(configured["DB_PATH"], directory / "selected.sqlite3")

    def test_legacy_files_do_not_supplement_the_local_file(self):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for name in (".env", ".env.orig"):
                (directory / name).write_text("DJANGO_SECRET_KEY=fake-legacy-secret\n", encoding="utf-8")
            configured = self.load_settings(directory)
        self.assertEqual(configured["SECRET_KEY"], "fake-settings-sample-secret")

    def test_missing_local_file_does_not_load_template_or_legacy_files(self):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for name in (".env", ".env.orig"):
                (directory / name).write_text("DJANGO_SECRET_KEY=fake-legacy-secret\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "SECRET_KEY"):
                self.load_settings(directory, create_local=False)

    def test_test_runner_can_select_template_without_loading_local_values(self):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary)
            configured = self.load_settings(directory, {
                "DJANGO_ENV_FILE": str(directory / ".env.example"),
            }, local_values={"DJANGO_SECRET_KEY": "fake-private-local-secret", "DEBUG": "False"})
        self.assertEqual(configured["SECRET_KEY"], "fake-settings-sample-secret")
        self.assertTrue(configured["DEBUG"])

    def test_debug_keeps_configured_hosts_and_adds_only_development_csrf_origins(self):
        with TemporaryDirectory() as temporary:
            configured = self.load_settings(Path(temporary))
            self.assertTrue(configured["DEBUG"])
            self.assertEqual(configured["ALLOWED_HOSTS"], ["localhost", "127.0.0.1"])
            self.assertIn("http://127.0.0.1:5173", configured["CSRF_TRUSTED_ORIGINS"])

    def test_production_accepts_explicit_standard_authentication_paths(self):
        paths = {
            "ADMIN_URL": "admin/",
            "AUTH_URL_PREFIX": "auth/",
            "PASSWORD_RESET_INVALID_URL": "auth/reset/",
            "PASSWORD_RESET_URL": "password-reset/",
            "PASSWORD_RESET_DONE_URL": "password-reset/done/",
            "PASSWORD_RESET_CONFIRM_PREFIX": "reset/",
            "PASSWORD_RESET_COMPLETE_URL": "reset/done/",
        }
        with TemporaryDirectory() as temporary:
            configured = self.load_settings(Path(temporary), {"DEBUG": "False", **paths})
        self.assertFalse(configured["DEBUG"])
        for key, value in paths.items():
            with self.subTest(key=key):
                self.assertEqual(configured[key], value)

    def test_payment_environment_values_cannot_enable_demo_transactions(self):
        with TemporaryDirectory() as temporary:
            configured = self.load_settings(Path(temporary), {
                "PORTFOLIO_DEMO_MODE": "False",
                "PAYMENT_BANK_TRANSFER_ENABLED": "True",
                "PAYPAL_INVOICE_CHECKOUT_ENABLED": "True",
                "PAYPAL_MODE": "live",
                "PAYPAL_CLIENT_ID": "fake-paypal-client",
                "PAYPAL_CLIENT_SECRET": "fake-paypal-secret",
                "STRIPE_SECRET_KEY": "fake-stripe-secret",
            })
            self.assertTrue(configured["PORTFOLIO_DEMO_MODE"])
            self.assertFalse(configured["PAYMENT_BANK_TRANSFER_ENABLED"])
            self.assertFalse(configured["PAYPAL_INVOICE_CHECKOUT_ENABLED"])
            self.assertEqual(configured["PAYPAL_MODE"], "sandbox")
