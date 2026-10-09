import hmac
import time
from datetime import datetime, timezone
import json
from hashlib import sha256
from urllib import error, parse, request

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone as django_timezone

from .models import Plan, Subscription, WebhookEvent
from .serializers import serialize_plan


def billing_provider_status():
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        return {
            provider: {"configured": False, "webhookConfigured": False, "demo": True}
            for provider in ("stripe", "paypal")
        }
    stripe_test = settings.STRIPE_SECRET_KEY.startswith("sk_test_") and settings.STRIPE_API_BASE.rstrip("/") == "https://api.stripe.com/v1"
    paypal_sandbox = settings.PAYPAL_API_BASE.rstrip("/") == "https://api-m.sandbox.paypal.com"
    return {
        "stripe": {
            "configured": bool(stripe_test and settings.STRIPE_PRICE_PREMIUM_MONTHLY),
            "webhookConfigured": bool(stripe_test and settings.STRIPE_WEBHOOK_SECRET),
        },
        "paypal": {
            "configured": bool(paypal_sandbox and settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET and settings.PAYPAL_PLAN_PREMIUM_MONTHLY),
            "webhookConfigured": bool(paypal_sandbox and settings.PAYPAL_WEBHOOK_ID),
        },
    }


def checkout_preview(provider, plan):
    require_sandbox_billing(provider)
    payload = {
        "provider": provider,
        "plan": serialize_plan(plan),
        "successUrl": settings.BILLING_SUCCESS_URL,
        "cancelUrl": settings.BILLING_CANCEL_URL,
    }
    if provider == "paypal":
        payload.update(
            {
                "paypalPlanId": plan.paypal_plan_id or settings.PAYPAL_PLAN_PREMIUM_MONTHLY,
                "apiBase": settings.PAYPAL_API_BASE,
                "activation": "prepared",
            }
        )
    return payload


class BillingProviderError(RuntimeError):
    pass


class WebhookSignatureError(RuntimeError):
    pass


def require_sandbox_billing(provider):
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        raise BillingProviderError("Portfolio demo: payments and billing webhooks are disabled.")
    if provider == "stripe":
        if not settings.STRIPE_SECRET_KEY.startswith("sk_test_"):
            raise BillingProviderError("Only Stripe test credentials are allowed in the portfolio.")
        if settings.STRIPE_API_BASE.rstrip("/") != "https://api.stripe.com/v1":
            raise BillingProviderError("Only the official Stripe test integration is allowed.")
    elif provider == "paypal" and settings.PAYPAL_API_BASE.rstrip("/") != "https://api-m.sandbox.paypal.com":
        raise BillingProviderError("Only the PayPal sandbox is allowed in the portfolio.")


def create_stripe_checkout_session(user, plan):
    require_sandbox_billing("stripe")
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PRICE_PREMIUM_MONTHLY:
        raise BillingProviderError("Stripe is not configured.")

    payload = {
        "mode": "subscription",
        "success_url": settings.BILLING_SUCCESS_URL,
        "cancel_url": settings.BILLING_CANCEL_URL,
        "client_reference_id": str(user.id),
        "customer_email": user.email,
        "line_items[0][price]": settings.STRIPE_PRICE_PREMIUM_MONTHLY,
        "line_items[0][quantity]": "1",
        "metadata[user_id]": str(user.id),
        "metadata[plan_code]": plan.code,
        "subscription_data[metadata][user_id]": str(user.id),
        "subscription_data[metadata][plan_code]": plan.code,
    }
    response = _stripe_post("/checkout/sessions", payload)
    session_id = response.get("id", "")
    checkout_url = response.get("url", "")
    if not session_id or not checkout_url:
        raise BillingProviderError("Stripe did not return a checkout session URL.")

    subscription, _created = Subscription.objects.update_or_create(
        user=user,
        provider="stripe",
        provider_subscription_id=session_id,
        defaults={"plan": plan, "status": "pending"},
    )
    return {
        "provider": "stripe",
        "sessionId": session_id,
        "checkoutUrl": checkout_url,
        "subscriptionId": subscription.id,
        "plan": serialize_plan(plan),
        "successUrl": settings.BILLING_SUCCESS_URL,
        "cancelUrl": settings.BILLING_CANCEL_URL,
    }


def _stripe_post(path, payload):
    require_sandbox_billing("stripe")
    body = parse.urlencode(payload).encode("utf-8")
    stripe_request = request.Request(
        f"{settings.STRIPE_API_BASE.rstrip('/')}{path}",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with request.urlopen(stripe_request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise BillingProviderError("Stripe checkout session could not be created.") from exc


def process_stripe_webhook(raw_body, signature_header):
    require_sandbox_billing("stripe")
    event_payload = verify_stripe_signature(raw_body, signature_header)
    if event_payload.get("livemode"):
        raise BillingProviderError("Live Stripe events are not accepted in the portfolio.")
    event_id = event_payload.get("id", "")
    event_type = event_payload.get("type", "")

    webhook_event, created = WebhookEvent.objects.get_or_create(
        provider="stripe",
        event_id=event_id,
        defaults={"event_type": event_type, "payload": event_payload, "status": "received"},
    )
    if not created and webhook_event.status == "processed":
        return webhook_event, False

    try:
        _apply_stripe_event(event_payload)
        webhook_event.status = "processed"
        webhook_event.processed_at = django_timezone.now()
        webhook_event.payload = event_payload
        webhook_event.event_type = event_type
        webhook_event.save(update_fields=["status", "processed_at", "payload", "event_type"])
    except Exception:
        webhook_event.status = "failed"
        webhook_event.payload = event_payload
        webhook_event.event_type = event_type
        webhook_event.processed_at = django_timezone.now()
        webhook_event.save(update_fields=["status", "processed_at", "payload", "event_type"])
        raise
    return webhook_event, True


def process_paypal_webhook(raw_body):
    require_sandbox_billing("paypal")
    if not settings.PAYPAL_WEBHOOK_ID:
        raise BillingProviderError("PayPal webhook is not configured.")
    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise BillingProviderError("PayPal webhook payload is not valid JSON.") from exc

    event_id = event_payload.get("id", "")
    event_type = event_payload.get("event_type", "")
    webhook_event, created = WebhookEvent.objects.get_or_create(
        provider="paypal",
        event_id=event_id,
        defaults={"event_type": event_type, "payload": event_payload, "status": "received"},
    )
    if not created:
        return webhook_event, False
    return webhook_event, True


def verify_stripe_signature(raw_body, signature_header):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise WebhookSignatureError("Stripe webhook secret is not configured.")
    timestamp, signatures = _parse_stripe_signature_header(signature_header)
    if abs(time.time() - timestamp) > settings.STRIPE_WEBHOOK_TOLERANCE_SECONDS:
        raise WebhookSignatureError("Stripe webhook timestamp is outside tolerance.")
    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(settings.STRIPE_WEBHOOK_SECRET.encode("utf-8"), signed_payload, sha256).hexdigest()
    if not any(hmac.compare_digest(expected, signature) for signature in signatures):
        raise WebhookSignatureError("Stripe webhook signature is invalid.")
    try:
        return json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise WebhookSignatureError("Stripe webhook payload is not valid JSON.") from exc


def _parse_stripe_signature_header(signature_header):
    parts = {}
    for item in (signature_header or "").split(","):
        if "=" not in item:
            continue
        key, value = item.split("=", 1)
        parts.setdefault(key, []).append(value)
    try:
        timestamp = int(parts.get("t", [""])[0])
    except ValueError as exc:
        raise WebhookSignatureError("Stripe webhook timestamp is invalid.") from exc
    signatures = parts.get("v1", [])
    if not timestamp or not signatures:
        raise WebhookSignatureError("Stripe webhook signature header is incomplete.")
    return timestamp, signatures


def _apply_stripe_event(event_payload):
    event_type = event_payload.get("type", "")
    obj = event_payload.get("data", {}).get("object", {})
    if event_type == "checkout.session.completed":
        _handle_checkout_session_completed(obj)
    elif event_type in ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]:
        _handle_subscription_event(obj, event_type)


def _handle_checkout_session_completed(session):
    session_id = session.get("id", "")
    stripe_subscription_id = session.get("subscription", "")
    metadata = session.get("metadata") or {}
    subscription = Subscription.objects.filter(provider="stripe", provider_subscription_id=session_id).first()
    if subscription is None:
        subscription = _subscription_from_metadata(metadata)
    if subscription is None:
        return
    subscription.status = "active"
    if stripe_subscription_id:
        subscription.provider_subscription_id = stripe_subscription_id
    subscription.save(update_fields=["status", "provider_subscription_id", "updated_at"])


def _handle_subscription_event(stripe_subscription, event_type):
    stripe_subscription_id = stripe_subscription.get("id", "")
    metadata = stripe_subscription.get("metadata") or {}
    subscription = Subscription.objects.filter(provider="stripe", provider_subscription_id=stripe_subscription_id).first()
    if subscription is None:
        subscription = _subscription_from_metadata(metadata)
    if subscription is None:
        return

    if event_type == "customer.subscription.deleted":
        subscription.status = "canceled"
    else:
        subscription.status = _map_stripe_subscription_status(stripe_subscription.get("status", ""))
    subscription.cancel_at_period_end = bool(stripe_subscription.get("cancel_at_period_end", False))
    subscription.current_period_start = _datetime_from_timestamp(stripe_subscription.get("current_period_start"))
    subscription.current_period_end = _datetime_from_timestamp(stripe_subscription.get("current_period_end"))
    subscription.save(
        update_fields=[
            "status",
            "cancel_at_period_end",
            "current_period_start",
            "current_period_end",
            "updated_at",
        ]
    )


def _subscription_from_metadata(metadata):
    user_id = metadata.get("user_id")
    plan_code = metadata.get("plan_code", "premium")
    if not user_id:
        return None
    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    plan = Plan.objects.filter(code=plan_code, is_active=True).first()
    if user is None or plan is None:
        return None
    subscription, _created = Subscription.objects.get_or_create(
        user=user,
        provider="stripe",
        provider_subscription_id="",
        defaults={"plan": plan, "status": "pending"},
    )
    return subscription


def _map_stripe_subscription_status(status):
    return {
        "trialing": "trialing",
        "active": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "past_due",
        "incomplete": "pending",
        "incomplete_expired": "expired",
    }.get(status, "pending")


def _datetime_from_timestamp(value):
    if not value:
        return None
    return datetime.fromtimestamp(int(value), tz=timezone.utc)
