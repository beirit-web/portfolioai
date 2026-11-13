from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import CakeOrder, CakeOrderItem, CakeProduct

DELIVERY_FEES = {CakeOrder.DELIVERY_PICKUP: Decimal("0.00"), CakeOrder.DELIVERY_LOCAL: Decimal("8.90")}
CART_KEY = "shop_cart"


class CartError(ValueError):
    pass


def quantities_from_items(items):
    if not isinstance(items, list) or not 1 <= len(items) <= 20:
        raise CartError("Bitte 1 bis 20 verschiedene Artikel auswählen.")
    quantities = {}
    for item in items:
        if not isinstance(item, dict):
            raise CartError("Ungültige Bestellposition.")
        values = [item.get("productId"), item.get("quantity")]
        if any(isinstance(value, bool) or not isinstance(value, (int, str)) or not str(value).isascii() or not str(value).isdigit() or len(str(value)) > 15 for value in values):
            raise CartError("Artikel und Menge müssen gültige ganze Zahlen sein.")
        product_id, quantity = map(int, values)
        quantity += quantities.get(product_id, 0)
        if product_id < 1 or not 1 <= quantity <= 20:
            raise CartError("Bitte 1 bis 20 Stück je Artikel auswählen.")
        quantities[product_id] = quantity
    return quantities


def cart_quantities(request):
    raw = request.session.get(CART_KEY, {})
    if not isinstance(raw, dict) or not raw:
        return {}
    try:
        return quantities_from_items([{"productId": key, "quantity": value} for key, value in raw.items()])
    except CartError:
        return {}


def quote(quantities, delivery_method=CakeOrder.DELIVERY_PICKUP, lock=False):
    products = CakeProduct.objects.filter(pk__in=quantities)
    if lock:
        products = products.select_for_update()
    products = {product.pk: product for product in products}
    rows, errors = [], []
    for product_id, quantity in quantities.items():
        product = products.get(product_id)
        if product is None:
            errors.append("Ein Artikel wurde entfernt. Bitte den Warenkorb aktualisieren.")
            rows.append({"product_id": product_id, "quantity": quantity, "missing": True})
            continue
        if not product.is_available or product.price <= 0:
            errors.append(f"{product.name} ist momentan nicht bestellbar.")
        rows.append({"product": product, "product_id": product_id, "quantity": quantity, "line_total": product.price * quantity})
    subtotal = sum((row.get("line_total", Decimal("0.00")) for row in rows), Decimal("0.00"))
    delivery_fee = DELIVERY_FEES.get(delivery_method, Decimal("0.00")) if rows else Decimal("0.00")
    if subtotal + delivery_fee > Decimal("9999999.99"):
        errors.append("Der Warenkorb überschreitet den zulässigen Gesamtbetrag.")
    return {"rows": rows, "cart_count": sum(quantities.values()), "subtotal": subtotal, "delivery_fee": delivery_fee,
            "total": subtotal + delivery_fee, "cart_errors": errors,
            "earliest_date": timezone.localdate() + timedelta(days=max((row["product"].lead_time_days for row in rows if row.get("product")), default=0))}


def cart_context(request, delivery_method=CakeOrder.DELIVERY_PICKUP):
    return quote(cart_quantities(request), delivery_method)


def set_cart(request, quantities):
    request.session[CART_KEY] = {str(key): value for key, value in quantities.items()}
    request.session.pop("shop_checkout_token", None)


@transaction.atomic
def save_order(form, quantities, owner=None):
    key = form.cleaned_data["request_key"]
    existing = CakeOrder.objects.filter(request_key=key).first()
    if existing:
        return existing, False
    pricing = quote(quantities, form.cleaned_data["delivery_method"], lock=True)
    if not quantities or pricing["cart_errors"]:
        raise CartError(" ".join(pricing["cart_errors"]) or "Der Warenkorb ist leer.")
    if form.cleaned_data["requested_date"] < pricing["earliest_date"]:
        raise CartError("Die Vorlaufzeit hat sich geändert. Bitte den Wunschtermin erneut prüfen.")
    order = form.save(commit=False)
    order.owner = owner
    order.request_key = key
    order.subtotal, order.delivery_fee, order.total = pricing["subtotal"], pricing["delivery_fee"], pricing["total"]
    order.save()
    CakeOrderItem.objects.bulk_create([CakeOrderItem(order=order, product=row["product"], product_name=row["product"].name,
        unit_price=row["product"].price, quantity=row["quantity"], line_total=row["line_total"]) for row in pricing["rows"]])
    return order, True
