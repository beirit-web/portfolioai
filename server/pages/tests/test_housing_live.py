import json
from datetime import timedelta
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from pages import housing_live
from pages.housing_api import make_housing_auth_token
from pages.models import HousingApiBudget


URL = "/wohnungssuche-api/live-search/"
KEY = "fictional-somantic-test-key"


def listing(**overrides):
    return {"node": {
        "immo_id": "fictional-flat-1", "title": "Fiktive Wohnung am Beispielpark", "city": "Konstanz",
        "zipcode": 78462, "source": "Beispielportal", "url": "https://housing.example.test/offer/1",
        "action": "mieten", "is_active": True, "currency": "EUR",
        "rent_price": 800, "warm_rent_price": 1000, "rooms": 2.5, "square_meter": 65,
        **overrides,
    }}


@override_settings(HOUSING_SOMANTIC_ENABLED=True, HOUSING_SOMANTIC_API_KEY=KEY, HOUSING_SOMANTIC_MONTHLY_LIMIT=3)
class HousingLiveSearchTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="housing-live-example")
        self.auth = {"HTTP_AUTHORIZATION": f"Token {make_housing_auth_token(user)}"}

    def search(self, body=None, **headers):
        return self.client.post(URL, body or {"city": "Konstanz"}, content_type="application/json", **(headers or self.auth))

    def upstream(self, fetch, edges=None, payload=None):
        response = MagicMock()
        data = payload if payload is not None else {"data": {"all_appartments": {"edges": [listing()] if edges is None else edges}}}
        response.read.return_value = json.dumps(data).encode()
        fetch.return_value.open.return_value.__enter__.return_value = response
        return response

    @patch("pages.housing_live.build_opener")
    def test_requires_token_and_never_fetches_on_get_or_status(self, fetch):
        self.assertEqual(self.client.post(URL, {"city": "Konstanz"}, content_type="application/json").status_code, 401)
        self.assertEqual(self.client.get(URL).status_code, 405)
        self.assertEqual(self.client.get(URL + "status/").status_code, 401)
        status = self.client.get(URL + "status/", **self.auth)
        self.assertEqual(status.json(), {"enabled": True, "monthly_limit": 3, "remaining": 3, "provider": "Somantic"})
        self.assertNotIn(KEY, status.content.decode())
        self.assertEqual(HousingApiBudget.objects.count(), 0)
        fetch.assert_not_called()

    @patch("pages.housing_live.build_opener")
    @override_settings(HOUSING_SOMANTIC_API_KEY="")
    def test_missing_key_leaves_demo_available_and_consumes_no_budget(self, fetch):
        response = self.search()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")
        self.assertEqual(HousingApiBudget.objects.count(), 0)
        self.assertEqual(self.client.get("/wohnungssuche/").status_code, 200)
        fetch.assert_not_called()

    @patch("pages.housing_live.build_opener")
    @override_settings(HOUSING_SOMANTIC_ENABLED=False)
    def test_key_alone_does_not_enable_requests(self, fetch):
        self.assertEqual(self.search().json()["code"], "not_configured")
        fetch.assert_not_called()

    @patch("pages.housing_live.build_opener")
    def test_valid_search_uses_server_key_and_returns_only_safe_display_fields(self, fetch):
        self.upstream(fetch, [listing(description="not returned", street="not returned", images=["not returned"])])
        response = self.search({"city": "Konstanz", "max_cold_rent": 800, "max_warm_rent": 1100, "min_rooms": 2})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["remaining"], 2)
        self.assertEqual(data["results"][0], {
            "title": "Fiktive Wohnung am Beispielpark", "city": "Konstanz", "zipcode": "78462",
            "source": "Beispielportal", "url": "https://housing.example.test/offer/1",
            "cold_rent": 800, "warm_rent": 1000, "rooms": 2.5, "living_area": 65,
        })
        request = fetch.return_value.open.call_args.args[0]
        self.assertEqual(request.full_url, housing_live.API_URL)
        self.assertEqual(request.get_header("X-api-key"), KEY)
        self.assertIn('action: "mieten"', json.loads(request.data)["query"])
        self.assertIn('rent_price_lt: 801', json.loads(request.data)["query"])
        self.assertEqual(fetch.return_value.open.call_args.kwargs["timeout"], 10)
        self.assertIsInstance(fetch.call_args.args[0], housing_live.NoRedirect)
        self.assertEqual(HousingApiBudget.objects.get().requests, 1)
        self.assertIn("no-store", response["Cache-Control"])
        self.assertIn("Authorization", response["Vary"])
        self.assertIn("noindex", response["X-Robots-Tag"])
        self.assertNotIn(KEY, response.content.decode())
        self.assertIn("noindex", self.client.get("/wohnungssuche/apartments")["X-Robots-Tag"])

    @patch("pages.housing_live.build_opener")
    def test_invalid_search_never_spends_an_api_request(self, fetch):
        bodies = [{"city": ""}, {"city": ["Konstanz"]}, {"city": "K"}, {"city": "Konstanz\n"},
                  {"city": "Konstanz", "max_cold_rent": -1}, {"city": "Konstanz", "min_rooms": True},
                  {"city": "Konstanz", "max_warm_rent": "NaN"}, {"city": "Konstanz", "min_rooms": 101}]
        for body in bodies:
            with self.subTest(body=body):
                self.assertEqual(self.search(body).status_code, 400)
        self.assertEqual(HousingApiBudget.objects.count(), 0)
        fetch.assert_not_called()

    @patch("pages.housing_live.build_opener")
    def test_cooldown_and_monthly_budget_are_shared_by_all_accounts(self, fetch):
        self.upstream(fetch)
        self.assertEqual(self.search().status_code, 200)
        user_b = get_user_model().objects.create_user(username="housing-live-example-b")
        auth_b = {"HTTP_AUTHORIZATION": f"Token {make_housing_auth_token(user_b)}"}
        response = self.search(**auth_b)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "cooldown")
        self.assertIn("Retry-After", response)
        HousingApiBudget.objects.update(requests=3, next_request_at=timezone.now() - timedelta(seconds=1))
        response = self.search(**auth_b)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "monthly_limit")
        self.assertEqual(response.json()["remaining"], 0)
        self.assertEqual(fetch.return_value.open.call_count, 1)
        self.assertEqual(HousingApiBudget.objects.get().requests, 3)

    @patch("pages.housing_live.build_opener")
    def test_new_month_has_new_budget_without_resetting_previous_counts(self, fetch):
        HousingApiBudget.objects.create(month=housing_live.month_start() - timedelta(days=1), requests=3, next_request_at=timezone.now())
        self.upstream(fetch)
        self.assertEqual(self.search().status_code, 200)
        self.assertEqual(HousingApiBudget.objects.count(), 2)
        self.assertEqual(HousingApiBudget.objects.get(month=housing_live.month_start()).requests, 1)

    @override_settings(HOUSING_SOMANTIC_MONTHLY_LIMIT=999)
    def test_free_tier_hard_cap_cannot_be_raised_by_configuration(self):
        self.assertEqual(housing_live.monthly_limit(), 50)

    @patch("pages.housing_live.build_opener")
    def test_filters_missing_prices_unsafe_links_inactive_and_sale_results(self, fetch):
        edges = [listing(), listing(action="kaufen"), listing(is_active=False), listing(currency="USD"),
                 listing(url="javascript:alert(1)"), listing(url="https://name:password@housing.example.test/"),
                 listing(source=""), listing(warm_rent_price=None), listing(warm_rent_price=1500),
                 listing(rooms=1), listing(rent_price=800.50)]
        self.upstream(fetch, edges)
        data = self.search({"city": "Konstanz", "max_cold_rent": 800, "max_warm_rent": 1100, "min_rooms": 2}).json()
        self.assertEqual(data["count"], 1)

    @patch("pages.housing_live.build_opener")
    def test_provider_failures_do_not_retry_leak_details_or_refund_budget(self, fetch):
        for exception, code in ((URLError(KEY), "provider_unavailable"),
                                (HTTPError(housing_live.API_URL, 401, KEY, {}, None), "provider_auth"),
                                (HTTPError(housing_live.API_URL, 429, KEY, {}, None), "provider_limit")):
            HousingApiBudget.objects.all().delete()
            fetch.return_value.open.side_effect = exception
            response = self.search()
            self.assertEqual(response.json()["code"], code)
            self.assertNotIn(KEY, response.content.decode())
            self.assertEqual(HousingApiBudget.objects.get().requests, 1)
        self.assertEqual(fetch.return_value.open.call_count, 3)

    @patch("pages.housing_live.build_opener")
    def test_graphql_errors_and_oversized_responses_fail_closed(self, fetch):
        response = self.upstream(fetch, payload={"errors": [{"message": KEY}]})
        self.assertEqual(self.search().json()["code"], "provider_unavailable")
        HousingApiBudget.objects.all().delete()
        response.read.return_value = b"x" * (housing_live.MAX_RESPONSE_BYTES + 1)
        self.assertEqual(self.search().json()["code"], "provider_unavailable")

    def test_city_input_is_encoded_as_a_graphql_string_literal(self):
        city = 'Konstanz" }, page: 99) { title } #'
        search = housing_live.validate_search({"city": city})
        query = housing_live.build_query(search)
        self.assertIn("city: " + json.dumps(city), query)
        self.assertTrue(query.startswith('{ all_appartments(per_page: 20, page: 1,'))

    def test_redirects_never_forward_the_api_key(self):
        handler = housing_live.NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, "", {}, "https://other.example.test/"))
