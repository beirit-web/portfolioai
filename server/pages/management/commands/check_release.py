"""Fail early on unsafe configuration for a public account service."""

from ipaddress import ip_address, ip_network
from pathlib import Path
from urllib.parse import urlsplit

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Check public account configuration. Does not deploy or send messages."

    def add_arguments(self, parser):
        parser.add_argument("--connect-mail", action="store_true", help="Also test SMTP TLS/authentication without sending mail.")

    def handle(self, *args, **options):
        errors = []
        if settings.DEBUG:
            errors.append("DEBUG must be false.")
        for key in ("SECURE_SSL_REDIRECT", "SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE", "CONTENT_SECURITY_POLICY_ENFORCE"):
            if not getattr(settings, key, False):
                errors.append(f"{key} must be true.")
        try:
            origin = urlsplit(settings.SITE_URL)
            host = origin.hostname
            port = origin.port
        except ValueError:
            raise CommandError("SITE_URL must be a valid public HTTPS origin.") from None
        local_host = host in {"localhost", "localhost.localdomain"} or bool(host and host.endswith(".localhost"))
        try:
            address = ip_address(host or "")
            local_host = local_host or address.is_loopback or address.is_unspecified
        except ValueError:
            pass
        if not host or local_host or origin.username or origin.password or origin.scheme != "https" or port == 0 or origin.path not in ("", "/") or origin.query or origin.fragment:
            errors.append("SITE_URL must be the public HTTPS origin without a path, query or fragment.")
        if "*" in settings.ALLOWED_HOSTS or host not in settings.ALLOWED_HOSTS:
            errors.append("ALLOWED_HOSTS must explicitly include the public hostname and must not contain '*'.")
        if settings.SITE_URL.rstrip("/") not in settings.CSRF_TRUSTED_ORIGINS:
            errors.append("CSRF_TRUSTED_ORIGINS must include SITE_URL.")
        if settings.PASSWORD_RESET_DOMAIN and settings.PASSWORD_RESET_DOMAIN != origin.netloc:
            errors.append("PASSWORD_RESET_DOMAIN must match SITE_URL or be empty.")
        if len(settings.SECRET_KEY) < 50 or len(set(settings.SECRET_KEY)) < 5 or settings.SECRET_KEY.lower().startswith(("django-insecure-", "fake-", "demo-", "example-", "replace-", "change-me")):
            errors.append("Use a private, stable, randomly generated SECRET_KEY of at least 50 characters.")
        header = getattr(settings, "CLIENT_IP_HEADER", "")
        networks = getattr(settings, "TRUSTED_PROXY_CIDRS", [])
        if header not in ("", "HTTP_FLY_CLIENT_IP", "HTTP_X_REAL_IP") or bool(header) != bool(networks):
            errors.append("Configure CLIENT_IP_HEADER together with explicit TRUSTED_PROXY_CIDRS.")
        try:
            if any(ip_network(value).prefixlen == 0 for value in networks):
                errors.append("Do not trust all addresses as proxy peers.")
        except ValueError:
            errors.append("TRUSTED_PROXY_CIDRS contains an invalid network.")
        database = settings.DATABASES["default"]
        if database["ENGINE"].endswith("sqlite3"):
            database_path = Path(database["NAME"])
            if not database_path.is_absolute() or database_path.resolve().is_relative_to("/tmp"):
                errors.append("Use an absolute SQLite path on persistent storage, outside /tmp.")
        if errors:
            raise CommandError("\n".join(errors))
        call_command("check", deploy=True, stdout=self.stdout, stderr=self.stderr)
        call_command("check_account_mail", connect=options["connect_mail"], stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS("Release configuration checks passed. Mail delivery, mounted storage, restore, legal content and host routing still require acceptance checks."))
