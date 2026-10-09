from django.contrib.auth import get_user_model
from django.core import signing
from django.test import TestCase, override_settings

from pages.views import HOUSING_TOKEN_SALT


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class HousingApiSafetyTests(TestCase):
    def test_listings_require_authentication(self):
        response = self.client.get("/wohnungssuche-api/listings/")

        self.assertEqual(response.status_code, 401)

    def test_listings_return_only_search_sources_for_authenticated_user(self):
        user = get_user_model().objects.create_user(username="housing-user", password="secret")
        token = signing.dumps({"uid": user.pk}, salt=HOUSING_TOKEN_SALT)

        response = self.client.get("/wohnungssuche-api/listings/", HTTP_AUTHORIZATION=f"Token {token}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 3)
        self.assertEqual({item["listing_kind"] for item in payload["results"]}, {"search_page"})
        self.assertTrue(all(item["is_verified"] is False for item in payload["results"]))
        self.assertTrue(all(item["scores"] == [] for item in payload["results"]))

    def test_dashboard_route_serves_housing_spa(self):
        response = self.client.get("/dashboard")
        content = b"".join(response.streaming_content).decode("utf-8")

        self.assertEqual(response.status_code, 200)
        self.assertIn("/static/portfolio/wohnungssuche/assets/", content)
