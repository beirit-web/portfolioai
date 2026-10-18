import json
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.db.models import Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .forms import CheckoutForm, QuantityForm
from .models import CakeOrder, CakeProduct
from .services import DELIVERY_FEES, CartError, cart_context, cart_quantities, quantities_from_items, quote, save_order, set_cart
from .submissions import SubmissionLimit, reserve_submission


def money(value):
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _checkout_key(request):
    if not request.session.get("shop_checkout_token"):
        request.session["shop_checkout_token"] = str(uuid4())
    return request.session["shop_checkout_token"]


def _can_read(request, order):
    if order.owner_id:
        return request.user.is_authenticated and order.owner_id == request.user.pk
    return order.pk in request.session.get("shop_recent_orders", []) or (
        order.request_key is not None and str(order.request_key) == request.session.get("shop_checkout_token")
    )


def _remember(request, order):
    ids = request.session.get("shop_recent_orders", [])
    request.session["shop_recent_orders"] = list(dict.fromkeys([order.pk, *ids]))[:30]


def _duplicate(request, key):
    try:
        key = UUID(str(key))
    except (ValueError, TypeError, AttributeError):
        return None
    order = CakeOrder.objects.filter(request_key=key).first()
    return order if order and _can_read(request, order) else None


def _context(request, tab="catalog", **context):
    return {**cart_context(request), "tab": tab, "navigation_categories": CakeProduct.CATEGORY_CHOICES,
            "login_url": f"{settings.LOGIN_URL}?next={reverse('storefront:orders')}", **context}


def _back(request):
    target = request.POST.get("next", "")
    if target.startswith("/shop/") and url_has_allowed_host_and_scheme(target, {request.get_host()}, require_https=request.is_secure()):
        return redirect(target)
    return redirect("storefront:cart")


@never_cache
@require_GET
def catalog(request):
    products = CakeProduct.objects.all()
    query = request.GET.get("q", "").strip()[:80]
    category = request.GET.get("category", "all")
    sort = request.GET.get("sort", "priceAsc")
    if category in dict(CakeProduct.CATEGORY_CHOICES):
        products = products.filter(category=category)
    else:
        category = "all"
    if query:
        products = products.filter(Q(name__icontains=query) | Q(description__icontains=query) | Q(ingredients__icontains=query) | Q(allergens__icontains=query))
    sorts = {"featured": ("-is_available", "-is_featured", "sort_order", "id"), "priceAsc": ("price", "id"),
             "priceDesc": ("-price", "id"), "leadTime": ("lead_time_days", "id")}
    if sort not in sorts:
        sort = "priceAsc"
    products = products.order_by(*sorts[sort])
    return render(request, "shop/catalog.html", _context(request, products=products, query=query, category=category,
                  sort=sort, categories=CakeProduct.CATEGORY_CHOICES))


@never_cache
@require_GET
def product_detail(request, slug):
    product = get_object_or_404(CakeProduct, slug=slug)
    return render(request, "shop/product.html", _context(request, product=product))


@never_cache
@require_GET
def cart(request):
    return render(request, "shop/cart.html", _context(request, "cart"))


@never_cache
@require_POST
def cart_add(request, pk):
    product = get_object_or_404(CakeProduct, pk=pk)
    form = QuantityForm(request.POST)
    quantities = cart_quantities(request)
    if not product.is_available or product.price <= 0:
        messages.error(request, "Dieser Artikel ist momentan nicht bestellbar.")
    elif not form.is_valid():
        messages.error(request, "Bitte eine ganze Menge zwischen 1 und 20 wählen.")
    elif quantities.get(pk, 0) + form.cleaned_data["quantity"] > 20 or (pk not in quantities and len(quantities) >= 20):
        messages.error(request, "Maximal 20 Stück je Artikel und 20 verschiedene Artikel sind möglich.")
    else:
        quantities[pk] = quantities.get(pk, 0) + form.cleaned_data["quantity"]
        set_cart(request, quantities)
        messages.success(request, f"{product.name} liegt im Warenkorb.")
    return _back(request)


@never_cache
@require_POST
def cart_update(request, pk):
    quantities = cart_quantities(request)
    if pk not in quantities:
        raise Http404
    if request.POST.get("action") == "remove":
        del quantities[pk]
        set_cart(request, quantities)
        messages.success(request, "Artikel entfernt.")
    else:
        form = QuantityForm(request.POST)
        if form.is_valid():
            quantities[pk] = form.cleaned_data["quantity"]
            set_cart(request, quantities)
        else:
            messages.error(request, "Bitte eine ganze Menge zwischen 1 und 20 wählen.")
    return redirect("storefront:cart")


@never_cache
@require_http_methods(["GET", "POST"])
def checkout(request):
    response_status, retry_after = 200, None
    if request.method == "POST":
        duplicate = _duplicate(request, request.POST.get("request_key"))
        if duplicate:
            return redirect("storefront:confirmation", number=duplicate.order_number)
    quantities = cart_quantities(request)
    if not quantities:
        return redirect("storefront:cart")
    delivery = request.POST.get("delivery_method", CakeOrder.DELIVERY_PICKUP)
    pricing = quote(quantities, delivery)
    initial = {"request_key": _checkout_key(request), "requested_date": pricing["earliest_date"], "delivery_method": CakeOrder.DELIVERY_PICKUP}
    if request.user.is_authenticated:
        initial.update(customer_name=request.user.get_full_name(), customer_email=request.user.email or request.user.username)
    form = CheckoutForm(request.POST if request.method == "POST" else None, initial=initial, earliest_date=pricing["earliest_date"])
    if request.method == "POST" and form.is_valid():
        if str(form.cleaned_data["request_key"]) != _checkout_key(request):
            form.add_error(None, "Der Warenkorb wurde zwischenzeitlich geändert. Bitte neu laden und erneut prüfen.")
        else:
            try:
                reserve_submission(request)
                order, _ = save_order(form, quantities, request.user if request.user.is_authenticated else None)
            except SubmissionLimit as exc:
                form.add_error(None, str(exc))
                response_status, retry_after = 429, exc.retry_after
            except CartError as exc:
                form.add_error(None, str(exc))
            except IntegrityError:
                order = _duplicate(request, form.cleaned_data["request_key"])
                if not order:
                    raise
                return redirect("storefront:confirmation", number=order.order_number)
            else:
                _remember(request, order)
                set_cart(request, {})
                return redirect("storefront:confirmation", number=order.order_number)
    response = render(request, "shop/checkout.html", _context(request, "cart", **pricing, form=form, local_delivery_fee=DELIVERY_FEES[CakeOrder.DELIVERY_LOCAL]), status=response_status)
    if retry_after is not None:
        response["Retry-After"] = str(retry_after)
        response.status_page_handled = True
    return response


@never_cache
@require_GET
def confirmation(request, number):
    order = get_object_or_404(CakeOrder.objects.prefetch_related("items"), order_number=number)
    if not _can_read(request, order):
        raise Http404
    return render(request, "shop/confirmation.html", _context(request, "orders", order=order))


@never_cache
@login_required
@require_GET
def orders(request):
    page = Paginator(CakeOrder.objects.filter(owner=request.user), 20).get_page(request.GET.get("page"))
    return render(request, "shop/orders.html", _context(request, "orders", page_obj=page))


def serialize_product(product):
    return {"id": product.pk, "sku": product.sku, "slug": product.slug, "name": product.name, "category": product.category,
            "categoryLabel": product.get_category_display(), "description": product.description, "price": money(product.price),
            "imageUrl": product.image_url, "ingredients": product.ingredients, "allergens": product.allergens, "serves": product.serves,
            "leadTimeDays": product.lead_time_days, "stockStatus": product.stock_status, "isAvailable": product.is_available, "isFeatured": product.is_featured}


@never_cache
@ensure_csrf_cookie
@require_GET
def product_list(request):
    return JsonResponse({"products": [serialize_product(product) for product in CakeProduct.objects.filter(is_available=True)], "checkoutToken": _checkout_key(request)})


def _order_response(order, status=201):
    return JsonResponse({"orderNumber": order.order_number, "status": order.status, "subtotal": money(order.subtotal),
                         "deliveryFee": money(order.delivery_fee), "total": money(order.total)}, status=status)


@never_cache
@require_POST
def create_order(request):
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"errors": {"detail": ["Ungültige JSON-Daten."]}}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"errors": {"detail": ["JSON-Objekt erwartet."]}}, status=400)
    key = data.get("requestKey")
    duplicate = _duplicate(request, key)
    if duplicate:
        return _order_response(duplicate, 200)
    if not key or key != request.session.get("shop_checkout_token"):
        return JsonResponse({"errors": {"requestKey": ["Bitte zuerst den Produktkatalog abrufen und dessen checkoutToken senden."]}}, status=400)
    customer = data.get("customer") if isinstance(data.get("customer"), dict) else {}
    values = [customer.get(name) for name in ("name", "email", "phone")]
    values += [data.get(name) for name in ("deliveryMethod", "requestedDate", "deliveryAddress", "postalCode", "city", "note")]
    if any(value is not None and not isinstance(value, str) for value in values):
        return JsonResponse({"errors": {"detail": ["Kontakt-, Adress- und Datumsangaben müssen Text sein."]}}, status=400)
    try:
        quantities = quantities_from_items(data.get("items"))
    except CartError as exc:
        return JsonResponse({"errors": {"items": [str(exc)]}}, status=400)
    form = CheckoutForm({"request_key": key, "customer_name": customer.get("name", ""), "customer_email": customer.get("email", ""),
        "customer_phone": customer.get("phone", ""), "delivery_method": data.get("deliveryMethod", "pickup"),
        "requested_date": data.get("requestedDate", ""), "delivery_address": data.get("deliveryAddress", ""),
        "postal_code": data.get("postalCode", ""), "city": data.get("city", ""), "customer_note": data.get("note", "")},
        earliest_date=quote(quantities)["earliest_date"])
    if not form.is_valid():
        return JsonResponse({"errors": form.errors.get_json_data()}, status=400)
    try:
        reserve_submission(request)
        order, created = save_order(form, quantities, request.user if request.user.is_authenticated else None)
    except SubmissionLimit as exc:
        response = JsonResponse({"errors": {"detail": [str(exc)]}}, status=429)
        response["Retry-After"] = str(exc.retry_after)
        return response
    except CartError as exc:
        return JsonResponse({"errors": {"items": [str(exc)]}}, status=400)
    except IntegrityError:
        order = _duplicate(request, key)
        if not order:
            raise
        created = False
    _remember(request, order)
    request.session.pop("shop_checkout_token", None)
    return _order_response(order, 201 if created else 200)
