from datetime import timedelta
import hmac
import json
import time
from hashlib import sha256

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone
from unittest.mock import patch

from ..security import validate_private_upload
from ..billing_service import BillingProviderError, create_stripe_checkout_session, process_paypal_webhook, process_stripe_webhook
from ..models import AuditEvent, Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WebhookEvent, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[], PORTFOLIO_DEMO_MODE=False, STRIPE_SECRET_KEY="sk_test_example", PAYPAL_API_BASE="https://api-m.sandbox.paypal.com")
class PremiumBillingTests(TestCase):
    def test_seeded_plans_exist(self):
        self.assertTrue(Plan.objects.filter(code="free", is_premium=False).exists())
        self.assertTrue(Plan.objects.filter(code="premium", is_premium=True).exists())

    def test_active_subscription_grants_premium_access(self):
        user = get_user_model().objects.create_user(username="subscriber", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user)
        plan = Plan.objects.get(code="premium")
        Subscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            provider="manual",
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
        )

        self.assertTrue(profile.has_premium_access)

    def test_premium_route_requires_active_access(self):
        user = get_user_model().objects.create_user(username="freeuser", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        denied = self.client.get("/api/premium/feature-preview/")
        self.assertEqual(denied.status_code, 402)
        self.assertEqual(denied.json()["code"], "premium_required")
        self.assertEqual(denied["X-Premium-Required"], "true")
        self.assertEqual(denied["X-Premium-Policy"], "premium_feature_preview")
        audit_event = AuditEvent.objects.get(action="permission_denied", actor=user)
        self.assertEqual(audit_event.metadata["policy"], "premium_feature_preview")

        plan = Plan.objects.get(code="premium")
        Subscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            current_period_end=timezone.now() + timedelta(days=30),
        )
        allowed = self.client.get("/api/premium/feature-preview/")
        self.assertEqual(allowed.status_code, 200)

    def test_premium_route_requires_authentication_before_subscription_check(self):
        response = self.client.get("/api/premium/feature-preview/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "auth_required")
        self.assertEqual(response["X-Premium-Policy"], "premium_feature_preview")

    @override_settings(AI_PREMIUM_REQUIRED=True)
    def test_premium_middleware_can_gate_ai_content_routes(self):
        user = get_user_model().objects.create_user(username="aigated", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/ai/adaptive-scene/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()["code"], "premium_required")
        self.assertEqual(response["X-Premium-Policy"], "ai_adaptive_scene")

    def test_billing_status_and_checkout_placeholder_are_available(self):
        user = get_user_model().objects.create_user(username="billinguser", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        status_response = self.client.get("/api/billing/status/")
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(any(plan["code"] == "premium" for plan in status_response.json()["billing"]["plans"]))

        checkout_response = self.client.post(
            "/api/billing/checkout/",
            data={"provider": "stripe", "planCode": "premium"},
            content_type="application/json",
        )
        self.assertEqual(checkout_response.status_code, 501)
        self.assertEqual(checkout_response.json()["provider"], "stripe")
        self.assertEqual(checkout_response.json()["code"], "billing_provider_not_configured")

    @override_settings(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_PRICE_PREMIUM_MONTHLY="price_123",
        BILLING_SUCCESS_URL="https://portfolio.example.com/dashboard?checkout=success",
        BILLING_CANCEL_URL="https://portfolio.example.com/dashboard?checkout=cancel",
    )
    def test_stripe_checkout_creates_session_and_pending_subscription(self):
        class FakeStripeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self):
                return b'{"id":"cs_test_123","url":"https://checkout.stripe.com/c/pay/cs_test_123"}'

        user = get_user_model().objects.create_user(
            username="stripebuyer",
            email="stripebuyer@example.com",
            password="strong-pass-123",
        )
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        with patch("lessons.billing_service.request.urlopen", return_value=FakeStripeResponse()) as urlopen:
            response = self.client.post(
                "/api/billing/checkout/",
                data={"provider": "stripe", "planCode": "premium"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["checkout"]
        self.assertEqual(payload["sessionId"], "cs_test_123")
        self.assertEqual(payload["checkoutUrl"], "https://checkout.stripe.com/c/pay/cs_test_123")
        subscription = Subscription.objects.get(user=user, provider="stripe")
        self.assertEqual(subscription.status, "pending")
        self.assertEqual(subscription.provider_subscription_id, "cs_test_123")
        request_body = urlopen.call_args.args[0].data.decode("utf-8")
        self.assertIn("mode=subscription", request_body)
        self.assertIn("line_items%5B0%5D%5Bprice%5D=price_123", request_body)

    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
    def test_stripe_webhook_rejects_invalid_signature(self):
        response = self.client.post(
            "/api/billing/stripe/webhook/",
            data=json.dumps({"id": "evt_invalid", "type": "checkout.session.completed"}),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=123,v1=bad",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_stripe_signature")

    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
    def test_stripe_checkout_completed_webhook_activates_pending_subscription_and_stores_event(self):
        user = get_user_model().objects.create_user(username="webhookuser", password="strong-pass-123")
        plan = Plan.objects.get(code="premium")
        Subscription.objects.create(
            user=user,
            plan=plan,
            status="pending",
            provider="stripe",
            provider_subscription_id="cs_test_123",
        )
        payload = {
            "id": "evt_checkout_completed",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_123",
                    "subscription": "sub_123",
                    "metadata": {"user_id": str(user.id), "plan_code": "premium"},
                }
            },
        }

        response = self.client.post(
            "/api/billing/stripe/webhook/",
            data=json.dumps(payload, separators=(",", ":")),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=_stripe_signature(payload),
        )

        self.assertEqual(response.status_code, 200)
        subscription = Subscription.objects.get(user=user, provider="stripe")
        self.assertEqual(subscription.status, "active")
        self.assertEqual(subscription.provider_subscription_id, "sub_123")
        event = WebhookEvent.objects.get(event_id="evt_checkout_completed", provider="stripe")
        self.assertEqual(event.status, "processed")

    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
    def test_stripe_subscription_update_webhook_updates_subscription_period(self):
        user = get_user_model().objects.create_user(username="subupdate", password="strong-pass-123")
        plan = Plan.objects.get(code="premium")
        Subscription.objects.create(
            user=user,
            plan=plan,
            status="pending",
            provider="stripe",
            provider_subscription_id="sub_update",
        )
        payload = {
            "id": "evt_subscription_updated",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_update",
                    "status": "past_due",
                    "cancel_at_period_end": True,
                    "current_period_start": 1760000000,
                    "current_period_end": 1762600000,
                    "metadata": {"user_id": str(user.id), "plan_code": "premium"},
                }
            },
        }

        response = self.client.post(
            "/api/billing/stripe/webhook/",
            data=json.dumps(payload, separators=(",", ":")),
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=_stripe_signature(payload),
        )

        self.assertEqual(response.status_code, 200)
        subscription = Subscription.objects.get(user=user, provider="stripe")
        self.assertEqual(subscription.status, "past_due")
        self.assertTrue(subscription.cancel_at_period_end)
        self.assertIsNotNone(subscription.current_period_end)

    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
    def test_stripe_webhook_is_idempotent_for_processed_events(self):
        payload = {
            "id": "evt_duplicate",
            "type": "customer.subscription.deleted",
            "data": {"object": {"id": "sub_missing", "status": "canceled", "metadata": {}}},
        }
        body = json.dumps(payload, separators=(",", ":"))
        signature = _stripe_signature(payload)

        first = self.client.post(
            "/api/billing/stripe/webhook/",
            data=body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=signature,
        )
        second = self.client.post(
            "/api/billing/stripe/webhook/",
            data=body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=signature,
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.json()["processed"])
        self.assertEqual(WebhookEvent.objects.filter(event_id="evt_duplicate").count(), 1)

    @override_settings(
        PAYPAL_CLIENT_ID="paypal-client",
        PAYPAL_CLIENT_SECRET="paypal-secret",
        PAYPAL_PLAN_PREMIUM_MONTHLY="P-PREMIUM",
        PAYPAL_API_BASE="https://api-m.sandbox.paypal.com",
    )
    def test_paypal_checkout_returns_prepared_provider_payload(self):
        user = get_user_model().objects.create_user(username="paypalbuyer", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/billing/checkout/",
            data={"provider": "paypal", "planCode": "premium"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        checkout = response.json()["checkout"]
        self.assertEqual(checkout["provider"], "paypal")
        self.assertEqual(checkout["paypalPlanId"], "P-PREMIUM")
        self.assertEqual(checkout["activation"], "prepared")

    def test_paypal_webhook_requires_configuration(self):
        response = self.client.post(
            "/api/billing/paypal/webhook/",
            data=json.dumps({"id": "WH-1", "event_type": "BILLING.SUBSCRIPTION.ACTIVATED"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 501)
        self.assertEqual(response.json()["code"], "paypal_webhook_not_configured")

    @override_settings(PAYPAL_WEBHOOK_ID="WH-CONFIGURED")
    def test_paypal_webhook_stores_events_idempotently(self):
        payload = {"id": "WH-EVENT-1", "event_type": "BILLING.SUBSCRIPTION.ACTIVATED", "resource": {"id": "I-SUB"}}
        body = json.dumps(payload)

        first = self.client.post("/api/billing/paypal/webhook/", data=body, content_type="application/json")
        second = self.client.post("/api/billing/paypal/webhook/", data=body, content_type="application/json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.json()["processed"])
        event = WebhookEvent.objects.get(provider="paypal", event_id="WH-EVENT-1")
        self.assertEqual(event.status, "received")
        self.assertEqual(event.event_type, "BILLING.SUBSCRIPTION.ACTIVATED")


@override_settings(
    AUTH_PASSWORD_VALIDATORS=[], PORTFOLIO_DEMO_MODE=True,
    STRIPE_SECRET_KEY="sk_live_example", STRIPE_PRICE_PREMIUM_MONTHLY="price_example",
    STRIPE_WEBHOOK_SECRET="whsec_test", PAYPAL_CLIENT_ID="example-client",
    PAYPAL_CLIENT_SECRET="example-secret", PAYPAL_PLAN_PREMIUM_MONTHLY="P-EXAMPLE",
    PAYPAL_WEBHOOK_ID="WH-EXAMPLE", PAYPAL_API_BASE="https://api-m.paypal.com",
)
class PortfolioBillingSafetyTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="demobuyer", password="strong-pass-123")
        self.plan = Plan.objects.get(code="premium")
        self.client.post(
            "/api/auth/login/", data={"username": self.user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

    def test_demo_blocks_checkout_and_webhooks_even_with_credentials(self):
        subscription = Subscription.objects.create(user=self.user, plan=self.plan, provider="stripe", status="pending")
        with patch("lessons.billing_service.request.urlopen") as provider_request:
            status_response = self.client.get("/api/billing/status/")
            for provider in status_response.json()["billing"]["providers"].values():
                self.assertFalse(provider["configured"])
                self.assertFalse(provider["webhookConfigured"])
                self.assertTrue(provider["demo"])
            for provider in ("stripe", "paypal"):
                with self.subTest(provider=provider):
                    checkout = self.client.post(
                        "/api/billing/checkout/", data={"provider": provider, "planCode": "premium"},
                        content_type="application/json",
                    )
                    self.assertEqual(checkout.status_code, 501)
                    self.assertEqual(checkout.json()["code"], "portfolio_demo")
                    webhook = self.client.post(
                        f"/api/billing/{provider}/webhook/", data=json.dumps({"id": "DEMO-EVENT"}),
                        content_type="application/json",
                    )
                    self.assertEqual(webhook.status_code, 404)
                    self.assertTrue(webhook.json()["demo"])
            provider_request.assert_not_called()
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, "pending")
        self.assertEqual(Subscription.objects.count(), 1)
        self.assertFalse(WebhookEvent.objects.exists())

    def test_demo_blocks_service_calls_before_network_or_event_storage(self):
        operations = (
            lambda: create_stripe_checkout_session(self.user, self.plan),
            lambda: process_stripe_webhook(b'{}', ""),
            lambda: process_paypal_webhook(b'{}'),
        )
        with patch("lessons.billing_service.request.urlopen") as provider_request:
            for operation in operations:
                with self.subTest(operation=operation), self.assertRaises(BillingProviderError):
                    operation()
            provider_request.assert_not_called()
        self.assertFalse(Subscription.objects.exists())
        self.assertFalse(WebhookEvent.objects.exists())

    @override_settings(PORTFOLIO_DEMO_MODE=False)
    def test_live_stripe_key_and_paypal_endpoint_are_rejected(self):
        with patch("lessons.billing_service.request.urlopen") as provider_request:
            with self.assertRaises(BillingProviderError):
                create_stripe_checkout_session(self.user, self.plan)
            with self.assertRaises(BillingProviderError):
                process_paypal_webhook(b'{}')
            provider_request.assert_not_called()
        self.assertFalse(Subscription.objects.exists())
        self.assertFalse(WebhookEvent.objects.exists())

    @override_settings(PORTFOLIO_DEMO_MODE=False, STRIPE_SECRET_KEY="sk_test_example")
    def test_signed_live_stripe_event_is_rejected_without_mutation(self):
        payload = {"id": "evt_live_example", "type": "checkout.session.completed", "livemode": True}
        response = self.client.post(
            "/api/billing/stripe/webhook/", data=json.dumps(payload, separators=(",", ":")),
            content_type="application/json", HTTP_STRIPE_SIGNATURE=_stripe_signature(payload),
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Subscription.objects.exists())
        self.assertFalse(WebhookEvent.objects.exists())


def _stripe_signature(payload):
    timestamp = int(time.time())
    body = json.dumps(payload, separators=(",", ":"))
    signed_payload = f"{timestamp}.{body}".encode("utf-8")
    signature = hmac.new(b"whsec_test", signed_payload, sha256).hexdigest()
    return f"t={timestamp},v1={signature}"
