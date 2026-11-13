from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

from django.core import mail
from django.test import SimpleTestCase, override_settings

from pages.modules.mail import send_notification_email


@override_settings(EMAIL_HOST="", DEFAULT_FROM_EMAIL="noreply@example.com")
class PortfolioNotificationMailTests(SimpleTestCase):
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend")
    def test_console_demo_notification_does_not_open_smtp(self):
        output = StringIO()
        with patch("smtplib.SMTP") as smtp, redirect_stdout(output):
            sent = send_notification_email("Demo-Kontakt", "Beispielnachricht", "demo@example.com")
        self.assertTrue(sent)
        self.assertIn("Beispielnachricht", output.getvalue())
        smtp.assert_not_called()

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_local_notification_backend_needs_no_smtp_host(self):
        with patch("smtplib.SMTP") as smtp:
            sent = send_notification_email("Demo-Kontakt", "Beispielnachricht", "demo@example.com")
        self.assertTrue(sent)
        self.assertEqual(mail.outbox[0].to, ["demo@example.com"])
        smtp.assert_not_called()

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
    def test_unconfigured_smtp_stays_disabled(self):
        with patch("smtplib.SMTP") as smtp:
            self.assertFalse(send_notification_email("Demo-Kontakt", "Beispielnachricht", "demo@example.com"))
        smtp.assert_not_called()
