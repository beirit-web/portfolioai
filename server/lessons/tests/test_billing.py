from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
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
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        denied = self.client.get("/deutschlive/api/premium/feature-preview/")
        self.assertEqual(denied.status_code, 402)

        plan = Plan.objects.get(code="premium")
        Subscription.objects.create(
            user=user,
            plan=plan,
            status="active",
            current_period_end=timezone.now() + timedelta(days=30),
        )
        allowed = self.client.get("/deutschlive/api/premium/feature-preview/")
        self.assertEqual(allowed.status_code, 200)

    def test_billing_status_and_checkout_placeholder_are_available(self):
        user = get_user_model().objects.create_user(username="billinguser", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        status_response = self.client.get("/deutschlive/api/billing/status/")
        self.assertEqual(status_response.status_code, 200)
        billing = status_response.json()["billing"]
        self.assertTrue(any(plan["code"] == "premium" for plan in billing["plans"]))
        self.assertEqual(set(billing["providers"]), {"stripe", "paypal"})
        for provider in billing["providers"].values():
            self.assertIsInstance(provider["configured"], bool)
            self.assertIsInstance(provider["webhookConfigured"], bool)

        checkout_response = self.client.post(
            "/deutschlive/api/billing/checkout/",
            data={"provider": "stripe", "planCode": "premium"},
            content_type="application/json",
        )
        self.assertEqual(checkout_response.status_code, 501)
        self.assertEqual(checkout_response.json()["provider"], "stripe")

    @override_settings(
        PORTFOLIO_DEMO_MODE=True, STRIPE_SECRET_KEY="sk_live_example",
        STRIPE_PRICE_PREMIUM_MONTHLY="price_example", STRIPE_WEBHOOK_SECRET="whsec_example",
        PAYPAL_CLIENT_ID="example-client", PAYPAL_CLIENT_SECRET="example-secret",
        PAYPAL_PLAN_PREMIUM_MONTHLY="P-EXAMPLE", PAYPAL_WEBHOOK_ID="WH-EXAMPLE",
    )
    def test_portfolio_checkout_stays_disabled_with_legacy_credentials(self):
        user = get_user_model().objects.create_user(username="demobuyer", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/", data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        status_response = self.client.get("/deutschlive/api/billing/status/")
        for provider in status_response.json()["billing"]["providers"].values():
            self.assertFalse(provider["configured"])
            self.assertFalse(provider["webhookConfigured"])
        for provider in ("stripe", "paypal"):
            with self.subTest(provider=provider):
                response = self.client.post(
                    "/deutschlive/api/billing/checkout/", data={"provider": provider, "planCode": "premium"},
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 501)
                self.assertTrue(response.json()["demo"])
        self.assertFalse(Subscription.objects.filter(user=user).exists())
