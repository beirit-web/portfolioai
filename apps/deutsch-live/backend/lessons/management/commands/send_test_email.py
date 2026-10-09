import json

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


LOCAL_EMAIL_BACKENDS = ("console", "dummy", "locmem", "filebased")


class Command(BaseCommand):
    help = "Send a DeutschLive transactional email test to verify SMTP delivery."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Recipient address for the delivery test.")
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")
        parser.add_argument(
            "--allow-local-backend",
            action="store_true",
            help="Allow console/locmem/filebased backends for local verification. This is not a production delivery test.",
        )

    def handle(self, *args, **options):
        recipient = str(options["to"]).strip()
        try:
            validate_email(recipient)
        except ValidationError as exc:
            raise CommandError("Provide a valid recipient email address.") from exc

        backend = str(getattr(settings, "EMAIL_BACKEND", "") or "")
        backend_lower = backend.lower()
        is_local_backend = any(name in backend_lower for name in LOCAL_EMAIL_BACKENDS)
        if is_local_backend and not options["allow_local_backend"]:
            raise CommandError("EMAIL_BACKEND is local-only. Set SMTP for production or pass --allow-local-backend for local checks.")

        from_email = str(getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
        if not from_email:
            raise CommandError("DEFAULT_FROM_EMAIL must be set before sending a test email.")

        public_url = str(getattr(settings, "DEUTSCHLIVE_PUBLIC_URL", "") or "").strip()
        subject = "DeutschLive: SMTP-Zustelltest"
        body = (
            "Здравствуйте!\n\n"
            "Dies ist ein technischer Zustelltest fuer DeutschLive.\n\n"
            f"Backend: {backend}\n"
            f"Absender: {from_email}\n"
            f"App-URL: {public_url or 'nicht gesetzt'}\n\n"
            "Wenn diese Mail im erwarteten Postfach angekommen ist, funktioniert der konfigurierte Mailversand.\n"
        )

        email = EmailMessage(subject=subject, body=body, from_email=from_email, to=[recipient])
        sent_count = email.send(fail_silently=False)

        payload = {
            "ok": sent_count == 1,
            "recipient": recipient,
            "fromEmail": from_email,
            "backend": backend,
            "realDeliveryBackend": not is_local_backend,
            "sentCount": sent_count,
        }

        if options["as_json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
            return

        marker = "OK" if payload["ok"] else "WARN"
        self.stdout.write(f"[{marker}] Sent test email to {recipient} via {backend}.")
        if is_local_backend:
            self.stdout.write("[WARN] Local backend used; this does not prove production inbox delivery.")
