import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Check DeutschLive production readiness settings."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")
        parser.add_argument("--fail-on-warning", action="store_true", help="Return non-zero when warnings exist.")

    def handle(self, *args, **options):
        checks = build_production_checks()
        failures = [item for item in checks if item["level"] == "error"]
        warnings = [item for item in checks if item["level"] == "warning"]

        payload = {
            "ok": not failures,
            "failureCount": len(failures),
            "warningCount": len(warnings),
            "checks": checks,
        }

        if options["as_json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            for item in checks:
                marker = {"ok": "OK", "warning": "WARN", "error": "ERROR"}[item["level"]]
                self.stdout.write(f"[{marker}] {item['code']}: {item['message']}")

        if failures or (options["fail_on_warning"] and warnings):
            raise SystemExit(1)


def build_production_checks():
    checks = []

    def add(level, code, message):
        checks.append({"level": level, "code": code, "message": message})

    if settings.DEBUG:
        add("error", "debug_enabled", "DJANGO_DEBUG must be false for production.")
    else:
        add("ok", "debug_disabled", "DJANGO_DEBUG is false.")

    if not settings.ALLOWED_HOSTS or "*" in settings.ALLOWED_HOSTS:
        add("error", "allowed_hosts", "DJANGO_ALLOWED_HOSTS must list explicit production hosts.")
    else:
        add("ok", "allowed_hosts", "DJANGO_ALLOWED_HOSTS is explicit.")

    csrf_origins = getattr(settings, "CSRF_TRUSTED_ORIGINS", [])
    if not csrf_origins:
        add("error", "csrf_origins", "DJANGO_CSRF_TRUSTED_ORIGINS must include production origin(s).")
    elif not all(origin.startswith("https://") for origin in csrf_origins):
        add("warning", "csrf_origins_https", "CSRF trusted origins should use https:// in production.")
    else:
        add("ok", "csrf_origins", "CSRF trusted origins are configured.")

    if settings.SESSION_COOKIE_SECURE and settings.CSRF_COOKIE_SECURE:
        add("ok", "secure_cookies", "Session and CSRF cookies are secure.")
    else:
        add("error", "secure_cookies", "Session and CSRF cookies must be secure in production.")

    if settings.SECURE_SSL_REDIRECT:
        add("ok", "ssl_redirect", "SSL redirect is enabled.")
    else:
        add("error", "ssl_redirect", "DJANGO_SECURE_SSL_REDIRECT must be enabled in production.")

    if settings.SECURE_HSTS_SECONDS >= 31536000:
        add("ok", "hsts", "HSTS is configured for at least one year.")
    elif settings.DEBUG:
        add("warning", "hsts", "HSTS should be set to at least 31536000 seconds before public launch.")
    else:
        add("error", "hsts", "HSTS must be set to at least 31536000 seconds in production.")

    if getattr(settings, "SECURE_PROXY_SSL_HEADER", None):
        add("ok", "proxy_ssl_header", "Proxy SSL header is configured.")
    elif settings.DEBUG:
        add("warning", "proxy_ssl_header", "Production behind a proxy should trust X-Forwarded-Proto.")
    else:
        add("error", "proxy_ssl_header", "DJANGO_USE_X_FORWARDED_PROTO must be enabled behind the production proxy.")

    default_db = settings.DATABASES.get("default", {})
    if "postgresql" in default_db.get("ENGINE", ""):
        add("ok", "database", "Production database uses PostgreSQL.")
        if default_db.get("CONN_HEALTH_CHECKS"):
            add("ok", "database_health_checks", "Database connection health checks are enabled.")
        else:
            add("warning", "database_health_checks", "PostgreSQL connection health checks should be enabled.")
        if default_db.get("OPTIONS", {}).get("sslmode") == "require":
            add("ok", "database_ssl", "PostgreSQL SSL mode is required.")
        else:
            add("warning", "database_ssl", "PostgreSQL should require SSL in production.")
    elif settings.DEBUG:
        add("warning", "database", "Production should use PostgreSQL instead of SQLite.")
    else:
        add("error", "database", "Production must use PostgreSQL instead of SQLite.")

    backup_strategy = getattr(settings, "DATABASE_BACKUP_STRATEGY", "")
    backup_retention_days = getattr(settings, "DATABASE_BACKUP_RETENTION_DAYS", 0)
    if backup_strategy and backup_retention_days >= 7:
        add("ok", "database_backup", "Database backup strategy and retention are configured.")
    elif settings.DEBUG:
        add("warning", "database_backup", "Define DATABASE_BACKUP_STRATEGY and DATABASE_BACKUP_RETENTION_DAYS before launch.")
    else:
        add("error", "database_backup", "DATABASE_BACKUP_STRATEGY and at least 7 retention days are required for production.")

    redis_url = str(getattr(settings, "REDIS_URL", "") or "")
    cache_backend = settings.CACHES.get("default", {}).get("BACKEND", "")
    channel_backend = settings.CHANNEL_LAYERS.get("default", {}).get("BACKEND", "")
    if "RedisCache" in cache_backend and "RedisChannelLayer" in channel_backend and redis_url.startswith(("redis://", "rediss://")):
        add("ok", "redis", "Redis is configured for cache/rate limits and channel layer.")
    elif settings.DEBUG:
        add("warning", "redis", "Production should use Redis for cache/rate limits and channel layer.")
    else:
        add("error", "redis", "Production must use Redis for cache/rate limits and channel layer.")

    email_backend = getattr(settings, "EMAIL_BACKEND", "")
    if "console" in email_backend or "dummy" in email_backend:
        add("error", "email_backend", "EMAIL_BACKEND must send real mail in production.")
    elif "smtp" in email_backend.lower() and not getattr(settings, "EMAIL_HOST", ""):
        add("error", "email_host", "EMAIL_HOST must be set when SMTP mail backend is used.")
    elif not getattr(settings, "DEFAULT_FROM_EMAIL", ""):
        add("error", "default_from_email", "DEFAULT_FROM_EMAIL must be set.")
    else:
        add("ok", "email_backend", "Transactional mail backend is configured.")

    public_url = str(getattr(settings, "DEUTSCHLIVE_PUBLIC_URL", "") or "")
    if public_url.startswith("https://"):
        add("ok", "public_url", "DEUTSCHLIVE_PUBLIC_URL uses HTTPS.")
    else:
        add("warning", "public_url", "DEUTSCHLIVE_PUBLIC_URL should use the production HTTPS URL.")

    has_security_headers = (
        getattr(settings, "SECURE_CONTENT_TYPE_NOSNIFF", False)
        and getattr(settings, "X_FRAME_OPTIONS", "") == "DENY"
        and bool(getattr(settings, "SECURE_REFERRER_POLICY", ""))
        and bool(getattr(settings, "SECURITY_CONTENT_SECURITY_POLICY", ""))
        and bool(getattr(settings, "SECURITY_PERMISSIONS_POLICY", ""))
        and bool(getattr(settings, "SECURITY_CROSS_ORIGIN_OPENER_POLICY", ""))
    )
    if has_security_headers:
        add("ok", "security_headers", "Basic security headers are enabled.")
    else:
        add("error", "security_headers", "Browser security headers must be enabled.")

    logging_config = getattr(settings, "LOGGING", {})
    loggers = logging_config.get("loggers", {})
    handlers = logging_config.get("handlers", {})
    if "console" in handlers and "lessons" in loggers and "lessons.security" in loggers and "lessons.request" in loggers:
        add("ok", "monitoring_logging", "Application and security logs are configured.")
    else:
        add("error", "monitoring_logging", "Application, request and security loggers must be configured.")

    monitoring_provider = getattr(settings, "MONITORING_PROVIDER", "logs")
    sentry_dsn = getattr(settings, "SENTRY_DSN", "")
    if monitoring_provider == "sentry" and not sentry_dsn:
        add("warning", "sentry_dsn", "SENTRY_DSN should be set when MONITORING_PROVIDER=sentry.")
    else:
        add("ok", "monitoring_provider", f"Monitoring provider is set to {monitoring_provider}.")

    frontend_index = Path(getattr(settings, "WHITENOISE_ROOT", "")) / "index.html"
    if frontend_index.exists():
        add("ok", "frontend_dist", "Frontend build index.html is present.")
    else:
        add("warning", "frontend_dist", "Frontend build index.html is missing; run the frontend build before release.")

    return checks
