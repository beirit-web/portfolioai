import json
from importlib import import_module
from types import SimpleNamespace
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.staticfiles import finders
from django.apps import apps
from django.db import connection
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .forms import CheckoutForm
from .models import CakeOrder, CakeOrderItem, CakeProduct
from .services import CART_KEY, save_order


@override_settings(LOGIN_REQUIRED=False)
class ShopStorefrontTests(TestCase):
    def setUp(self):
        self.product = CakeProduct.objects.get(sku="BK-ERD-001")
        self.today = timezone.localdate()
        self.user = get_user_model().objects.create_user(username="shop@example.test", email="shop@example.test", password="test-only")
        self.other = get_user_model().objects.create_user(username="other-shop@example.test")
        self.data = {"customer_name": "Test Kunde", "customer_email": "kunde@example.test",
                     "customer_phone": "01234", "delivery_method": "pickup",
                     "requested_date": (self.today + timedelta(days=3)).isoformat(), "customer_note": "Ohne Schriftzug"}

    def add(self, quantity=2):
        return self.client.post(reverse("storefront:add", args=[self.product.pk]), {"quantity": quantity})

    def checkout_data(self):
        self.add()
        response = self.client.get(reverse("storefront:checkout"))
        return {**self.data, "request_key": response.context["form"].initial["request_key"]}

    @override_settings(LOGIN_REQUIRED=True)
    def test_catalog_and_api_remain_public_under_global_login_setting(self):
        response = self.client.get(reverse("storefront:catalog"))
        self.assertContains(response, "Beirit")
        self.assertEqual(len(response.context["products"]), 22)
        self.assertEqual(self.client.get(reverse("shop:product_list")).status_code, 200)

    def test_product_detail_has_ingredients_and_real_image(self):
        response = self.client.get(reverse("storefront:product", args=[self.product.slug]))
        self.assertContains(response, self.product.ingredients)
        self.assertContains(response, self.product.image_url)
        self.assertContains(response, "39,90 €")

    def test_expanded_catalog_has_fourteen_complete_distinct_products(self):
        seed = import_module("shop.migrations.0003_expand_cake_catalog")
        products = CakeProduct.objects.filter(sku__in=[item["sku"] for item in seed.PRODUCTS])
        self.assertEqual(products.count(), 14)
        self.assertEqual(products.values("image_url").distinct().count(), 14)
        self.assertEqual(products.filter(category="kuchen").count(), 7)
        self.assertEqual(products.filter(category="torte").count(), 7)
        for product in products:
            with self.subTest(sku=product.sku):
                product.full_clean()
                self.assertTrue(product.is_available)
                self.assertTrue(product.ingredients and product.allergens and product.serves)
                self.assertIsNotNone(finders.find(product.image_url.removeprefix("/static/")))
                self.assertContains(self.client.get(reverse("storefront:product", args=[product.slug])), product.name)

    def test_expansion_seed_preserves_existing_products_and_is_idempotent(self):
        seed = import_module("shop.migrations.0003_expand_cake_catalog")
        product = CakeProduct.objects.get(sku="BK-APS-009")
        product.price = Decimal("33.50")
        product.is_available = False
        product.save()
        schema_editor = SimpleNamespace(connection=connection)
        for _ in range(2):
            seed.add_cake_products(apps, schema_editor)
        product.refresh_from_db()
        self.assertEqual(CakeProduct.objects.count(), 22)
        self.assertEqual(product.price, Decimal("33.50"))
        self.assertFalse(product.is_available)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("39.90"))

    def test_whole_cake_category_search_and_cart(self):
        response = self.client.get(reverse("storefront:catalog"), {"category": "kuchen", "sort": "priceAsc"})
        products = list(response.context["products"])
        self.assertEqual(len(products), 7)
        self.assertEqual([p.price for p in products], sorted(p.price for p in products))
        result = self.client.get(reverse("storefront:catalog"), {"q": "Mokka"})
        product = result.context["products"].get()
        self.client.post(reverse("storefront:add", args=[product.pk]), {"quantity": 1})
        cart = self.client.get(reverse("storefront:cart"))
        self.assertEqual(cart.context["subtotal"], product.price)

    def test_new_torte_enforces_longer_preparation_time(self):
        product = CakeProduct.objects.get(sku="BK-PHI-019")
        self.add()
        self.client.post(reverse("storefront:add", args=[product.pk]), {"quantity": 1})
        url = reverse("storefront:checkout")
        response = self.client.get(url)
        initial = response.context["form"].initial
        self.assertEqual(initial["requested_date"], self.today + timedelta(days=3))
        data = {**self.data, "request_key": initial["request_key"],
                "requested_date": (self.today + timedelta(days=2)).isoformat()}
        self.assertContains(self.client.post(url, data), 'aria-invalid="true"')
        self.assertEqual(CakeOrder.objects.count(), 0)
        data["requested_date"] = (self.today + timedelta(days=3)).isoformat()
        self.assertEqual(self.client.post(url, data).status_code, 302)
        self.assertEqual(CakeOrder.objects.get().total, Decimal("124.70"))

    def test_filter_search_sort_and_no_results(self):
        url = reverse("storefront:catalog")
        for parameters in ({}, {"sort": "invalid"}):
            with self.subTest(parameters=parameters):
                response = self.client.get(url, parameters)
                prices = [product.price for product in response.context["products"]]
                self.assertEqual(response.context["sort"], "priceAsc")
                self.assertEqual(prices, sorted(prices))
        descending = self.client.get(url, {"category": "stueck", "sort": "priceDesc"})
        prices = [product.price for product in descending.context["products"]]
        self.assertEqual(len(prices), 2)
        self.assertEqual(prices, sorted(prices, reverse=True))
        response = self.client.get(url, {"category": "stueck", "sort": "priceAsc"})
        products = list(response.context["products"])
        self.assertEqual(len(products), 2)
        self.assertLess(products[0].price, products[1].price)
        self.assertEqual(len(self.client.get(url, {"q": "Erdbeer"}).context["products"]), 1)
        self.assertContains(self.client.get(url, {"q": "NoSuchCake"}), "Keine Artikel gefunden")

    def test_cart_persists_and_accumulates(self):
        self.add(2)
        self.add(1)
        response = self.client.get(reverse("storefront:cart"))
        self.assertEqual(response.context["cart_count"], 3)
        self.assertEqual(response.context["subtotal"], Decimal("119.70"))
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 3)

    def test_cart_quantity_bounds_and_unavailable_product(self):
        for quantity in (0, 21, "bad", "1.5"):
            self.add(quantity)
        self.assertEqual(self.client.session.get(CART_KEY, {}), {})
        self.add(20)
        self.add(1)
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 20)
        self.product.is_available = False
        self.product.save()
        self.add(1)
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 20)

    def test_update_remove_and_safe_return_url(self):
        response = self.client.post(reverse("storefront:add", args=[self.product.pk]),
                                    {"quantity": 1, "next": "https://example.org/steal"})
        self.assertEqual(response.url, reverse("storefront:cart"))
        url = reverse("storefront:update", args=[self.product.pk])
        self.client.post(url, {"quantity": 7})
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 7)
        self.client.post(url, {"quantity": 0})
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 7)
        self.client.post(url, {"action": "remove", "quantity": "bad"})
        self.assertEqual(self.client.session[CART_KEY], {})

    def test_empty_checkout_redirects_to_cart(self):
        self.assertRedirects(self.client.get(reverse("storefront:checkout")), reverse("storefront:cart"))

    def test_checkout_has_two_delivery_choices_without_blank_option(self):
        self.add()
        response = self.client.get(reverse("storefront:checkout"))
        self.assertEqual(list(response.context["form"].fields["delivery_method"].choices), list(CakeOrder.DELIVERY_CHOICES))

    def test_inflight_guest_retry_is_authorized_by_its_session_token(self):
        data = self.checkout_data()
        before = dict(self.client.session)
        first = self.client.post(reverse("storefront:checkout"), data)
        session = self.client.session
        session.clear()
        session.update(before)
        session.save()
        second = self.client.post(reverse("storefront:checkout"), data)
        self.assertEqual(first.url, second.url)
        self.assertEqual(CakeOrder.objects.count(), 1)

    def test_guest_request_is_saved_with_price_snapshots_and_cart_cleared(self):
        data = self.checkout_data()
        response = self.client.post(reverse("storefront:checkout"), {**data, "total": "0.01", "owner": self.other.pk})
        self.assertEqual(response.status_code, 302)
        order = CakeOrder.objects.get()
        self.assertEqual(order.total, Decimal("79.80"))
        self.assertIsNone(order.owner)
        item = order.items.get()
        self.assertEqual(item.unit_price, Decimal("39.90"))
        self.assertEqual(item.quantity, 2)
        self.assertEqual(self.client.session[CART_KEY], {})
        self.assertContains(self.client.get(response.url), "Anfrage gespeichert")
        self.product.price = Decimal("80")
        self.product.save()
        self.assertContains(self.client.get(response.url), "79,80 €")

    def test_duplicate_request_does_not_create_second_order(self):
        data = self.checkout_data()
        first = self.client.post(reverse("storefront:checkout"), data)
        second = self.client.post(reverse("storefront:checkout"), data)
        self.assertEqual(first.url, second.url)
        self.assertEqual(CakeOrder.objects.count(), 1)
        self.assertEqual(CakeOrderItem.objects.count(), 1)

    def test_changed_cart_invalidates_previous_checkout(self):
        data = self.checkout_data()
        self.add(1)
        response = self.client.post(reverse("storefront:checkout"), data)
        self.assertContains(response, "zwischenzeitlich geändert")
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_customer_and_date_validation_preserves_cart(self):
        data = self.checkout_data()
        cases = ({"customer_email": "bad"}, {"customer_name": ""}, {"requested_date": ""},
                 {"requested_date": self.today.isoformat()}, {"requested_date": "bad"},
                 {"requested_date": (self.today + timedelta(days=366)).isoformat()},
                 {"customer_note": "x" * 3001}, {"delivery_method": "invalid"})
        for values in cases:
            with self.subTest(values=list(values)):
                response = self.client.post(reverse("storefront:checkout"), {**data, **values})
                self.assertContains(response, 'aria-invalid="true"')
        self.assertEqual(CakeOrder.objects.count(), 0)
        self.assertEqual(self.client.session[CART_KEY][str(self.product.pk)], 2)

    def test_delivery_requires_address_and_charges_fee(self):
        data = self.checkout_data()
        response = self.client.post(reverse("storefront:checkout"), {**data, "delivery_method": "local_delivery"})
        self.assertContains(response, "Für die Lieferung")
        self.client.post(reverse("storefront:checkout"), {**data, "delivery_method": "local_delivery",
                         "delivery_address": "Teststraße 12", "postal_code": "10115", "city": "Berlin"})
        order = CakeOrder.objects.get()
        self.assertEqual(order.total, Decimal("88.70"))
        self.assertEqual(order.delivery_fee, Decimal("8.90"))
        self.assertEqual(order.delivery_address, "Teststraße 12")

    def test_products_becoming_unavailable_or_deleted_are_not_silently_dropped(self):
        data = self.checkout_data()
        self.product.is_available = False
        self.product.save()
        response = self.client.post(reverse("storefront:checkout"), data)
        self.assertContains(response, "nicht bestellbar")
        self.assertEqual(CakeOrder.objects.count(), 0)
        self.product.delete()
        response = self.client.get(reverse("storefront:cart"))
        self.assertContains(response, "Entfernter Artikel")
        self.assertNotContains(response, "Zur Bestellanfrage")

    def test_current_database_price_is_used(self):
        data = self.checkout_data()
        self.product.price = Decimal("42.00")
        self.product.save()
        self.client.post(reverse("storefront:checkout"), data)
        self.assertEqual(CakeOrder.objects.get().total, Decimal("84.00"))

    def test_confirmation_is_not_public_even_with_order_number(self):
        response = self.client.post(reverse("storefront:checkout"), self.checkout_data())
        stranger = Client()
        self.assertEqual(stranger.get(response.url).status_code, 404)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(reverse("storefront:orders")).context["page_obj"].paginator.count, 0)

    def test_account_requests_and_foreign_confirmation_are_private(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("storefront:checkout"), self.checkout_data())
        self.assertEqual(CakeOrder.objects.get().owner, self.user)
        self.assertContains(self.client.get(reverse("storefront:orders")), CakeOrder.objects.get().order_number)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(response.url).status_code, 404)
        self.assertEqual(self.client.get(reverse("storefront:orders")).context["page_obj"].paginator.count, 0)

    def test_anonymous_history_requires_login(self):
        response = self.client.get(reverse("storefront:orders"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("next=", response.url)

    def test_post_only_cart_mutations(self):
        for route in ("add", "update"):
            self.assertEqual(self.client.get(reverse(f"storefront:{route}", args=[self.product.pk])).status_code, 405)

    def test_csrf_required_for_cart_checkout_and_api(self):
        client = Client(enforce_csrf_checks=True)
        for url in (reverse("storefront:add", args=[self.product.pk]), reverse("storefront:checkout"), reverse("shop:create_order")):
            self.assertEqual(client.post(url).status_code, 403)
        client.get(reverse("storefront:catalog"))
        token = client.cookies["csrftoken"].value
        response = client.post(reverse("storefront:add", args=[self.product.pk]), {"quantity": 1, "csrfmiddlewaretoken": token})
        self.assertEqual(response.status_code, 302)

    def test_order_and_items_roll_back_together(self):
        quantities = {self.product.pk: 1}
        form = CheckoutForm({**self.data, "request_key": str(uuid4())}, earliest_date=self.today + timedelta(days=2))
        self.assertTrue(form.is_valid(), form.errors)
        with patch("shop.services.CakeOrderItem.objects.bulk_create", side_effect=RuntimeError("database failure")):
            with self.assertRaises(RuntimeError):
                save_order(form, quantities)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_same_day_numbers_are_unique_after_delete(self):
        self.client.post(reverse("storefront:checkout"), self.checkout_data())
        first = CakeOrder.objects.get().order_number
        CakeOrder.objects.all().delete()
        self.client.post(reverse("storefront:checkout"), self.checkout_data())
        self.assertNotEqual(CakeOrder.objects.get().order_number, first)

    def test_customer_note_is_escaped(self):
        response = self.client.post(reverse("storefront:checkout"), {**self.checkout_data(), "customer_note": "<script>alert(1)</script>"})
        receipt = self.client.get(response.url)
        self.assertContains(receipt, "&lt;script&gt;")
        self.assertNotContains(receipt, "<script>alert(1)</script>")


@override_settings(LOGIN_REQUIRED=False)
class ShopApiTests(TestCase):
    def setUp(self):
        self.product = CakeProduct.objects.get(sku="BK-ERD-001")

    def payload(self):
        token = self.client.get(reverse("shop:product_list")).json()["checkoutToken"]
        return {"requestKey": token, "customer": {"name": "Test Kunde", "email": "kunde@example.test", "phone": "01234"},
                "deliveryMethod": "local_delivery", "deliveryAddress": "Teststraße 12", "postalCode": "10115", "city": "Berlin",
                "items": [{"productId": self.product.pk, "quantity": 2}],
                "requestedDate": (timezone.localdate() + timedelta(days=3)).isoformat(), "note": "Bitte ohne Schriftzug."}

    def post(self, payload):
        return self.client.post(reverse("shop:create_order"), data=json.dumps(payload), content_type="application/json")

    def test_product_list_returns_seeded_cakes_and_csrf_token(self):
        response = self.client.get(reverse("shop:product_list"))
        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(payload["products"]), 22)
        self.assertEqual(payload["products"][0]["name"], "Erdbeer-Sahne-Torte")
        self.assertIn("/static/portfolio/online-shop/assets/", payload["products"][0]["imageUrl"])
        self.assertIn("csrftoken", self.client.cookies)

    def test_create_order_calculates_server_side_total(self):
        response = self.post({**self.payload(), "total": "0.01"})
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["subtotal"], "79.80")
        self.assertEqual(response.json()["deliveryFee"], "8.90")
        self.assertEqual(response.json()["total"], "88.70")
        self.assertEqual(CakeOrder.objects.get().items.count(), 1)

    def test_invalid_quantities_and_unknown_products_reject_entire_request(self):
        payload = self.payload()
        for quantity in (0, -1, 21, True, 1.5, "1.5", None):
            with self.subTest(quantity=quantity):
                self.assertEqual(self.post({**payload, "items": [{"productId": self.product.pk, "quantity": quantity}]}).status_code, 400)
        self.assertEqual(self.post({**payload, "items": [*payload["items"], {"productId": 99999, "quantity": 1}]}).status_code, 400)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_malformed_body_and_date_types_are_bad_requests(self):
        for data in ("{", "[]", "null"):
            response = self.client.post(reverse("shop:create_order"), data=data, content_type="application/json")
            self.assertEqual(response.status_code, 400)
        payload = self.payload()
        for value in ("bad", [], {}, True, 123):
            with self.subTest(value=value):
                self.assertEqual(self.post({**payload, "requestedDate": value}).status_code, 400)

    def test_duplicate_items_are_combined_without_silent_clamping(self):
        payload = self.payload()
        payload["items"] *= 2
        self.assertEqual(self.post(payload).status_code, 201)
        self.assertEqual(CakeOrder.objects.get().items.get().quantity, 4)

    def test_api_retries_are_idempotent_and_guest_number_is_private(self):
        payload = self.payload()
        first, second = self.post(payload), self.post(payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["orderNumber"], second.json()["orderNumber"])
        self.assertEqual(CakeOrder.objects.count(), 1)
        number = first.json()["orderNumber"]
        url = reverse("storefront:confirmation", args=[number])
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(Client().get(url).status_code, 404)
        stranger = Client()
        self.assertEqual(stranger.post(reverse("shop:create_order"), json.dumps(payload), content_type="application/json").status_code, 400)

    def test_api_csrf_cookie_and_header_work(self):
        client = Client(enforce_csrf_checks=True)
        data = client.get(reverse("shop:product_list")).json()
        payload = self.payload()
        payload["requestKey"] = data["checkoutToken"]
        response = client.post(reverse("shop:create_order"), json.dumps(payload), content_type="application/json",
                               HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value)
        self.assertEqual(response.status_code, 201)

    def test_missing_checkout_token_is_rejected(self):
        payload = self.payload()
        del payload["requestKey"]
        self.assertEqual(self.post(payload).status_code, 400)

    def test_delivery_and_customer_validation(self):
        payload = self.payload()
        for values in ({"city": ""}, {"deliveryAddress": ""}, {"postalCode": ""}, {"customer": {"name": "Test", "email": "bad"}}):
            self.assertEqual(self.post({**payload, **values}).status_code, 400)
        self.assertEqual(CakeOrder.objects.count(), 0)
