"""
Production settings example (env-driven, no secrets hardcoded).
Copy to config/settings.production.py and set
DJANGO_SETTINGS_MODULE=config.settings.production.
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from .deutschlive_settings import *  # noqa: F403

from .env import (
    env,
    env_bool,
    env_bool_first,
    env_first,
    env_int,
    env_list_first,
    env_path,
    env_path_fragment,
    require_env,
    require_env_list,
)


def _ensure_dir(path: Path) -> Path:
    """Create directory if missing and return the path (for fluent usage)."""
    path.mkdir(parents=True, exist_ok=True)
    return path


BASE_DIR = Path(__file__).resolve().parent.parent


def _has_platform_env() -> bool:
    """
    Detect when the app is running with hosting/platform-managed settings.
    In that case `.env` should only fill gaps and must not override them.
    """
    platform_keys = (
        "DJANGO_SECRET_KEY",
        "DJANGO_DEBUG",
        "DJANGO_ALLOWED_HOSTS",
        "CSRF_TRUSTED_ORIGINS",
        "RENDER",
        "RENDER_EXTERNAL_HOSTNAME",
    )
    return any((os.environ.get(key) or "").strip() for key in platform_keys)


# Local development should still be able to override ambient shell vars
# like `DEBUG=release`, while real platform config must take precedence.
load_dotenv(BASE_DIR / ".env", override=not _has_platform_env())

# Core security
SECRET_KEY = require_env(["DJANGO_SECRET_KEY", "SECRET_KEY"])
DEBUG = env_bool_first(["DJANGO_DEBUG", "DEBUG"], False)
NODE_ENV = env("NODE_ENV", "production")

ALLOWED_HOSTS = require_env_list(["DJANGO_ALLOWED_HOSTS", "ALLOWED_HOSTS"])
CSRF_TRUSTED_ORIGINS = require_env_list(["CSRF_TRUSTED_ORIGINS"])

# Local development often runs on changing LAN IPs such as 192.168.x.x.
# Django validates the Host header before our middleware runs, so allow
# arbitrary local hosts only in DEBUG mode and keep production strict.
if DEBUG:
    ALLOWED_HOSTS = ["*"]
elif "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

SITE_URL = str(env("SITE_URL", "") or "").strip().rstrip("/")
if not SITE_URL:
    SITE_URL = "http://localhost:8000" if DEBUG else "https://sprachservice.example.com"
PORTFOLIO_DEMO_MODE = True
SITE_HOST = urlparse(SITE_URL).netloc or SITE_URL
REDIRECT_OLD_HOSTS = [
    host.strip().lower()
    for host in env_list_first(["REDIRECT_OLD_HOSTS"], default=[])
    if host.strip()
]

# Application definition
INSTALLED_APPS = [
    "lessons.apps.LessonsConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "pages",
]

if DEBUG:
    # Route static files through WhiteNoise during local development so
    # Lighthouse on localhost sees the same cache/compression behavior.
    INSTALLED_APPS.insert(
        INSTALLED_APPS.index("django.contrib.staticfiles"),
        "whitenoise.runserver_nostatic",
    )

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "config.middleware.VersionedStaticCacheMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "config.middleware.SafeHostAndErrorMiddleware",
    "config.middleware.HostRedirectMiddleware",
    "config.middleware.MaintenanceMiddleware",
    "config.middleware.AdminIPRestrictionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "config.middleware.AuthSessionIdleTimeoutMiddleware",
    "config.middleware.LoginRequiredMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "builtins": [
                "pages.templatetags.asset_tags",
            ],
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "config.context_processors.auth_session_config",
                "config.context_processors.user_stats",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database (env-provided path, defaults to persistent ./data/)
_raw_db_path = env_path("DB_PATH", BASE_DIR / "data" / "db.sqlite3")
DB_PATH = _ensure_dir(_raw_db_path.parent) / _raw_db_path.name

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DB_PATH,
    }
}

_raw_backup_dir = env_path("DB_BACKUP_PATH", BASE_DIR / "data" / "db_backups")
DB_BACKUP_PATH = _ensure_dir(_raw_backup_dir)

# codeX: gesicherter, tokenbasierter SQLite-Export (standardmäßig aus)
# Support the legacy DB_EXPORT_* names so an older Render env can still
# expose the live SQLite export endpoint during the one-time migration.
CODEX_DB_EXPORT_ENABLED = env_bool_first(
    ["CODEX_DB_EXPORT_ENABLED", "DB_EXPORT_ENABLED"], False
)
CODEX_DB_EXPORT_TOKEN = env_first(["CODEX_DB_EXPORT_TOKEN", "DB_EXPORT_TOKEN"], "")
CODEX_DB_EXPORT_URL = env_path_fragment(
    ["CODEX_DB_EXPORT_URL", "DB_EXPORT_URL"], "codex-db-export/"
)
CODEX_DB_EXPORT_ONE_SHOT = env_bool_first(
    ["CODEX_DB_EXPORT_ONE_SHOT", "DB_EXPORT_ONE_SHOT"], True
)
if CODEX_DB_EXPORT_ENABLED and not CODEX_DB_EXPORT_TOKEN:
    raise RuntimeError("Set CODEX_DB_EXPORT_TOKEN when CODEX_DB_EXPORT_ENABLED=True")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "de"
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATICFILES_DIRS = [
    BASE_DIR / "assets",
    BASE_DIR / "hint.css-2.7.0",
]
STATIC_ROOT = _ensure_dir(env_path("STATIC_ROOT", BASE_DIR / "staticfiles"))
# Tests render source assets before collectstatic builds a manifest. Keep the
# production storage strict while letting the test runner use unhashed assets.
STATICFILES_STORAGE = (
    "django.contrib.staticfiles.storage.StaticFilesStorage"
    if "test" in sys.argv or "pytest" in sys.modules
    else "whitenoise.storage.CompressedManifestStaticFilesStorage"
)
VERSIONED_STATIC_CACHE_SECONDS = env_int("VERSIONED_STATIC_CACHE_SECONDS", 31536000)
MEDIA_URL = "/media/"
MEDIA_ROOT = _ensure_dir(env_path("MEDIA_ROOT", BASE_DIR / "media"))

# Admin security
ADMIN_URL = env_path_fragment(
    ["DJANGO_ADMIN_URL", "ADMIN_URL"], "admin/", require_present=not DEBUG)
ADMIN_IP_WHITELIST = {ip.strip() for ip in env_list_first(
    ["DJANGO_ADMIN_IP_WHITELIST", "ADMIN_IP_WHITELIST"], default=[]) if ip.strip()}
ADMIN_SETUP_USERNAME = env_first(["DJANGO_ADMIN_NAME", "ADMIN_NAME"], "")
ADMIN_SETUP_PASSWORD = env_first(["DJANGO_ADMIN_PASSWORD", "ADMIN_PASSWORD"], "")
ADMIN_SETUP_EMAIL = env_first(["DJANGO_ADMIN_EMAIL", "ADMIN_EMAIL"], "")


def _required_path(key: str, default: str) -> str:
    """Shortcut for required path fragments with optional DJANGO_ prefix."""
    return env_path_fragment([f"DJANGO_{key}", key], default, require_present=not DEBUG)


# Password reset links
AUTH_URL_PREFIX = _required_path("AUTH_URL_PREFIX", "auth/")
PASSWORD_RESET_INVALID_URL = _required_path("PASSWORD_RESET_INVALID_URL", "auth/reset/")
PASSWORD_RESET_URL = _required_path("PASSWORD_RESET_URL", "password-reset/")
PASSWORD_RESET_DONE_URL = _required_path("PASSWORD_RESET_DONE_URL", "password-reset/done/")
PASSWORD_RESET_CONFIRM_PREFIX = _required_path("PASSWORD_RESET_CONFIRM_PREFIX", "reset/")
PASSWORD_RESET_COMPLETE_URL = _required_path("PASSWORD_RESET_COMPLETE_URL", "reset/done/")
PASSWORD_RESET_DOMAIN = env("PASSWORD_RESET_DOMAIN", "")
_reset_https = env("PASSWORD_RESET_USE_HTTPS", "")
PASSWORD_RESET_USE_HTTPS = (
    None if not _reset_https else env_bool("PASSWORD_RESET_USE_HTTPS", False)
)
PASSWORD_RESET_TIMEOUT = 3600
PASSWORD_RESET_EMAIL_TEMPLATE_NAME = "registration/password_reset_email.html"
PASSWORD_RESET_SUBJECT_TEMPLATE_NAME = "registration/password_reset_subject.txt"
EMAIL_VERIFICATION_TIMEOUT = env_int("EMAIL_VERIFICATION_TIMEOUT", 60 * 60 * 24 * 3)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

PROFILE_IMAGE_URL = env("PROFILE_IMAGE_URL", "")

# Security toggles (production defaults hardened)
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", True)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", True)
SESSION_IDLE_TIMEOUT_SECONDS = max(1, env_int("SESSION_IDLE_TIMEOUT_SECONDS", 600))
SESSION_IDLE_STATUS_POLL_SECONDS = max(
    5, env_int("SESSION_IDLE_STATUS_POLL_SECONDS", 15)
)
SESSION_IDLE_ACTIVITY_THROTTLE_SECONDS = max(
    1, env_int("SESSION_IDLE_ACTIVITY_THROTTLE_SECONDS", 15)
)
# Trust TLS termination at the configured reverse proxy so
# request.is_secure() reflects the original client scheme.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", True)
REFERRER_POLICY = env("REFERRER_POLICY", "strict-origin-when-cross-origin")
PERMISSIONS_POLICY = env(
    "PERMISSIONS_POLICY",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
)
CONTENT_SECURITY_POLICY = env(
    "CONTENT_SECURITY_POLICY",
    "default-src 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'self'; "
    "img-src 'self' data: blob:; "
    "font-src 'self' data:; "
    "style-src 'self' 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline'; "
    "connect-src 'self'; "
    "frame-src 'none'; "
    "media-src 'self' blob:; "
    "worker-src 'self' blob:",
)
CONTENT_SECURITY_POLICY_ENFORCE = env_bool("CONTENT_SECURITY_POLICY_ENFORCE", False)

# Wartungsmodus
MAINTENANCE_MODE = env_bool("MAINTENANCE_MODE", False)
MAINTENANCE_MESSAGE = env("MAINTENANCE_MESSAGE",
                          "Wir aktualisieren gerade – gleich geht es weiter.")

# Mail / Upload
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST = ""
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = env_int("EMAIL_TIMEOUT", 10)
EMAIL_SSL_CERTFILE = env("EMAIL_SSL_CERTFILE")
EMAIL_SSL_KEYFILE = env("EMAIL_SSL_KEYFILE")
EMAIL_SSL_CA_FILE = env("EMAIL_SSL_CA_FILE")
EMAIL_SSL_SKIP_VERIFY = env_bool("EMAIL_SSL_SKIP_VERIFY", False)
PUBLIC_CONTACT_EMAIL = "max.mustermann@example.com"
DEFAULT_FROM_EMAIL = "noreply@example.com"
CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL
APPOINTMENT_REQUEST_EMAIL = PUBLIC_CONTACT_EMAIL
# Separate Mailto-Ziel für Dolmetscher-Kontakt, damit deren E-Mails verborgen bleiben
INTERPRETER_CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL
# The public portfolio demo must not expose or link to a real phone number.
CONTACT_PHONE_WHATSAPP = ""
CONTACT_REGION = env("CONTACT_REGION", "")
CONTACT_AVAILABILITY = os.environ.get("CONTACT_AVAILABILITY", "")

# Fallback Betreiberkontakt
if not CONTACT_EMAIL:
  CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL

# Upload-Restriktionen
UPLOAD_EMAIL_TO = env("UPLOAD_EMAIL_TO", EMAIL_HOST_USER)
UPLOAD_MAX_BYTES = env_int("UPLOAD_MAX_BYTES", 25 * 1024 * 1024)
DATA_UPLOAD_MAX_MEMORY_SIZE = env_int(
    "DATA_UPLOAD_MAX_MEMORY_SIZE", UPLOAD_MAX_BYTES + (1024 * 1024)
)
UPLOAD_ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg"}
UPLOAD_SERVICE_START_HOUR = env_int("UPLOAD_SERVICE_START_HOUR", 9)
UPLOAD_SERVICE_END_HOUR = env_int("UPLOAD_SERVICE_END_HOUR", 18)
UPLOAD_SERVICE_BLOCK_WEEKENDS = env_bool("UPLOAD_SERVICE_BLOCK_WEEKENDS", True)

# Oeffentlicher PayPal-Spendenlink. Kein Secret; darf in Templates erscheinen.
PAYPAL_BUSINESS_EMAIL = ""
PAYPAL_CURRENCY = env("PAYPAL_CURRENCY", "EUR")
PAYPAL_DONATE_URL = ""

# Feature toggles
LOGIN_REQUIRED = env_bool("LOGIN_REQUIRED", False)
LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "django": {"handlers": ["console"], "level": "ERROR"},
    },
}
