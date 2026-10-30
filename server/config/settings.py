"""Local portfolio settings with fictional public sample configuration."""

import json
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv

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


def _server_path(path: Path) -> Path:
    """Resolve relative local paths from the server project directory."""
    return path if path.is_absolute() else SERVER_DIR / path


def env_json_contact_list(key: str) -> list[dict[str, str]]:
    """
    Load chat/contact links from a JSON env var.
    Expected format:
    [
      {"label": "E-Mail", "url": "mailto:kontakt@example.com", "hint": "optional"}
    ]
    """
    raw = env(key, "")
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{key} must contain valid JSON") from exc
    if not isinstance(value, list):
        raise RuntimeError(f"{key} must be a JSON list")

    cleaned: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "") or "").strip()
        url = str(item.get("url", "") or "").strip()
        hint = str(item.get("hint", "") or "").strip()
        if not label or not url:
            continue
        cleaned.append({"label": label, "url": url, "hint": hint})
    return cleaned


SERVER_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = SERVER_DIR


# Local overrides precede the public sample; explicit process values always win.
load_dotenv(SERVER_DIR / ".env.local", override=False)
load_dotenv(SERVER_DIR / ".env.orig", override=False)
load_dotenv(SERVER_DIR / ".env", override=False)

# Core security
SECRET_KEY = require_env(["DJANGO_SECRET_KEY", "SECRET_KEY"])
DEBUG = env_bool_first(["DJANGO_DEBUG", "DEBUG"], False)

ALLOWED_HOSTS = require_env_list(["DJANGO_ALLOWED_HOSTS", "ALLOWED_HOSTS"])
CSRF_TRUSTED_ORIGINS = require_env_list(["CSRF_TRUSTED_ORIGINS"])

# Keep the configured host restrictions in DEBUG as well. Additional LAN hosts
# can be listed explicitly in ALLOWED_HOSTS; Django's test runner adds testserver.
if DEBUG:
    for origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ):
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)

# This public code sample stays a demo even when an old local .env is present.
# Isolated sandbox tests can override this setting; no environment flag enables it.
PORTFOLIO_DEMO_MODE = True
SITE_URL = str(env("SITE_URL", "") or "").strip().rstrip("/")
if not SITE_URL:
    SITE_URL = "http://localhost:8000" if DEBUG else "https://portfolio.example.com"
SITE_HOST = urlparse(SITE_URL).netloc or SITE_URL
REDIRECT_OLD_HOSTS = [
    host.strip().lower()
    for host in env_list_first(["REDIRECT_OLD_HOSTS"], default=[])
    if host.strip()
]

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "lessons",
    "shop",
    "pages",
    "contracts.apps.ContractsConfig",
    "botanic.apps.BotanicConfig",
]

if DEBUG:
    # Route static files through WhiteNoise during local development so
    # Lighthouse on localhost sees the same cache/compression behavior.
    INSTALLED_APPS.insert(
        INSTALLED_APPS.index("django.contrib.staticfiles"),
        "whitenoise.runserver_nostatic",
    )

MIDDLEWARE = [
    "config.middleware.SecurityHeadersMiddleware",
    "config.middleware.SafeHostAndErrorMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.SuspiciousRequestBlockMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "config.middleware.VersionedStaticCacheMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "pages.account_i18n.AccountLanguageMiddleware",
    "django.middleware.common.CommonMiddleware",
    "config.middleware.HostRedirectMiddleware",
    "config.middleware.MaintenanceMiddleware",
    "config.middleware.AdminIPRestrictionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "config.middleware.LoginAttemptLimitMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "config.middleware.AuthSessionIdleTimeoutMiddleware",
    "config.middleware.LoginRequiredMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.SafeStatusPageMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [SERVER_DIR / "templates", SERVER_DIR / "templates" / "modules"],
        "APP_DIRS": True,
        "OPTIONS": {
            "builtins": [
                "pages.templatetags.asset_tags",
                "pages.templatetags.account_copy",
            ],
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "config.context_processors.seo_defaults",
                "config.context_processors.auth_session_config",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database (env-provided path, defaults to persistent ./data/)
_raw_db_path = _server_path(
    env_path("DB_PATH", SERVER_DIR / "data" / "db.sqlite3"))
DB_PATH = _ensure_dir(_raw_db_path.parent) / _raw_db_path.name

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DB_PATH,
    }
}

# Opt-in only. The hard ceiling stays within the provider's documented free tier.
HOUSING_SOMANTIC_ENABLED = env_bool("HOUSING_SOMANTIC_ENABLED", False)
HOUSING_SOMANTIC_API_KEY = env("HOUSING_SOMANTIC_API_KEY", "").strip()
HOUSING_SOMANTIC_MONTHLY_LIMIT = max(0, min(50, env_int("HOUSING_SOMANTIC_MONTHLY_LIMIT", 45)))

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
    "botanic": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": str(_raw_db_path.parent / "botanic-cache"),
        "TIMEOUT": 86400,
        "OPTIONS": {"MAX_ENTRIES": 3000},
    },
}

_raw_backup_dir = _server_path(
    env_path("DB_BACKUP_PATH", SERVER_DIR / "data" / "db_backups"))
DB_BACKUP_PATH = _ensure_dir(_raw_backup_dir)

AUTHENTICATION_BACKENDS = ["pages.authentication.EmailOrUsernameBackend"]

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
    SERVER_DIR / "assets",
]
STATIC_ROOT = _ensure_dir(_server_path(
    env_path("STATIC_ROOT", SERVER_DIR / "staticfiles")))
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": env(
            "STATICFILES_STORAGE",
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage",
        ),
    },
}
VERSIONED_STATIC_CACHE_SECONDS = env_int(
    "VERSIONED_STATIC_CACHE_SECONDS", 31536000)
MEDIA_URL = "/media/"
MEDIA_ROOT = _ensure_dir(_server_path(
    env_path("MEDIA_ROOT", SERVER_DIR / "media")))

# Admin security
ADMIN_URL = env_path_fragment(
    ["DJANGO_ADMIN_URL", "ADMIN_URL"], "admin/", require_present=not DEBUG)
ADMIN_IP_WHITELIST = {ip.strip() for ip in env_list_first(
    ["DJANGO_ADMIN_IP_WHITELIST", "ADMIN_IP_WHITELIST"], default=[]) if ip.strip()}
ADMIN_SETUP_USERNAME = env_first(["DJANGO_ADMIN_NAME", "ADMIN_NAME"], "")
ADMIN_SETUP_PASSWORD = env_first(
    ["DJANGO_ADMIN_PASSWORD", "ADMIN_PASSWORD"], "")
ADMIN_SETUP_EMAIL = env_first(["DJANGO_ADMIN_EMAIL", "ADMIN_EMAIL"], "")


def _required_path(key: str, default: str) -> str:
    """Shortcut for required path fragments with optional DJANGO_ prefix."""
    return env_path_fragment([f"DJANGO_{key}", key], default, require_present=not DEBUG)


# Password reset links
AUTH_URL_PREFIX = _required_path("AUTH_URL_PREFIX", "auth/")
PASSWORD_RESET_INVALID_URL = _required_path(
    "PASSWORD_RESET_INVALID_URL", "auth/reset/")
PASSWORD_RESET_URL = _required_path("PASSWORD_RESET_URL", "password-reset/")
PASSWORD_RESET_DONE_URL = _required_path(
    "PASSWORD_RESET_DONE_URL", "password-reset/done/")
PASSWORD_RESET_CONFIRM_PREFIX = _required_path(
    "PASSWORD_RESET_CONFIRM_PREFIX", "reset/")
PASSWORD_RESET_COMPLETE_URL = _required_path(
    "PASSWORD_RESET_COMPLETE_URL", "reset/done/")
PASSWORD_RESET_DOMAIN = env_first(
    ["RESET_LINK_DOMAIN", "PASSWORD_RESET_DOMAIN"], "")
_reset_https = env_first(
    ["RESET_LINK_USE_HTTPS", "PASSWORD_RESET_USE_HTTPS"], "")
PASSWORD_RESET_USE_HTTPS = (
    None
    if not _reset_https
    else env_bool_first(["RESET_LINK_USE_HTTPS", "PASSWORD_RESET_USE_HTTPS"], False)
)
PASSWORD_RESET_TIMEOUT = 3600
PASSWORD_RESET_EMAIL_TEMPLATE_NAME = "registration/password_reset_email.html"
PASSWORD_RESET_SUBJECT_TEMPLATE_NAME = "registration/password_reset_subject.txt"
EMAIL_VERIFICATION_TIMEOUT = env_int(
    "EMAIL_VERIFICATION_TIMEOUT", 60 * 60 * 24 * 3)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

PROFILE_IMAGE_URL = env("PROFILE_IMAGE_URL", "")

CHAT_CONTACTS = []

for extra_contact in env_json_contact_list("CHAT_CONTACTS_JSON"):
    if any(
        existing["label"] == extra_contact["label"]
        and existing["url"] == extra_contact["url"]
        for existing in CHAT_CONTACTS
    ):
        continue
    CHAT_CONTACTS.append(extra_contact)

# Security toggles (production defaults hardened)
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", True)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", True)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_IDLE_TIMEOUT_SECONDS = max(
    1, env_int("SESSION_IDLE_TIMEOUT_SECONDS", 600))
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
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

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
    "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://air-quality-api.open-meteo.com; "
    "frame-src 'none'; "
    "media-src 'self' blob:; "
    "worker-src 'self' blob:",
)
CONTENT_SECURITY_POLICY_ENFORCE = env_bool(
    "CONTENT_SECURITY_POLICY_ENFORCE", False)

# Wartungsmodus
MAINTENANCE_MODE = env_bool("MAINTENANCE_MODE", False)
MAINTENANCE_MESSAGE = env("MAINTENANCE_MESSAGE",
                          "Wir aktualisieren gerade – gleich geht es weiter.")

# Mail / Upload
# An old SMTP configuration alone must never turn delivery on in this workspace.
ACCOUNT_EMAIL_DELIVERY_ENABLED = env_bool("ACCOUNT_EMAIL_DELIVERY_ENABLED", False)
LOCAL_ACCOUNT_ACTIVATION_ENABLED = env_bool("LOCAL_ACCOUNT_ACTIVATION_ENABLED", False)
EMAIL_BACKEND = (
    env("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
    if ACCOUNT_EMAIL_DELIVERY_ENABLED else "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", "") if ACCOUNT_EMAIL_DELIVERY_ENABLED else ""
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "") if ACCOUNT_EMAIL_DELIVERY_ENABLED else ""
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "") if ACCOUNT_EMAIL_DELIVERY_ENABLED else ""
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = env_int("EMAIL_TIMEOUT", 10)
EMAIL_SSL_CERTFILE = env("EMAIL_SSL_CERTFILE")
EMAIL_SSL_KEYFILE = env("EMAIL_SSL_KEYFILE")
EMAIL_SSL_CA_FILE = env("EMAIL_SSL_CA_FILE")
EMAIL_SSL_SKIP_VERIFY = env_bool("EMAIL_SSL_SKIP_VERIFY", False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "noreply@example.com") if ACCOUNT_EMAIL_DELIVERY_ENABLED else "noreply@example.com"
CONTACT_EMAIL = env("CONTACT_EMAIL", DEFAULT_FROM_EMAIL)
CONTACT_PHONE_LANDLINE = env("CONTACT_PHONE_LANDLINE", "")
CONTACT_REGION = env("CONTACT_REGION", "")
CONTACT_AVAILABILITY = env("CONTACT_AVAILABILITY", "")

# Zentrale, bewusst öffentlich freigegebene Website- und Anbieterangaben.
# Private Daten werden ausschließlich aus der nicht versionierten Umgebung
# geladen und über SITE_CONFIG an öffentliche Templates weitergereicht.
SITE_OWNER_NAME = env("SITE_OWNER_NAME", "")
SITE_BUSINESS_NAME = env("SITE_BUSINESS_NAME", "")
SITE_LEGAL_FORM = env("SITE_LEGAL_FORM", "")
SITE_ADDRESS = env("SITE_ADDRESS", env("SITE_STREET", ""))
SITE_STREET = SITE_ADDRESS
SITE_POSTAL_CODE = env("SITE_POSTAL_CODE", "")
SITE_CITY = env("SITE_CITY", "")
SITE_COUNTRY = env("SITE_COUNTRY", "")
SITE_EMAIL = env("SITE_EMAIL", "")
SITE_PHONE = env_first(["SITE_PHONE", "CONTACT_PHONE_LANDLINE"], "")
SITE_ACTIVITY = env("SITE_ACTIVITY", "")
SITE_TAX_NOTICE = env("SITE_TAX_NOTICE", "")
SITE_TAX_ID = env("SITE_TAX_ID", "")
SITE_RESPONSIBLE_PERSON = env("SITE_RESPONSIBLE_PERSON", "")
SITE_REGISTER_AUTHORITY = env("SITE_REGISTER_AUTHORITY", "")
SITE_REGISTER_DATE = env("SITE_REGISTER_DATE", "")
SITE_BUSINESS_START_DATE = env("SITE_BUSINESS_START_DATE", "")
SITE_REGISTER_NAME = env("SITE_REGISTER_NAME", "")
SITE_REGISTER_NUMBER = env("SITE_REGISTER_NUMBER", "")
SITE_VAT_ID = env("SITE_VAT_ID", "")
SITE_ECONOMIC_ID = env("SITE_ECONOMIC_ID", "")
SITE_SUPERVISORY_AUTHORITY = env("SITE_SUPERVISORY_AUTHORITY", "")
SITE_DISPUTE_RESOLUTION_NOTICE = env(
    "SITE_DISPUTE_RESOLUTION_NOTICE",
    "Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
)

SITE_CONFIG = {
    "owner_name": SITE_OWNER_NAME,
    "business_name": SITE_BUSINESS_NAME,
    "legal_form": SITE_LEGAL_FORM,
    "street": SITE_STREET,
    "postal_code": SITE_POSTAL_CODE,
    "city": SITE_CITY,
    "country": SITE_COUNTRY,
    "email": SITE_EMAIL,
    "phone": SITE_PHONE,
    "activity": SITE_ACTIVITY,
    "tax_notice": SITE_TAX_NOTICE,
    "tax_id": SITE_TAX_ID,
    "responsible_person": SITE_RESPONSIBLE_PERSON,
    "register_authority": SITE_REGISTER_AUTHORITY,
    "register_date": SITE_REGISTER_DATE,
    "business_start_date": SITE_BUSINESS_START_DATE,
    "register_name": SITE_REGISTER_NAME,
    "register_number": SITE_REGISTER_NUMBER,
    "vat_id": SITE_VAT_ID,
    "economic_id": SITE_ECONOMIC_ID,
    "supervisory_authority": SITE_SUPERVISORY_AUTHORITY,
    "dispute_resolution_notice": SITE_DISPUTE_RESOLUTION_NOTICE,
}

# Upload-Restriktionen
USER_UPLOADS_ENABLED = env_bool("USER_UPLOADS_ENABLED", False)
UPLOAD_EMAIL_TO = env("UPLOAD_EMAIL_TO", EMAIL_HOST_USER)

# Zahlungen bleiben in dieser Portfolio-Demo unabhängig von Umgebungswerten deaktiviert.
PAYMENT_BANK_TRANSFER_ENABLED = False
PAYPAL_BUSINESS_EMAIL = ""
PAYPAL_CLIENT_ID = env("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = env("PAYPAL_CLIENT_SECRET", "")
PAYPAL_WEBHOOK_ID = env("PAYPAL_WEBHOOK_ID", "")
PAYPAL_MODE = "sandbox"
PAYPAL_CURRENCY = env("PAYPAL_CURRENCY", "EUR")
PAYPAL_INVOICE_CHECKOUT_ENABLED = False
PAYPAL_DONATE_URL = ""
PAYPAL_PLAN_PREMIUM_MONTHLY = env("PAYPAL_PLAN_PREMIUM_MONTHLY", "")
STRIPE_PUBLIC_KEY = env("STRIPE_PUBLIC_KEY", "")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_PREMIUM_MONTHLY = env("STRIPE_PRICE_PREMIUM_MONTHLY", "")
BILLING_SUCCESS_URL = env("BILLING_SUCCESS_URL",
                          f"{SITE_URL}/deutschlive/dashboard")
BILLING_CANCEL_URL = env("BILLING_CANCEL_URL",
                         f"{SITE_URL}/deutschlive/dashboard")
UPLOAD_MAX_BYTES = env_int("UPLOAD_MAX_BYTES", 25 * 1024 * 1024)
SECURE_UPLOAD_MAX_SIZE_MB = env_int("SECURE_UPLOAD_MAX_SIZE_MB", 5)
SECURE_UPLOAD_ALLOWED_CONTENT_TYPES = env_list_first(
    ["SECURE_UPLOAD_ALLOWED_CONTENT_TYPES"],
    default=["image/jpeg", "image/png", "image/webp", "application/pdf"],
)
DATA_UPLOAD_MAX_MEMORY_SIZE = env_int(
    "DATA_UPLOAD_MAX_MEMORY_SIZE", UPLOAD_MAX_BYTES + (1024 * 1024)
)
UPLOAD_ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg"}
CONTACT_RATE_LIMIT_COUNT = env_int("CONTACT_RATE_LIMIT_COUNT", 5)
CONTACT_RATE_LIMIT_SECONDS = env_int("CONTACT_RATE_LIMIT_SECONDS", 15 * 60)
CONTACT_DUPLICATE_WINDOW_SECONDS = env_int(
    "CONTACT_DUPLICATE_WINDOW_SECONDS", 120)
PRIVACY_CONSENT_VERSION = env("PRIVACY_CONSENT_VERSION", "2026-06-22")
UPLOAD_SERVICE_START_HOUR = env_int("UPLOAD_SERVICE_START_HOUR", 9)
UPLOAD_SERVICE_END_HOUR = env_int("UPLOAD_SERVICE_END_HOUR", 18)
UPLOAD_SERVICE_BLOCK_WEEKENDS = env_bool("UPLOAD_SERVICE_BLOCK_WEEKENDS", True)

# Feature toggles
LOGIN_REQUIRED = env_bool("LOGIN_REQUIRED", False)
LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"
AUTH_TOKEN_MAX_AGE = env_int("AUTH_TOKEN_MAX_AGE", 60 * 60 * 2)
OPENAI_API_KEY = env("OPENAI_API_KEY", "")
OPENAI_MODEL = env("OPENAI_MODEL", "gpt-4.1-mini")
AI_FEATURES_ENABLED = env_bool("AI_FEATURES_ENABLED", False)
CONTRACTS_AI_ENABLED = env_bool("CONTRACTS_AI_ENABLED", False)
CONTRACTS_GEMINI_API_KEY = env("CONTRACTS_GEMINI_API_KEY", "").strip()
CONTRACTS_GEMINI_MODEL = env("CONTRACTS_GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
# Application cap, not a guarantee of the provider's free quota. Use an unbilled project.
CONTRACTS_AI_DAILY_LIMIT = max(0, min(20, env_int("CONTRACTS_AI_DAILY_LIMIT", 20)))
CONTRACTS_AI_USAGE_PATH = _raw_db_path.parent / "contracts-ai-usage.sqlite3"
AI_STREAMING_PREPARED = env_bool("AI_STREAMING_PREPARED", True)
USE_REDIS_CHANNEL_LAYER = env_bool("USE_REDIS_CHANNEL_LAYER", False)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
        "CONFIG": {},
    }
}
REALTIME_NOTIFICATIONS_ENABLED = env_bool(
    "REALTIME_NOTIFICATIONS_ENABLED", False)
REALTIME_MESSENGER_PREPARED = env_bool("REALTIME_MESSENGER_PREPARED", True)
REALTIME_LEARNING_ROOMS_PREPARED = env_bool(
    "REALTIME_LEARNING_ROOMS_PREPARED", True)

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
