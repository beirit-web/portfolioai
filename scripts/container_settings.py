"""Hosted portfolio defaults; infrastructure values remain process variables."""

import os


# Apply these before importing settings, including values from older releases.
for _key in (
    "DEBUG", "DJANGO_DEBUG", "ACCOUNT_EMAIL_DELIVERY_ENABLED",
    "LOCAL_ACCOUNT_ACTIVATION_ENABLED", "USER_UPLOADS_ENABLED",
    "AI_FEATURES_ENABLED", "CONTRACTS_AI_ENABLED", "HOUSING_SOMANTIC_ENABLED",
    "REALTIME_NOTIFICATIONS_ENABLED",
):
    os.environ[_key] = "False"
for _key in ("SECURE_SSL_REDIRECT", "SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE"):
    os.environ[_key] = "True"
os.environ["CONTENT_SECURITY_POLICY_ENFORCE"] = "True"

from config.settings import *  # noqa: E402,F403

# Discard messages instead of writing email bodies or reset links into logs.
EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"
