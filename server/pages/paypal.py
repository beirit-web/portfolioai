from __future__ import annotations

import base64
import json
import logging
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib import error, parse, request

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import PaymentRequest, PayPalPayment

logger = logging.getLogger(__name__)


class PayPalError(Exception):
    """Expected PayPal integration error."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def decimal_money(value: Any) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as exc:
        raise PayPalError("Ungültiger Zahlungsbetrag.", status_code=502) from exc


def paypal_base_url() -> str:
    mode = str(getattr(settings, "PAYPAL_MODE", "sandbox") or "sandbox").lower()
    if mode != "sandbox":
        raise PayPalError("Im Portfolio ist ausschließlich die PayPal-Sandbox erlaubt.", status_code=503)
    return "https://api-m.sandbox.paypal.com"


def configured_currency() -> str:
    return str(getattr(settings, "PAYPAL_CURRENCY", "EUR") or "EUR").upper()


def require_paypal_config() -> None:
    if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
        raise PayPalError("Portfolio-Demo: Zahlungen sind deaktiviert.", status_code=503)
    paypal_base_url()
    if not getattr(settings, "PAYPAL_CLIENT_ID", "") or not getattr(settings, "PAYPAL_CLIENT_SECRET", ""):
        raise PayPalError("PayPal Sandbox ist noch nicht konfiguriert.", status_code=503)
    if configured_currency() != "EUR":
        raise PayPalError("Aktuell ist nur EUR als PayPal-Währung erlaubt.", status_code=503)


class PayPalClient:
    def __init__(self):
        require_paypal_config()
        self.base_url = paypal_base_url()

    def _request(self, method: str, path: str, *, payload: dict | None = None, headers: dict | None = None) -> dict:
        require_paypal_config()
        body = None
        request_headers = {
            "Accept": "application/json",
        }
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        request_headers.update(headers or {})
        req = request.Request(f"{self.base_url}{path}", data=body, headers=request_headers, method=method)
        try:
            with request.urlopen(req, timeout=20) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            logger.warning("PayPal API rejected request", extra={"status": exc.code, "path": path, "response": raw[:1000]})
            raise PayPalError("PayPal hat die Anfrage abgelehnt.", status_code=502) from exc
        except error.URLError as exc:
            logger.exception("PayPal API request failed", extra={"path": path})
            raise PayPalError("PayPal ist aktuell nicht erreichbar.", status_code=502) from exc

    def access_token(self) -> str:
        require_paypal_config()
        credentials = f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode("utf-8")
        headers = {
            "Authorization": f"Basic {base64.b64encode(credentials).decode('ascii')}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
        req = request.Request(f"{self.base_url}/v1/oauth2/token", data=data, headers=headers, method="POST")
        try:
            with request.urlopen(req, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            logger.warning("PayPal OAuth failed", extra={"status": exc.code, "response": raw[:1000]})
            raise PayPalError("PayPal-Zugangsdaten wurden nicht akzeptiert.", status_code=503) from exc
        except error.URLError as exc:
            logger.exception("PayPal OAuth request failed")
            raise PayPalError("PayPal ist aktuell nicht erreichbar.", status_code=502) from exc
        token = payload.get("access_token")
        if not token:
            raise PayPalError("PayPal hat kein Zugriffstoken geliefert.", status_code=502)
        return token

    def bearer_headers(self, *, request_id: str = "") -> dict:
        headers = {
            "Authorization": f"Bearer {self.access_token()}",
            "Prefer": "return=representation",
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id[:108]
        return headers

    def create_order(self, payment_request: PaymentRequest, *, return_url: str, cancel_url: str) -> dict:
        amount = payment_request.amount.quantize(Decimal("0.01"))
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": payment_request.internal_reference,
                    "invoice_id": payment_request.internal_reference,
                    "description": payment_request.title[:127],
                    "amount": {
                        "currency_code": payment_request.currency,
                        "value": f"{amount:.2f}",
                    },
                }
            ],
            "application_context": {
                "brand_name": "Beirit Digital",
                "shipping_preference": "NO_SHIPPING",
                "user_action": "PAY_NOW",
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        }
        return self._request(
            "POST",
            "/v2/checkout/orders",
            payload=payload,
            headers=self.bearer_headers(request_id=f"create-{payment_request.internal_reference}"),
        )

    def capture_order(self, order_id: str) -> dict:
        return self._request(
            "POST",
            f"/v2/checkout/orders/{order_id}/capture",
            payload={},
            headers=self.bearer_headers(request_id=f"capture-{order_id}"),
        )

    def show_order(self, order_id: str) -> dict:
        return self._request("GET", f"/v2/checkout/orders/{order_id}", headers=self.bearer_headers())


def serialize_payment_request(payment_request: PaymentRequest) -> dict:
    return {
        "id": payment_request.pk,
        "internalReference": payment_request.internal_reference,
        "title": payment_request.title,
        "description": payment_request.description,
        "amount": f"{payment_request.amount.quantize(Decimal('0.01')):.2f}",
        "currency": payment_request.currency,
        "status": payment_request.status,
        "isPayable": payment_request.is_payable,
    }


def serialize_payment(payment: PayPalPayment) -> dict:
    return {
        "internalReference": payment.internal_reference,
        "paypalOrderId": payment.paypal_order_id,
        "paypalCaptureId": payment.paypal_capture_id,
        "approvalUrl": payment.raw_response.get("approval_url", "") if isinstance(payment.raw_response, dict) else "",
        "amount": f"{payment.amount.quantize(Decimal('0.01')):.2f}",
        "currency": payment.currency,
        "status": payment.status,
        "payerEmail": payment.payer_email,
        "paidAt": payment.paid_at.isoformat() if payment.paid_at else "",
    }


def sanitize_paypal_response(response: dict) -> dict:
    sanitized_units = []
    approval_url = ""
    for link in response.get("links") or []:
        if link.get("rel") == "approve":
            approval_url = link.get("href", "")
            break
    for unit in response.get("purchase_units") or []:
        captures = []
        for capture in ((unit.get("payments") or {}).get("captures") or []):
            captures.append(
                {
                    "id": capture.get("id", ""),
                    "status": capture.get("status", ""),
                    "amount": capture.get("amount", {}),
                    "update_time": capture.get("update_time", ""),
                }
            )
        sanitized_units.append(
            {
                "reference_id": unit.get("reference_id", ""),
                "invoice_id": unit.get("invoice_id", ""),
                "amount": unit.get("amount", {}),
                "captures": captures,
            }
        )
    return {
        "id": response.get("id", ""),
        "status": response.get("status", ""),
        "approval_url": approval_url,
        "payer": {"email_address": (response.get("payer") or {}).get("email_address", "")},
        "purchase_units": sanitized_units,
    }


def get_open_payment_requests() -> list[PaymentRequest]:
    return list(PaymentRequest.objects.filter(status=PaymentRequest.STATUS_OPEN, currency="EUR").order_by("-created_at", "-id")[:25])


def create_paypal_order(*, payment_request_id: int, return_url: str, cancel_url: str) -> PayPalPayment:
    require_paypal_config()
    with transaction.atomic():
        payment_request = PaymentRequest.objects.select_for_update().get(pk=payment_request_id)
        if not payment_request.is_payable:
            raise PayPalError("Diese Zahlungsanforderung ist nicht zahlbar.", status_code=409)
        existing = payment_request.paypal_payments.select_for_update().filter(
            status__in=[PayPalPayment.STATUS_CREATED, PayPalPayment.STATUS_APPROVED]
        ).order_by("-created_at").first()
        if existing:
            return existing

    client = PayPalClient()
    response = client.create_order(payment_request, return_url=return_url, cancel_url=cancel_url)
    order_id = str(response.get("id") or "").strip()
    if not order_id:
        logger.error("PayPal create-order response without id", extra={"response": response})
        raise PayPalError("PayPal hat keine Bestellnummer geliefert.", status_code=502)

    with transaction.atomic():
        payment_request = PaymentRequest.objects.select_for_update().get(pk=payment_request_id)
        if not payment_request.is_payable:
            raise PayPalError("Diese Zahlungsanforderung ist nicht mehr zahlbar.", status_code=409)
        payment, _ = PayPalPayment.objects.update_or_create(
            paypal_order_id=order_id,
            defaults={
                "payment_request": payment_request,
                "internal_reference": payment_request.internal_reference,
                "amount": payment_request.amount,
                "currency": payment_request.currency,
                "status": PayPalPayment.STATUS_CREATED,
                "raw_response": sanitize_paypal_response(response),
            },
        )
    return payment


def _extract_capture(response: dict) -> dict:
    for unit in response.get("purchase_units") or []:
        captures = ((unit.get("payments") or {}).get("captures") or [])
        if captures:
            capture = captures[0]
            capture["_reference_id"] = unit.get("reference_id", "")
            return capture
    return {}


def _extract_amount(response: dict, capture: dict) -> tuple[Decimal, str]:
    amount_payload = capture.get("amount") or {}
    if not amount_payload:
        for unit in response.get("purchase_units") or []:
            amount_payload = unit.get("amount") or {}
            if amount_payload:
                break
    return decimal_money(amount_payload.get("value")), str(amount_payload.get("currency_code", "")).upper()


def capture_paypal_order(*, order_id: str) -> PayPalPayment:
    require_paypal_config()
    with transaction.atomic():
        payment = PayPalPayment.objects.select_for_update().select_related("payment_request").get(paypal_order_id=order_id)
        if payment.status == PayPalPayment.STATUS_COMPLETED and payment.paypal_capture_id:
            return payment
        if payment.payment_request.status == PaymentRequest.STATUS_PAID:
            raise PayPalError("Diese Zahlungsanforderung wurde bereits bezahlt.", status_code=409)

    response = PayPalClient().capture_order(order_id)
    capture = _extract_capture(response)
    paypal_status = str(response.get("status") or "").upper()
    capture_status = str(capture.get("status") or "").upper()
    captured_amount, captured_currency = _extract_amount(response, capture)
    captured_reference = str(capture.get("_reference_id") or "")

    failure: PayPalError | None = None
    with transaction.atomic():
        payment = PayPalPayment.objects.select_for_update().select_related("payment_request").get(paypal_order_id=order_id)
        expected_amount = payment.amount.quantize(Decimal("0.01"))
        expected_currency = payment.currency.upper()
        expected_reference = payment.internal_reference

        if captured_amount != expected_amount or captured_currency != expected_currency:
            logger.error(
                "PayPal capture amount mismatch",
                extra={
                    "order_id": order_id,
                    "expected_amount": str(expected_amount),
                    "captured_amount": str(captured_amount),
                    "expected_currency": expected_currency,
                    "captured_currency": captured_currency,
                },
            )
            failure = PayPalError("PayPal-Betrag oder Währung stimmt nicht mit der Rechnung überein.", status_code=409)

        elif captured_reference and captured_reference != expected_reference:
            logger.error(
                "PayPal capture reference mismatch",
                extra={"order_id": order_id, "expected_reference": expected_reference, "captured_reference": captured_reference},
            )
            failure = PayPalError("PayPal-Referenz stimmt nicht mit der internen Auftragsnummer überein.", status_code=409)

        elif paypal_status != "COMPLETED" or capture_status != "COMPLETED":
            logger.warning("PayPal capture not completed", extra={"order_id": order_id, "status": paypal_status, "capture_status": capture_status})
            failure = PayPalError("PayPal-Zahlung wurde nicht erfolgreich abgeschlossen.", status_code=402)

        if failure:
            payment.status = PayPalPayment.STATUS_FAILED
            payment.raw_response = sanitize_paypal_response(response)
            payment.save(update_fields=["status", "raw_response", "updated_at"])
            return_payment = payment
        else:
            paid_at = timezone.now()
            payment.status = PayPalPayment.STATUS_COMPLETED
            payment.paypal_capture_id = str(capture.get("id") or "")
            payment.payer_email = str(((response.get("payer") or {}).get("email_address") or "")).strip()
            payment.raw_response = sanitize_paypal_response(response)
            payment.paid_at = paid_at
            payment.save(update_fields=["status", "paypal_capture_id", "payer_email", "raw_response", "paid_at", "updated_at"])
            payment.payment_request.mark_paid(paid_at=paid_at)
            return_payment = payment

    if failure:
        raise failure
    return return_payment


def cancel_paypal_order(*, order_id: str) -> PayPalPayment:
    require_paypal_config()
    with transaction.atomic():
        payment = PayPalPayment.objects.select_for_update().get(paypal_order_id=order_id)
        if payment.status == PayPalPayment.STATUS_COMPLETED and payment.paypal_capture_id:
            raise PayPalError("Eine bereits bezahlte PayPal-Bestellung kann nicht abgebrochen werden.", status_code=409)
        if payment.status != PayPalPayment.STATUS_CANCELLED:
            payment.status = PayPalPayment.STATUS_CANCELLED
            payment.save(update_fields=["status", "updated_at"])
        return payment
