"""Embedded learning module; accounts and sessions belong to the platform."""

# Audio recordings use browser IndexedDB. This module has no audio upload endpoint.
AUTH_TOKEN_MAX_AGE = 60 * 60 * 2
SECURE_UPLOAD_MAX_SIZE_MB = 5
SECURE_UPLOAD_ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/pdf"]
OPENAI_API_KEY = ""
OPENAI_MODEL = "gpt-4.1-mini"
AI_FEATURES_ENABLED = False
AI_STREAMING_PREPARED = False
REALTIME_NOTIFICATIONS_ENABLED = False
REALTIME_MESSENGER_PREPARED = False
REALTIME_LEARNING_ROOMS_PREPARED = False
USE_REDIS_CHANNEL_LAYER = False
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
STRIPE_SECRET_KEY = ""
STRIPE_PRICE_PREMIUM_MONTHLY = ""
STRIPE_WEBHOOK_SECRET = ""
PAYPAL_PLAN_PREMIUM_MONTHLY = ""
PAYPAL_WEBHOOK_ID = ""
BILLING_SUCCESS_URL = "/deutschlive/dashboard"
BILLING_CANCEL_URL = "/deutschlive/dashboard"
