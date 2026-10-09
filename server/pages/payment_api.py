import logging

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PayPalPayment
from .paypal import (
    PayPalError,
    require_paypal_config,
    cancel_paypal_order,
    capture_paypal_order,
    create_paypal_order,
    get_open_payment_requests,
    serialize_payment,
    serialize_payment_request,
)

logger = logging.getLogger(__name__)


class InvoiceCheckoutEnabledMixin:
    def dispatch(self, request, *args, **kwargs):
        if getattr(settings, "PORTFOLIO_DEMO_MODE", True):
            return JsonResponse(
                {"ok": False, "demo": True, "error": "Portfolio-Demo: Zahlungen sind deaktiviert."},
                status=404,
            )
        if not getattr(settings, "PAYPAL_INVOICE_CHECKOUT_ENABLED", False):
            return JsonResponse(
                {"ok": False, "error": "PayPal ist ausschließlich für freiwillige Spenden verfügbar."},
                status=404,
            )
        try:
            require_paypal_config()
        except PayPalError as exc:
            return JsonResponse({"ok": False, "error": str(exc)}, status=exc.status_code)
        return super().dispatch(request, *args, **kwargs)


def _absolute_url(request, path: str) -> str:
    return request.build_absolute_uri(path)


def _error_response(exc: PayPalError) -> Response:
    return Response({"ok": False, "error": str(exc)}, status=exc.status_code)


class PayPalConfigView(InvoiceCheckoutEnabledMixin, APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "ok": True,
                "paypal": {
                    "clientId": settings.PAYPAL_CLIENT_ID,
                    "mode": settings.PAYPAL_MODE,
                    "currency": settings.PAYPAL_CURRENCY,
                    "configured": bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET),
                },
                "paymentRequests": [serialize_payment_request(item) for item in get_open_payment_requests()],
            }
        )


class PayPalCreateOrderView(InvoiceCheckoutEnabledMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payment_request_id = request.data.get("paymentRequestId")
        if not payment_request_id:
            return Response({"ok": False, "error": "Keine Zahlungsanforderung ausgewählt."}, status=400)
        try:
            payment = create_paypal_order(
                payment_request_id=int(payment_request_id),
                return_url=_absolute_url(request, "/zahlung/erfolg"),
                cancel_url=_absolute_url(request, "/zahlung/abbruch"),
            )
        except (TypeError, ValueError):
            return Response({"ok": False, "error": "Ungültige Zahlungsanforderung."}, status=400)
        except PayPalError as exc:
            logger.info("PayPal order creation failed", extra={"error": str(exc)})
            return _error_response(exc)
        serialized_payment = serialize_payment(payment)
        return Response({
            "ok": True,
            "orderId": payment.paypal_order_id,
            "approvalUrl": serialized_payment.get("approvalUrl", ""),
            "payment": serialized_payment,
        })


class PayPalCaptureOrderView(InvoiceCheckoutEnabledMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = str(request.data.get("orderId") or request.data.get("paypalOrderId") or "").strip()
        if not order_id:
            return Response({"ok": False, "error": "Keine PayPal-Bestellnummer übermittelt."}, status=400)
        try:
            payment = capture_paypal_order(order_id=order_id)
        except PayPalPayment.DoesNotExist:
            return Response({"ok": False, "error": "PayPal-Bestellung ist intern nicht bekannt."}, status=404)
        except PayPalError as exc:
            logger.info("PayPal order capture failed", extra={"order_id": order_id, "error": str(exc)})
            return _error_response(exc)
        return Response({"ok": True, "payment": serialize_payment(payment)})


class PayPalCancelOrderView(InvoiceCheckoutEnabledMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = str(request.data.get("orderId") or request.data.get("paypalOrderId") or "").strip()
        if not order_id:
            return Response({"ok": False, "error": "Keine PayPal-Bestellnummer übermittelt."}, status=400)
        try:
            payment = cancel_paypal_order(order_id=order_id)
        except PayPalPayment.DoesNotExist:
            return Response({"ok": False, "error": "PayPal-Bestellung ist intern nicht bekannt."}, status=404)
        except PayPalError as exc:
            logger.info("PayPal order cancellation failed", extra={"order_id": order_id, "error": str(exc)})
            return _error_response(exc)
        return Response({"ok": True, "payment": serialize_payment(payment)})


class PayPalStatusView(InvoiceCheckoutEnabledMixin, APIView):
    permission_classes = [AllowAny]

    def get(self, request, order_id):
        payment = get_object_or_404(PayPalPayment.objects.select_related("payment_request"), paypal_order_id=order_id)
        return Response(
            {
                "ok": True,
                "payment": serialize_payment(payment),
                "paymentRequest": serialize_payment_request(payment.payment_request),
            }
        )
