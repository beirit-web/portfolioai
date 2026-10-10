from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings

from pages.models import PaymentRequest, PayPalPayment
from pages.paypal import PayPalClient, PayPalError, cancel_paypal_order, capture_paypal_order, create_paypal_order


@override_settings(LOGIN_REQUIRED=False)
class DonationPageTests(TestCase):
    @override_settings(PAYPAL_DONATE_URL="", PAYPAL_BUSINESS_EMAIL="")
    def test_donation_routes_redirect_to_projects(self):
        for path in ("/spenden", "/spenden/"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertRedirects(response, "/projekte", fetch_redirect_response=False)

    @override_settings(PORTFOLIO_DEMO_MODE=True, PAYPAL_DONATE_URL="https://www.paypal.com/donate/example")
    def test_donation_redirect_hides_legacy_paypal_target(self):
        response = self.client.get("/spenden/", follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "https://www.paypal.com/donate/example")
        self.assertNotContains(response, "Beispiel einer Spendenoberfläche")
        self.assertEqual(response.redirect_chain, [("/projekte", 302)])

    def test_legacy_payment_routes_redirect_to_projects_without_payment_calls(self):
        with patch("pages.paypal.request.urlopen") as provider_request:
            for path in ("/zahlung", "/zahlung/erfolg", "/zahlung/abbruch"):
                for suffix in ("", "/"):
                    with self.subTest(path=path, suffix=suffix):
                        response = self.client.get(f"{path}{suffix}?token=MUSTER-ORDER")
                        self.assertRedirects(response, "/projekte", fetch_redirect_response=False)
            provider_request.assert_not_called()


class PayPalInvoiceCheckoutDisabledTests(TestCase):
    @override_settings(PORTFOLIO_DEMO_MODE=False, PAYPAL_INVOICE_CHECKOUT_ENABLED=False)
    def test_invoice_checkout_is_not_publicly_available(self):
        response = self.client.post(
            "/api/payments/paypal/create-order/",
            data={"paymentRequestId": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertIn("freiwillige Spenden", response.json()["error"])


@override_settings(
    PORTFOLIO_DEMO_MODE=True,
    PAYPAL_INVOICE_CHECKOUT_ENABLED=True,
    PAYPAL_CLIENT_ID="legacy-example-client-id",
    PAYPAL_CLIENT_SECRET="legacy-example-client-secret",
    PAYPAL_MODE="live",
)
class PortfolioPaymentSafetyTests(TestCase):
    def test_all_invoice_endpoints_block_existing_credentials_without_changes(self):
        payment_request = PaymentRequest.objects.create(
            internal_reference="DEMO-INV-1", title="Demo-Rechnung", amount=Decimal("49.00"),
            currency="EUR", status=PaymentRequest.STATUS_OPEN,
        )
        payment = PayPalPayment.objects.create(
            payment_request=payment_request, internal_reference=payment_request.internal_reference,
            paypal_order_id="DEMO-ORDER-1", amount=payment_request.amount,
            currency="EUR", status=PayPalPayment.STATUS_CREATED,
        )
        endpoints = (
            ("get", "/api/payments/paypal/config/", None),
            ("get", "/api/payments/paypal/status/DEMO-ORDER-1/", None),
            ("post", "/api/payments/paypal/create-order/", {"paymentRequestId": payment_request.pk}),
            ("post", "/api/payments/paypal/capture-order/", {"orderId": payment.paypal_order_id}),
            ("post", "/api/payments/paypal/cancel-order/", {"orderId": payment.paypal_order_id}),
        )
        with patch("pages.paypal.request.urlopen") as provider_request:
            for method, url, payload in endpoints:
                with self.subTest(url=url):
                    response = getattr(self.client, method)(url, data=payload, content_type="application/json")
                    self.assertEqual(response.status_code, 404)
                    self.assertTrue(response.json()["demo"])
                    self.assertNotIn("legacy-example", response.content.decode())
            provider_request.assert_not_called()
        payment.refresh_from_db()
        payment_request.refresh_from_db()
        self.assertEqual(payment.status, PayPalPayment.STATUS_CREATED)
        self.assertEqual(payment_request.status, PaymentRequest.STATUS_OPEN)
        self.assertEqual(PayPalPayment.objects.count(), 1)

    def test_service_entry_points_also_block_demo(self):
        with patch("pages.paypal.request.urlopen") as provider_request:
            operations = (
                PayPalClient,
                lambda: create_paypal_order(payment_request_id=1, return_url="https://example.com/return", cancel_url="https://example.com/cancel"),
                lambda: capture_paypal_order(order_id="DEMO-ORDER-1"),
                lambda: cancel_paypal_order(order_id="DEMO-ORDER-1"),
            )
            for operation in operations:
                with self.subTest(operation=operation), self.assertRaises(PayPalError):
                    operation()
            provider_request.assert_not_called()

    @override_settings(PORTFOLIO_DEMO_MODE=False)
    def test_live_mode_is_rejected_before_any_provider_request(self):
        with patch("pages.paypal.request.urlopen") as provider_request:
            with self.assertRaises(PayPalError):
                PayPalClient()
            response = self.client.post(
                "/api/payments/paypal/create-order/", data={"paymentRequestId": 1}, content_type="application/json",
            )
            self.assertEqual(response.status_code, 503)
            provider_request.assert_not_called()

    def test_existing_client_rechecks_demo_before_network(self):
        with override_settings(PORTFOLIO_DEMO_MODE=False, PAYPAL_MODE="sandbox"):
            client = PayPalClient()
        with patch("pages.paypal.request.urlopen") as provider_request:
            with self.assertRaises(PayPalError):
                client.access_token()
            with self.assertRaises(PayPalError):
                client._request("POST", "/v2/checkout/orders", payload={})
            provider_request.assert_not_called()


@override_settings(
    PORTFOLIO_DEMO_MODE=False,
    PAYPAL_CLIENT_ID="sandbox-client-id",
    PAYPAL_CLIENT_SECRET="sandbox-client-secret",
    PAYPAL_MODE="sandbox",
    PAYPAL_CURRENCY="EUR",
    PAYPAL_INVOICE_CHECKOUT_ENABLED=True,
)
class PayPalPaymentApiTests(TestCase):
    def create_payment(self, *, amount=Decimal("49.00"), currency="EUR", status=PayPalPayment.STATUS_CREATED):
        payment_request = PaymentRequest.objects.create(
            internal_reference="BD-INV-1001",
            title="Rechnung BD-INV-1001",
            amount=amount,
            currency=currency,
            status=PaymentRequest.STATUS_OPEN,
        )
        payment = PayPalPayment.objects.create(
            payment_request=payment_request,
            internal_reference=payment_request.internal_reference,
            paypal_order_id="PAYPAL-ORDER-1001",
            amount=amount,
            currency=currency,
            status=status,
        )
        return payment_request, payment

    def capture_response(self, *, amount="49.00", currency="EUR", status="COMPLETED", capture_status="COMPLETED", reference="BD-INV-1001"):
        return {
            "id": "PAYPAL-ORDER-1001",
            "status": status,
            "payer": {"email_address": "buyer@example.test"},
            "purchase_units": [
                {
                    "reference_id": reference,
                    "payments": {
                        "captures": [
                            {
                                "id": "CAPTURE-1001",
                                "status": capture_status,
                                "amount": {"value": amount, "currency_code": currency},
                            }
                        ]
                    },
                }
            ],
        }

    def test_capture_rejects_wrong_amount(self):
        self.create_payment()

        with patch("pages.paypal.PayPalClient.capture_order", return_value=self.capture_response(amount="50.00")):
            response = self.client.post(
                "/api/payments/paypal/capture-order/",
                data={"orderId": "PAYPAL-ORDER-1001"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 409)
        payment = PayPalPayment.objects.get(paypal_order_id="PAYPAL-ORDER-1001")
        self.assertEqual(payment.status, PayPalPayment.STATUS_FAILED)
        self.assertEqual(payment.payment_request.status, PaymentRequest.STATUS_OPEN)

    def test_capture_marks_successful_sandbox_payment_paid(self):
        self.create_payment()

        with patch("pages.paypal.PayPalClient.capture_order", return_value=self.capture_response()):
            response = self.client.post(
                "/api/payments/paypal/capture-order/",
                data={"orderId": "PAYPAL-ORDER-1001"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payment = PayPalPayment.objects.select_related("payment_request").get(paypal_order_id="PAYPAL-ORDER-1001")
        self.assertEqual(payment.status, PayPalPayment.STATUS_COMPLETED)
        self.assertEqual(payment.paypal_capture_id, "CAPTURE-1001")
        self.assertEqual(payment.amount, Decimal("49.00"))
        self.assertEqual(payment.currency, "EUR")
        self.assertEqual(payment.payer_email, "buyer@example.test")
        self.assertIsNotNone(payment.paid_at)
        self.assertEqual(payment.payment_request.status, PaymentRequest.STATUS_PAID)
        self.assertEqual(payment.payment_request.paid_at, payment.paid_at)

    def test_capture_is_idempotent_for_completed_payment(self):
        payment_request, payment = self.create_payment(status=PayPalPayment.STATUS_COMPLETED)
        payment.paypal_capture_id = "CAPTURE-1001"
        payment.paid_at = payment_request.created_at
        payment.save(update_fields=["paypal_capture_id", "paid_at"])

        with patch("pages.paypal.PayPalClient.capture_order") as capture_order:
            response = self.client.post(
                "/api/payments/paypal/capture-order/",
                data={"orderId": "PAYPAL-ORDER-1001"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        capture_order.assert_not_called()
        self.assertEqual(response.json()["payment"]["status"], PayPalPayment.STATUS_COMPLETED)

    def test_capture_rejects_failed_paypal_status(self):
        self.create_payment()

        with patch(
            "pages.paypal.PayPalClient.capture_order",
            return_value=self.capture_response(status="APPROVED", capture_status="DECLINED"),
        ):
            response = self.client.post(
                "/api/payments/paypal/capture-order/",
                data={"orderId": "PAYPAL-ORDER-1001"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 402)
        payment = PayPalPayment.objects.get(paypal_order_id="PAYPAL-ORDER-1001")
        self.assertEqual(payment.status, PayPalPayment.STATUS_FAILED)

    def test_cancel_order_marks_payment_cancelled_without_marking_invoice_paid(self):
        self.create_payment()

        response = self.client.post(
            "/api/payments/paypal/cancel-order/",
            data={"orderId": "PAYPAL-ORDER-1001"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payment = PayPalPayment.objects.select_related("payment_request").get(paypal_order_id="PAYPAL-ORDER-1001")
        self.assertEqual(payment.status, PayPalPayment.STATUS_CANCELLED)
        self.assertEqual(payment.payment_request.status, PaymentRequest.STATUS_OPEN)

    def test_create_order_ignores_frontend_amount(self):
        payment_request = PaymentRequest.objects.create(
            internal_reference="BD-INV-1002",
            title="Rechnung BD-INV-1002",
            amount=Decimal("75.00"),
            currency="EUR",
            status=PaymentRequest.STATUS_OPEN,
        )

        def fake_create_order(client, request_obj, *, return_url, cancel_url):
            self.assertEqual(request_obj.amount, Decimal("75.00"))
            return {
                "id": "PAYPAL-ORDER-1002",
                "status": "CREATED",
                "links": [
                    {
                        "rel": "approve",
                        "href": "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1002",
                    }
                ],
            }

        with patch("pages.paypal.PayPalClient.create_order", new=fake_create_order):
            response = self.client.post(
                "/api/payments/paypal/create-order/",
                data={"paymentRequestId": payment_request.pk, "amount": "1.00"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["approvalUrl"], "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1002")
        payment = PayPalPayment.objects.get(paypal_order_id="PAYPAL-ORDER-1002")
        self.assertEqual(payment.amount, Decimal("75.00"))
