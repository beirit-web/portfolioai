"""The demo checkout limits and retention work across both public interfaces."""

import json
from datetime import timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import CakeOrder, CakeOrderItem, CakeProduct, OrderSubmissionBudget
from .services import CART_KEY
from .submissions import cleanup_demo_data


@override_settings(
    LOGIN_REQUIRED=False,
    SHOP_SUBMISSION_WINDOW_SECONDS=600,
    SHOP_SESSION_SUBMISSION_LIMIT=2,
    SHOP_IP_SUBMISSION_LIMIT=20,
)
class ShopSubmissionBudgetTests(TestCase):
    def setUp(self):
        self.product = CakeProduct.objects.get(sku="BK-ERD-001")
        self.date = (timezone.localdate() + timedelta(days=3)).isoformat()

    def api_payload(self, client):
        token = client.get(reverse("shop:product_list")).json()["checkoutToken"]
        return {
            "requestKey": token,
            "customer": {"name": "Demo Kunde", "email": "demo-shop@example.test"},
            "deliveryMethod": "pickup",
            "requestedDate": self.date,
            "items": [{"productId": self.product.pk, "quantity": 1}],
        }

    def api_post(self, client, payload=None, ip="192.0.2.10", **headers):
        if payload is None:
            payload = self.api_payload(client)
        return client.post(
            reverse("shop:create_order"), json.dumps(payload),
            content_type="application/json", REMOTE_ADDR=ip, **headers,
        )

    def html_payload(self, client):
        client.post(reverse("storefront:add", args=[self.product.pk]), {"quantity": 1})
        response = client.get(reverse("storefront:checkout"))
        return {
            "request_key": str(response.context["form"].initial["request_key"]),
            "customer_name": "Demo Kunde",
            "customer_email": "demo-shop@example.test",
            "delivery_method": "pickup",
            "requested_date": self.date,
        }

    def html_post(self, client, payload=None, ip="192.0.2.10", **headers):
        if payload is None:
            payload = self.html_payload(client)
        return client.post(reverse("storefront:checkout"), payload, REMOTE_ADDR=ip, **headers)

    def budgets(self):
        return dict(OrderSubmissionBudget.objects.values_list("key", "submissions"))

    def assert_limited(self, response):
        self.assertEqual(response.status_code, 429, response.content)
        self.assertGreaterEqual(int(response["Retry-After"]), 1)
        self.assertLessEqual(int(response["Retry-After"]), 600)

    def test_html_and_json_share_the_session_budget_even_when_the_ip_changes(self):
        self.assertEqual(self.html_post(self.client).status_code, 302)
        self.assertEqual(self.api_post(self.client, ip="192.0.2.11").status_code, 201)
        before = self.budgets()

        denied = self.api_post(self.client, ip="192.0.2.12")
        self.assert_limited(denied)
        self.assertIn("detail", denied.json()["errors"])
        self.assertEqual(CakeOrder.objects.count(), 2)
        self.assertEqual(CakeOrderItem.objects.count(), 2)
        self.assertEqual(self.budgets(), before)
        self.assertEqual(sorted(before.values()), [1, 1, 2])
        self.assertTrue(all(len(key) == 64 for key in before))
        self.assertTrue(all("192.0.2." not in key for key in before))

    @override_settings(SHOP_SESSION_SUBMISSION_LIMIT=20, SHOP_IP_SUBMISSION_LIMIT=2)
    def test_ip_budget_is_shared_across_sessions_and_ignores_forwarding_headers(self):
        first, second, blocked = Client(), Client(), Client()
        self.assertEqual(self.api_post(first).status_code, 201)
        self.assertEqual(self.html_post(second).status_code, 302)
        before = self.budgets()

        denied_json = self.api_post(blocked, HTTP_X_FORWARDED_FOR="198.51.100.1")
        denied_html = self.html_post(blocked, HTTP_X_FORWARDED_FOR="198.51.100.2")
        denied_existing_session = self.api_post(second)
        for response in (denied_json, denied_html, denied_existing_session):
            self.assert_limited(response)
        self.assertContains(denied_html, "Zu viele Demo-Anfragen", status_code=429)
        self.assertEqual(CakeOrder.objects.count(), 2)
        self.assertEqual(CakeOrderItem.objects.count(), 2)
        self.assertEqual(self.budgets(), before)
        self.assertEqual(blocked.session[CART_KEY], {str(self.product.pk): 1})

        # An independent network address still has its own available allowance.
        self.assertEqual(self.api_post(Client(), ip="192.0.2.20").status_code, 201)
        self.assertEqual(CakeOrder.objects.count(), 3)

    @override_settings(SHOP_SESSION_SUBMISSION_LIMIT=1, SHOP_IP_SUBMISSION_LIMIT=1)
    def test_idempotent_retries_still_work_after_the_budget_has_been_spent(self):
        payload = self.api_payload(self.client)
        first = self.api_post(self.client, payload)
        self.assertEqual(first.status_code, 201)
        before = self.budgets()

        retried = self.api_post(self.client, payload)
        self.assertEqual(retried.status_code, 200)
        self.assertEqual(retried.json()["orderNumber"], first.json()["orderNumber"])
        html_retry = self.html_post(self.client, {"request_key": payload["requestKey"]})
        self.assertRedirects(
            html_retry,
            reverse("storefront:confirmation", args=[first.json()["orderNumber"]]),
        )
        self.assertEqual(CakeOrder.objects.count(), 1)
        self.assertEqual(CakeOrderItem.objects.count(), 1)
        self.assertEqual(self.budgets(), before)
        self.assert_limited(self.api_post(self.client))

    @override_settings(SHOP_SESSION_SUBMISSION_LIMIT=1, SHOP_IP_SUBMISSION_LIMIT=1)
    def test_rejected_request_can_be_retried_after_the_window_expires(self):
        now = timezone.now()
        with patch("shop.submissions.timezone.now", return_value=now):
            self.assertEqual(self.api_post(self.client).status_code, 201)
            payload = self.api_payload(self.client)
            denied = self.api_post(self.client, payload)
            self.assert_limited(denied)
            self.assertEqual(denied["Retry-After"], "600")
            self.assertEqual(CakeOrder.objects.count(), 1)

        with patch("shop.submissions.timezone.now", return_value=now + timedelta(seconds=601)):
            retried = self.api_post(self.client, payload)
        self.assertEqual(retried.status_code, 201, retried.content)
        self.assertNotIn("Retry-After", retried)
        self.assertEqual(CakeOrder.objects.count(), 2)
        self.assertEqual(sorted(self.budgets().values()), [1, 1])


@override_settings(SHOP_GUEST_RETENTION_DAYS=30, SHOP_SUBMISSION_WINDOW_SECONDS=600)
class ShopDemoRetentionTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.product = CakeProduct.objects.get(sku="BK-ERD-001")
        self.owner = get_user_model().objects.create_user(
            username="demo-owner@example.test", email="demo-owner@example.test",
        )
        self.old_guest = self.make_order(days=31)
        self.boundary_guest = self.make_order(days=30)
        self.recent_guest = self.make_order(days=29)
        self.old_account = self.make_order(days=90, owner=self.owner)
        self.expired_budget = OrderSubmissionBudget.objects.create(
            key="a" * 64, submissions=2,
            window_started_at=self.now - timedelta(seconds=601),
        )
        self.active_budget = OrderSubmissionBudget.objects.create(
            key="b" * 64, submissions=1,
            window_started_at=self.now - timedelta(seconds=100),
        )

    def make_order(self, days, owner=None):
        order = CakeOrder.objects.create(
            owner=owner, customer_name="Demo Kunde", customer_email="demo-shop@example.test",
            delivery_method=CakeOrder.DELIVERY_PICKUP,
            subtotal=Decimal("39.90"), total=Decimal("39.90"),
        )
        CakeOrder.objects.filter(pk=order.pk).update(created_at=self.now - timedelta(days=days))
        CakeOrderItem.objects.create(
            order=order, product=self.product, product_name=self.product.name,
            unit_price=Decimal("39.90"), quantity=1, line_total=Decimal("39.90"),
        )
        return order

    def test_cleanup_removes_only_expired_guest_orders_and_their_items(self):
        with patch("shop.submissions.timezone.now", return_value=self.now):
            counts = cleanup_demo_data()
        self.assertEqual(counts, {"orders": 1, "budgets": 1})
        self.assertFalse(CakeOrder.objects.filter(pk=self.old_guest.pk).exists())
        self.assertFalse(CakeOrderItem.objects.filter(order_id=self.old_guest.pk).exists())
        self.assertSetEqual(
            set(CakeOrder.objects.values_list("pk", flat=True)),
            {self.boundary_guest.pk, self.recent_guest.pk, self.old_account.pk},
        )
        self.assertEqual(CakeOrderItem.objects.count(), 3)
        self.assertEqual(CakeOrder.objects.get(pk=self.old_account.pk).owner, self.owner)
        self.assertTrue(CakeProduct.objects.filter(pk=self.product.pk).exists())
        self.assertFalse(OrderSubmissionBudget.objects.filter(pk=self.expired_budget.pk).exists())
        self.assertTrue(OrderSubmissionBudget.objects.filter(pk=self.active_budget.pk).exists())

    def test_cleanup_command_dry_run_preserves_data_and_days_changes_only_guest_retention(self):
        output = StringIO()
        with patch("shop.submissions.timezone.now", return_value=self.now):
            call_command("cleanup_shop_demo", days=10, dry_run=True, stdout=output)
        self.assertIn("Would remove 3 anonymous demo requests and 1 expired counters", output.getvalue())
        self.assertEqual(CakeOrder.objects.count(), 4)
        self.assertEqual(CakeOrderItem.objects.count(), 4)
        self.assertEqual(OrderSubmissionBudget.objects.count(), 2)

        output = StringIO()
        with patch("shop.submissions.timezone.now", return_value=self.now):
            call_command("cleanup_shop_demo", days=10, stdout=output)
        self.assertIn("Removed 3 anonymous demo requests and 1 expired counters", output.getvalue())
        self.assertEqual(CakeOrder.objects.get(), self.old_account)
        self.assertEqual(CakeOrderItem.objects.get().order, self.old_account)
        self.assertEqual(OrderSubmissionBudget.objects.get(), self.active_budget)
