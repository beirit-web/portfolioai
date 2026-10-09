import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent
EXTERNAL_ENV_KEYS = set(os.environ)


# Environment loading
def load_env_file(path, override=False):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        clean_key = key.strip()
        clean_value = value.strip().strip("\"").strip("'")
        if clean_key in EXTERNAL_ENV_KEYS:
            continue
        if override:
            os.environ[clean_key] = clean_value
        else:
            os.environ.setdefault(clean_key, clean_value)


ENVIRONMENT = os.environ.get("DJANGO_ENV", "local").lower()
load_env_file(BASE_DIR / ".env")
load_env_file(BASE_DIR / (".env.production" if ENVIRONMENT == "production" else ".env.local"), override=True)


def env_list(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.lower() in ["1", "true", "yes", "on"]


def env_int(name, default=0):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# Core Django settings
DEBUG = env_bool("DJANGO_DEBUG", ENVIRONMENT != "production")
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
if not DEBUG and SECRET_KEY in ["", "dev-only-change-me", "replace-with-production-secret"]:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set to a real secret when DJANGO_DEBUG=false.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1" if DEBUG else "")
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set when DJANGO_DEBUG=false.")
ADMIN_URL = os.environ.get("DJANGO_ADMIN_URL", "secure-admin/")
AUTH_TOKEN_MAX_AGE = env_int("AUTH_TOKEN_MAX_AGE", 60 * 60 * 2)
SESSION_SECURITY_ENABLED = env_bool("SESSION_SECURITY_ENABLED", True)
SESSION_SECURITY_IDLE_TIMEOUT_SECONDS = env_int("SESSION_SECURITY_IDLE_TIMEOUT_SECONDS", AUTH_TOKEN_MAX_AGE)
SESSION_SECURITY_EXEMPT_PATHS = [
    "/api/health/",
    "/api/auth/csrf/",
    "/api/auth/me/",
    "/api/auth/register/",
    "/api/auth/login/",
    "/api/auth/password-reset/",
    "/api/auth/password-reset/confirm/",
    "/api/auth/email/confirm/",
    "/api/feedback/",
    "/api/scenes/",
    "/api/topics/",
    "/api/page/",
    "/api/billing/stripe/webhook/",
    "/api/billing/paypal/webhook/",
]


# Application registry and middleware
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "channels",
    "lessons",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "lessons.middleware.SecurityHeadersMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "lessons.middleware.RequestLoggingMiddleware",
    "lessons.middleware.APIErrorMiddleware",
    "lessons.middleware.SessionSecurityMiddleware",
    "lessons.middleware.MaintenanceModeMiddleware",
    "lessons.middleware.UploadValidationMiddleware",
    "lessons.middleware.RateLimitMiddleware",
    "lessons.middleware.AuditContextMiddleware",
    "lessons.middleware.LocaleContextMiddleware",
    "lessons.middleware.ThemeContextMiddleware",
    "lessons.middleware.RequestContextMiddleware",
    "lessons.middleware.PremiumAccessMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# Database and cache
DATABASE_CONN_MAX_AGE = env_int("DATABASE_CONN_MAX_AGE", 600 if ENVIRONMENT == "production" else 0)
DATABASE_SSL_REQUIRE = env_bool("DATABASE_SSL_REQUIRE", ENVIRONMENT == "production")
DATABASE_BACKUP_STRATEGY = os.environ.get("DATABASE_BACKUP_STRATEGY", "").strip()
DATABASE_BACKUP_RETENTION_DAYS = env_int("DATABASE_BACKUP_RETENTION_DAYS", 7 if ENVIRONMENT == "production" else 0)


def database_from_url(url):
    parsed = urlparse(url)
    if parsed.scheme in ["postgres", "postgresql", "postgis"]:
        config = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or ""),
            "CONN_MAX_AGE": DATABASE_CONN_MAX_AGE,
            "CONN_HEALTH_CHECKS": True,
        }
        if DATABASE_SSL_REQUIRE:
            config["OPTIONS"] = {"sslmode": "require"}
        return config
    if parsed.scheme == "sqlite":
        if parsed.netloc and parsed.path:
            db_path = f"/{parsed.netloc}{parsed.path}"
        else:
            db_path = parsed.path
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": db_path or BASE_DIR / "db.sqlite3",
        }
    raise ImproperlyConfigured("DATABASE_URL must start with postgres://, postgresql://, postgis://, or sqlite://.")


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()


def build_database_settings():
    return {
        "default": database_from_url(DATABASE_URL)
        if DATABASE_URL
        else {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


DATABASES = build_database_settings()


REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
USE_REDIS_CACHE = env_bool("USE_REDIS_CACHE", ENVIRONMENT == "production")
USE_REDIS_CHANNEL_LAYER = env_bool("USE_REDIS_CHANNEL_LAYER", ENVIRONMENT == "production")


def build_cache_settings():
    if USE_REDIS_CACHE:
        return {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": REDIS_URL,
            }
        }
    return {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "deutsch-lernen-dev-cache",
        }
    }


CACHES = build_cache_settings()


# Localization and static assets
LANGUAGE_CODE = "ru"
LANGUAGES = [
    ("ru", "Russian"),
    ("de", "German"),
    ("en", "English"),
]
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_ROOT = Path(os.environ.get("WHITENOISE_ROOT", BASE_DIR / "frontend_dist"))
WHITENOISE_AUTOREFRESH = DEBUG
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS, CSRF and browser security
DEFAULT_DEV_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS", DEFAULT_DEV_ORIGINS if DEBUG else "") + env_list("DJANGO_DEV_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", DEFAULT_DEV_ORIGINS if DEBUG else "") + env_list("DJANGO_DEV_ORIGINS")

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = env_bool("DJANGO_CSRF_COOKIE_HTTPONLY", False)
SESSION_COOKIE_SAMESITE = os.environ.get("DJANGO_SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.environ.get("DJANGO_CSRF_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", not DEBUG)

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = os.environ.get("DJANGO_SECURE_REFERRER_POLICY", "same-origin")
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if env_bool("DJANGO_USE_X_FORWARDED_PROTO", not DEBUG) else None


def build_content_security_policy():
    configured = os.environ.get("DJANGO_CONTENT_SECURITY_POLICY", "").strip()
    if configured:
        return configured

    connect_sources = ["'self'"]
    if DEBUG:
        connect_sources.extend(CORS_ALLOWED_ORIGINS)
        connect_sources.extend(["ws://localhost:5173", "ws://127.0.0.1:5173", "ws://localhost:5174", "ws://127.0.0.1:5174"])

    directives = {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https://images.unsplash.com"],
        "font-src": ["'self'", "data:"],
        "connect-src": connect_sources,
    }
    return "; ".join(f"{name} {' '.join(values)}" for name, values in directives.items())


SECURITY_CONTENT_SECURITY_POLICY = build_content_security_policy()
SECURITY_CONTENT_SECURITY_POLICY_REPORT_ONLY = env_bool("DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY", DEBUG)
SECURITY_PERMISSIONS_POLICY = os.environ.get(
    "DJANGO_PERMISSIONS_POLICY",
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
)
SECURITY_CROSS_ORIGIN_OPENER_POLICY = os.environ.get("DJANGO_CROSS_ORIGIN_OPENER_POLICY", "same-origin")


# Billing
# Public portfolio builds never enable providers from environment variables.
PORTFOLIO_DEMO_MODE = True
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_WEBHOOK_TOLERANCE_SECONDS = env_int("STRIPE_WEBHOOK_TOLERANCE_SECONDS", 300)
STRIPE_PRICE_PREMIUM_MONTHLY = os.environ.get("STRIPE_PRICE_PREMIUM_MONTHLY", "")
STRIPE_API_BASE = os.environ.get("STRIPE_API_BASE", "https://api.stripe.com/v1")
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
PAYPAL_WEBHOOK_ID = os.environ.get("PAYPAL_WEBHOOK_ID", "")
PAYPAL_PLAN_PREMIUM_MONTHLY = os.environ.get("PAYPAL_PLAN_PREMIUM_MONTHLY", "")
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"
BILLING_SUCCESS_URL = os.environ.get("BILLING_SUCCESS_URL", "http://localhost:5173/dashboard")
BILLING_CANCEL_URL = os.environ.get("BILLING_CANCEL_URL", "http://localhost:5173/dashboard")


# Public URLs and transactional mail
DEUTSCHLIVE_PUBLIC_URL = os.environ.get("DEUTSCHLIVE_PUBLIC_URL", "http://localhost:5173")
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST = ""
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
DEFAULT_FROM_EMAIL = "noreply@example.com"
CONTACT_EMAIL = "kontakt@example.com"


# Upload security
SECURE_UPLOAD_MAX_SIZE_MB = env_int("SECURE_UPLOAD_MAX_SIZE_MB", 5)
SECURE_UPLOAD_ALLOWED_CONTENT_TYPES = env_list(
    "SECURE_UPLOAD_ALLOWED_CONTENT_TYPES",
    "image/jpeg,image/png,image/webp,application/pdf",
)
UPLOAD_VALIDATION_ENABLED = env_bool("UPLOAD_VALIDATION_ENABLED", True)
UPLOAD_VALIDATION_PATH_PREFIXES = env_list("UPLOAD_VALIDATION_PATH_PREFIXES", "/api/")


# Logging and monitoring
MONITORING_PROVIDER = os.environ.get("MONITORING_PROVIDER", "logs")
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
DJANGO_LOG_LEVEL = os.environ.get("DJANGO_LOG_LEVEL", "WARNING")
SECURITY_LOG_LEVEL = os.environ.get("SECURITY_LOG_LEVEL", "WARNING")
REQUEST_LOG_LEVEL = os.environ.get("REQUEST_LOG_LEVEL", "INFO")
REQUEST_LOGGING_ENABLED = env_bool("REQUEST_LOGGING_ENABLED", True)
API_ERROR_LOGGING_ENABLED = env_bool("API_ERROR_LOGGING_ENABLED", True)
API_ERROR_INCLUDE_DEBUG = env_bool("API_ERROR_INCLUDE_DEBUG", DEBUG)
MAINTENANCE_MODE = env_bool("MAINTENANCE_MODE", False)
MAINTENANCE_MESSAGE = os.environ.get("MAINTENANCE_MESSAGE", "DeutschLive is temporarily in maintenance mode.")
MAINTENANCE_RETRY_AFTER_SECONDS = env_int("MAINTENANCE_RETRY_AFTER_SECONDS", 300)
MAINTENANCE_BLOCK_FRONTEND = env_bool("MAINTENANCE_BLOCK_FRONTEND", False)
MAINTENANCE_EXEMPT_PATHS = [
    "/api/health/",
    f"/{ADMIN_URL.strip('/')}/",
]
RATE_LIMITING_ENABLED = env_bool("RATE_LIMITING_ENABLED", True)
RATE_LIMIT_POLICIES = {
    "login": {
        "path": "/api/auth/login/",
        "methods": ["POST"],
        "limit": env_int("RATE_LIMIT_LOGIN_LIMIT", 5),
        "window_seconds": env_int("RATE_LIMIT_LOGIN_WINDOW_SECONDS", 15 * 60),
    },
    "feedback": {
        "path": "/api/feedback/",
        "methods": ["POST"],
        "limit": env_int("RATE_LIMIT_FEEDBACK_LIMIT", 3),
        "window_seconds": env_int("RATE_LIMIT_FEEDBACK_WINDOW_SECONDS", 10 * 60),
    },
    "quiz_attempt": {
        "path": "/api/quiz-attempts/",
        "methods": ["POST"],
        "limit": env_int("RATE_LIMIT_QUIZ_ATTEMPT_LIMIT", 30),
        "window_seconds": env_int("RATE_LIMIT_QUIZ_ATTEMPT_WINDOW_SECONDS", 10 * 60),
    },
    "api_write": {
        "path_prefix": "/api/",
        "methods": ["POST", "PUT", "PATCH", "DELETE"],
        "limit": env_int("RATE_LIMIT_API_WRITE_LIMIT", 120),
        "window_seconds": env_int("RATE_LIMIT_API_WRITE_WINDOW_SECONDS", 60),
    },
}


def build_logging_settings():
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(levelname)s %(asctime)s %(name)s %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
            },
        },
        "loggers": {
            "django.request": {
                "handlers": ["console"],
                "level": DJANGO_LOG_LEVEL,
                "propagate": False,
            },
            "lessons": {
                "handlers": ["console"],
                "level": LOG_LEVEL,
                "propagate": False,
            },
            "lessons.security": {
                "handlers": ["console"],
                "level": SECURITY_LOG_LEVEL,
                "propagate": False,
            },
            "lessons.request": {
                "handlers": ["console"],
                "level": REQUEST_LOG_LEVEL,
                "propagate": False,
            },
        },
    }


LOGGING = build_logging_settings()


# AI features
AI_PROVIDER = os.environ.get("AI_PROVIDER", "fallback")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_TIMEOUT_SECONDS = env_int("OPENAI_TIMEOUT_SECONDS", 20)
OPENAI_MAX_OUTPUT_TOKENS = env_int("OPENAI_MAX_OUTPUT_TOKENS", 800)
OPENAI_MAX_RETRIES = env_int("OPENAI_MAX_RETRIES", 2)
AI_FEATURES_ENABLED = env_bool("AI_FEATURES_ENABLED", False)
AI_STREAMING_PREPARED = env_bool("AI_STREAMING_PREPARED", True)
AI_MAX_INPUT_TOKENS = env_int("AI_MAX_INPUT_TOKENS", 700)
AI_DAILY_FREE_LIMIT = env_int("AI_DAILY_FREE_LIMIT", 10)
AI_DAILY_PREMIUM_LIMIT = env_int("AI_DAILY_PREMIUM_LIMIT", 100)
AI_PREMIUM_REQUIRED = env_bool("AI_PREMIUM_REQUIRED", False)
AI_STREAMING_CORRECTIONS_ENABLED = env_bool("AI_STREAMING_CORRECTIONS_ENABLED", False)
PREMIUM_ACCESS_ENABLED = env_bool("PREMIUM_ACCESS_ENABLED", True)
PREMIUM_ACCESS_POLICIES = {
    "premium_feature_preview": {
        "path": "/api/premium/feature-preview/",
        "methods": ["GET"],
        "fallback": "deny",
    },
    "ai_writing_exercises": {
        "path": "/api/writing/exercises/",
        "methods": ["POST"],
        "requires_setting": "AI_PREMIUM_REQUIRED",
        "fallback": "free_quota",
    },
    "ai_adaptive_scene": {
        "path": "/api/ai/adaptive-scene/",
        "methods": ["POST"],
        "requires_setting": "AI_PREMIUM_REQUIRED",
        "fallback": "free_quota",
    },
}


# Realtime and Channels
def build_channel_layers():
    return {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer" if USE_REDIS_CHANNEL_LAYER else "channels.layers.InMemoryChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]} if USE_REDIS_CHANNEL_LAYER else {},
        }
    }


CHANNEL_LAYERS = build_channel_layers()
REALTIME_NOTIFICATIONS_ENABLED = env_bool("REALTIME_NOTIFICATIONS_ENABLED", True)
REALTIME_MESSENGER_PREPARED = env_bool("REALTIME_MESSENGER_PREPARED", True)
REALTIME_LEARNING_ROOMS_PREPARED = env_bool("REALTIME_LEARNING_ROOMS_PREPARED", True)
REALTIME_WS_ACCESS_ENABLED = env_bool("REALTIME_WS_ACCESS_ENABLED", True)
REALTIME_WS_CONNECTION_LIMIT = env_int("REALTIME_WS_CONNECTION_LIMIT", 30)
REALTIME_WS_CONNECTION_WINDOW_SECONDS = env_int("REALTIME_WS_CONNECTION_WINDOW_SECONDS", 60)
REALTIME_WS_POLICIES = {
    "notifications": {
        "path": "/ws/notifications/",
        "allowed_roles": ["learner", "premium", "mentor", "content_manager", "admin"],
    },
}
