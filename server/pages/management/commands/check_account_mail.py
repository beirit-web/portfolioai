"""Validate account SMTP configuration; optionally authenticate without sending."""

from datetime import datetime, timezone
from email.utils import format_datetime, make_msgid, parseaddr
from ipaddress import ip_address
import smtplib
import socket
import ssl
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage, get_connection
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email


def smtp_failure_message(error):
    """Explain the failure without exposing a provider response or credentials."""
    code = getattr(error, "smtp_code", None)
    status = f", SMTP {code}" if type(code) is int and 100 <= code <= 599 else ""
    detail = f"({type(error).__name__}{status})"
    if isinstance(error, smtplib.SMTPAuthenticationError):
        hint = "SMTP-Anmeldung abgelehnt. Vollständige Postfachadresse und das Passwort dieses Postfachs prüfen."
    elif isinstance(error, ssl.SSLCertVerificationError):
        hint = "TLS-Zertifikat konnte nicht geprüft werden. Systemzeit und Zertifikate prüfen; Zertifikatsprüfung nicht ausschalten."
    elif isinstance(error, socket.gaierror):
        hint = "Mailserver konnte per DNS nicht aufgelöst werden. Servername und Netzwerk prüfen."
    elif isinstance(error, (TimeoutError, ConnectionError)):
        hint = "Mailserver nicht erreichbar oder Zeitüberschreitung. Netzwerk und SMTP-Port prüfen."
    elif isinstance(error, smtplib.SMTPRecipientsRefused):
        hint = "SMTP-Server hat die Empfängeradresse abgelehnt. Postfach und Empfängeradresse prüfen."
    elif isinstance(error, smtplib.SMTPSenderRefused):
        hint = "SMTP-Server hat die Absenderadresse abgelehnt. Freigabe der Absenderadresse beim Anbieter prüfen."
    elif isinstance(error, smtplib.SMTPDataError):
        hint = "SMTP-Server hat die Nachricht abgelehnt. Den SMTP-Status beim Anbieter prüfen."
    else:
        hint = "SMTP-Prüfung fehlgeschlagen. Verbindung und Anbietereinstellungen prüfen."
    return f"{hint} {detail} Keine Zugangsdaten oder Serverantworten ausgegeben."


class Command(BaseCommand):
    help = "Check account mail settings; --connect checks TLS and SMTP login without sending mail."

    def add_arguments(self, parser):
        parser.add_argument("--connect", action="store_true")
        parser.add_argument("--send-test", action="store_true", help="Explicitly send one test message to DEFAULT_FROM_EMAIL.")

    def handle(self, *args, **options):
        errors = []
        if not settings.ACCOUNT_EMAIL_DELIVERY_ENABLED:
            errors.append("ACCOUNT_EMAIL_DELIVERY_ENABLED must be true.")
        if settings.LOCAL_ACCOUNT_ACTIVATION_ENABLED:
            errors.append("Disable LOCAL_ACCOUNT_ACTIVATION_ENABLED for real mail.")
        if settings.EMAIL_BACKEND != "django.core.mail.backends.smtp.EmailBackend":
            errors.append("Use django.core.mail.backends.smtp.EmailBackend.")
        for key in ("EMAIL_HOST", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD"):
            if not getattr(settings, key, ""):
                errors.append(f"{key} is missing.")
        if bool(settings.EMAIL_USE_TLS) == bool(settings.EMAIL_USE_SSL):
            errors.append("Enable exactly one of EMAIL_USE_TLS or EMAIL_USE_SSL.")
        if settings.EMAIL_SSL_SKIP_VERIFY:
            errors.append("EMAIL_SSL_SKIP_VERIFY must be false.")
        if not settings.EMAIL_TIMEOUT or settings.EMAIL_TIMEOUT <= 0:
            errors.append("EMAIL_TIMEOUT must be positive.")
        if not 1 <= settings.EMAIL_PORT <= 65535:
            errors.append("EMAIL_PORT must be between 1 and 65535.")
        try:
            validate_email(parseaddr(settings.DEFAULT_FROM_EMAIL)[1])
        except ValidationError:
            errors.append("DEFAULT_FROM_EMAIL must contain a valid sender address.")
        try:
            origin = urlsplit(settings.SITE_URL)
            host = origin.hostname
            port = origin.port
        except ValueError:
            raise CommandError("SITE_URL must be a valid trusted HTTPS origin.") from None
        loopback = host in {"localhost", "localhost.localdomain"} or bool(host and host.endswith(".localhost"))
        try:
            address = ip_address(host or "")
            loopback = loopback or address.is_loopback or address.is_unspecified
        except ValueError:
            pass
        local = settings.DEBUG and host in {"localhost", "127.0.0.1", "::1"}
        if not host or origin.username or origin.password or port == 0 or origin.path not in ("", "/") or origin.query or origin.fragment or (loopback and not local) or (origin.scheme != "https" and not (local and origin.scheme == "http")):
            errors.append("SITE_URL must be a trusted HTTPS origin (HTTP loopback is allowed only with DEBUG).")
        if settings.PASSWORD_RESET_USE_HTTPS is False and not local:
            errors.append("PASSWORD_RESET_USE_HTTPS must not disable HTTPS for public accounts.")
        if errors:
            raise CommandError("\n".join(errors))
        self.stdout.write(self.style.SUCCESS("SMTP-Konfiguration vollständig. Noch keine Nachricht gesendet."))
        if options["connect"]:
            try:
                with get_connection(fail_silently=False):
                    pass
            except Exception as error:
                raise CommandError(smtp_failure_message(error)) from None
            self.stdout.write(self.style.SUCCESS("TLS-Verbindung und SMTP-Anmeldung erfolgreich."))
            if not options["send_test"]:
                self.stdout.write("Keine Testmail gesendet: Dafür zusätzlich --send-test verwenden.")
        if options["send_test"]:
            sender = parseaddr(settings.DEFAULT_FROM_EMAIL)[1]
            sent_at = datetime.now(timezone.utc)
            message_id = make_msgid(domain=sender.rsplit("@", 1)[1])
            self.stdout.write("Testmail wird gesendet. Betreff: Beirit Web: SMTP-Test")
            self.stdout.write(f"Versandzeit (UTC): {sent_at.isoformat(timespec='seconds')}")
            self.stdout.write(f"Message-ID: {message_id}")
            try:
                message = EmailMessage(
                    "Beirit Web: SMTP-Test",
                    "Dies ist die angeforderte Testnachricht für den Kontoversand. Prüfen Sie den Eingang und den Spamordner.\n"
                    f"Referenz: {message_id}\n",
                    settings.DEFAULT_FROM_EMAIL, [sender],
                    headers={"Message-ID": message_id, "Date": format_datetime(sent_at)},
                )
                accepted = message.send(fail_silently=False)
            except Exception as error:
                raise CommandError(smtp_failure_message(error)) from None
            if accepted != 1:
                raise CommandError("Das Mail-Backend hat die Testnachricht nicht angenommen.")
            self.stdout.write(self.style.SUCCESS("SMTP-Server hat die Testmail angenommen. Das bestätigt noch keine Zustellung: Im Absenderpostfach nach 'Beirit Web: SMTP-Test' suchen, einschließlich Spamordner."))
