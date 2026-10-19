from unittest.mock import patch
import re
from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.core import mail, signing
from django.db import IntegrityError, transaction
from django.test import Client, TestCase, override_settings

from pages.housing_api import HOUSING_TOKEN_MAX_AGE, HOUSING_TOKEN_SALT, make_housing_auth_token
from pages.models import HousingSearchLocation, HousingSearchProfile, HousingTokenRevocation, Profile


API = "/wohnungssuche-api/"


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class HousingApiSafetyTests(TestCase):
    def test_listings_require_authentication(self):
        response = self.client.get("/wohnungssuche-api/listings/")

        self.assertEqual(response.status_code, 401)

    def test_listings_return_only_search_sources_for_authenticated_user(self):
        user = get_user_model().objects.create_user(username="housing-user", password="secret")
        token = make_housing_auth_token(user)

        response = self.client.get("/wohnungssuche-api/listings/", HTTP_AUTHORIZATION=f"Token {token}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 3)
        self.assertEqual({item["listing_kind"] for item in payload["results"]}, {"search_page"})
        self.assertTrue(all(item["is_verified"] is False for item in payload["results"]))
        self.assertTrue(all(item["scores"] == [] for item in payload["results"]))

    def test_dashboard_route_redirects_to_canonical_housing_spa(self):
        self.assertRedirects(self.client.get("/dashboard"), "/wohnungssuche/dashboard", status_code=301)

    def test_canonical_deep_links_and_trailing_slashes_serve_housing_spa(self):
        sections = ("dashboard", "apartments", "search-profiles", "sources", "notifications", "information", "login", "register")
        for path in ("/wohnungssuche/", *(f"/wohnungssuche/{section}{slash}" for section in sections for slash in ("", "/"))):
            with self.subTest(path=path):
                response = self.client.get(path)
                content = b"".join(response.streaming_content).decode("utf-8")
                self.assertEqual(response.status_code, 200)
                self.assertIn("/static/portfolio/wohnungssuche/assets/", content)

    def test_housing_routes_preserve_platform_login(self):
        self.assertEqual(self.client.get("/wohnungssuche/unknown").status_code, 404)
        self.assertEqual(self.client.get("/login/").status_code, 200)
        self.assertRedirects(self.client.get("/login?next=search-profiles"), "/login/?next=search-profiles", status_code=302)


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class HousingPersistenceTests(TestCase):
    def setUp(self):
        self.user_a = get_user_model().objects.create_user(username="housing-example-a", email="housing-a@example.com", password="sample-password-a")
        self.user_b = get_user_model().objects.create_user(username="housing-example-b", email="housing-b@example.com", password="sample-password-b")
        self.token_a = make_housing_auth_token(self.user_a)
        self.token_b = make_housing_auth_token(self.user_b)
        self.client_a = Client(HTTP_AUTHORIZATION=f"Token {self.token_a}")
        self.client_b = Client(HTTP_AUTHORIZATION=f"Token {self.token_b}")

    def create_location(self, client=None, **values):
        response = (client or self.client_a).post(API + "search-locations/", {"name": "Konstanz", "radius_km": 15, **values}, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def create_profile(self, client=None, **values):
        response = (client or self.client_a).post(API + "search-profiles/", {"name": "Beispielsuche", **values}, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_profile_crud_persists_scalar_fields_and_location_relations(self):
        location = self.create_location()
        fields = {"min_rooms": 2.5, "max_rooms": 4, "max_warm_rent": 1200.50, "balcony": True, "fitted_kitchen": True, "ground_floor_or_elevator": True, "location_ids": [location["id"]]}
        profile = self.create_profile(**fields)
        url = f"{API}search-profiles/{profile['id']}/"
        persisted = HousingSearchProfile.objects.get(pk=profile["id"])
        self.assertEqual(persisted.user, self.user_a)
        self.assertEqual(list(persisted.locations.values_list("pk", flat=True)), [location["id"]])
        for key, expected in fields.items():
            self.assertEqual(profile[key], expected)
        self.assertEqual(profile["locations"], [location])

        fresh_client = Client(HTTP_AUTHORIZATION=f"Token {self.token_a}")
        self.assertEqual(fresh_client.get(url).json(), profile)
        self.assertEqual(fresh_client.get(API + "search-profiles/").json()["results"], [profile])
        response = fresh_client.patch(url, {"name": "Neue Beispielsuche", "max_warm_rent": 1300}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["locations"], [location])
        self.assertEqual(response.json()["min_rooms"], 2.5)
        persisted.refresh_from_db()
        self.assertEqual(persisted.name, "Neue Beispielsuche")
        response = fresh_client.put(url, {"name": "Ersetztes Profil"}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["locations"], [])
        self.assertIsNone(response.json()["min_rooms"])
        self.assertFalse(response.json()["balcony"])
        self.assertEqual(fresh_client.delete(url).status_code, 204)
        self.assertFalse(HousingSearchProfile.objects.filter(pk=profile["id"]).exists())
        self.assertEqual(fresh_client.get(url).status_code, 404)
        self.assertTrue(HousingSearchLocation.objects.filter(pk=location["id"]).exists())

    def test_location_crud_updates_nested_profile_and_delete_unlinks(self):
        location = self.create_location(name="  Radolfzell  ", radius_km=12.5)
        profile = self.create_profile(location_ids=[location["id"]])
        url = f"{API}search-locations/{location['id']}/"
        self.assertEqual(self.client_a.get(url).json()["name"], "Radolfzell")
        self.assertEqual(self.client_a.get(API + "search-locations/").json()["results"], [location])
        response = self.client_a.patch(url, {"radius_km": 20}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Radolfzell")
        response = self.client_a.put(url, {"name": "Konstanz", "radius_km": 7.5}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(HousingSearchLocation.objects.get(pk=location["id"]).radius_km, 7.5)
        profile_url = f"{API}search-profiles/{profile['id']}/"
        self.assertEqual(self.client_a.get(profile_url).json()["locations"], [response.json()])
        self.assertEqual(self.client_a.delete(url).status_code, 204)
        self.assertEqual(self.client_a.get(profile_url).json()["locations"], [])
        self.assertEqual(self.client_a.get(url).status_code, 404)

    def test_all_crud_endpoints_require_authentication(self):
        location = self.create_location()
        profile = self.create_profile()
        for kind, item in (("search-locations", location), ("search-profiles", profile)):
            for method, path in (("get", f"{kind}/"), ("post", f"{kind}/"), ("get", f"{kind}/{item['id']}/"), ("put", f"{kind}/{item['id']}/"), ("patch", f"{kind}/{item['id']}/"), ("delete", f"{kind}/{item['id']}/")):
                with self.subTest(kind=kind, method=method):
                    self.assertEqual(getattr(self.client, method)(API + path, content_type="application/json").status_code, 401)

    def test_users_cannot_list_read_modify_delete_or_claim_foreign_records(self):
        location_a = self.create_location()
        profile_a = self.create_profile(location_ids=[location_a["id"]])
        location_b = self.create_location(client=self.client_b, name="Friedrichshafen")
        profile_b = self.create_profile(client=self.client_b, location_ids=[location_b["id"]])
        for kind, owned, foreign in (("search-locations", location_a, location_b), ("search-profiles", profile_a, profile_b)):
            self.assertEqual(self.client_a.get(f"{API}{kind}/").json()["results"], [owned])
            for method in ("get", "put", "patch", "delete"):
                with self.subTest(kind=kind, method=method):
                    response = getattr(self.client_a, method)(f"{API}{kind}/{foreign['id']}/", {"name": "Manipuliert"}, content_type="application/json") if method in ("put", "patch") else getattr(self.client_a, method)(f"{API}{kind}/{foreign['id']}/")
                    self.assertEqual(response.status_code, 404)
        for method, path in (("post", API + "search-profiles/"), ("patch", f"{API}search-profiles/{profile_a['id']}/"), ("put", f"{API}search-profiles/{profile_a['id']}/")):
            response = getattr(self.client_a, method)(path, {"name": "Manipuliert", "location_ids": [location_b["id"]]}, content_type="application/json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("location_ids", response.json()["errors"])
        self.assertEqual(self.client_a.get(f"{API}search-profiles/{profile_a['id']}/").json(), profile_a)
        self.assertEqual(HousingSearchProfile.objects.count(), 2)

    def test_invalid_requests_never_create_records(self):
        for kind in ("search-profiles", "search-locations"):
            for body in ("", "[1]", "null", "{", '{"name":"Example","radius_km":NaN}', b"\xff"):
                with self.subTest(kind=kind, body=body):
                    self.assertEqual(self.client_a.post(f"{API}{kind}/", body, content_type="application/json").status_code, 400)
        for body in ({}, {"name": " "}, {"name": []}, {"name": "x" * 121}, {"name": "Example", "user": self.user_b.pk}):
            for kind in ("search-profiles", "search-locations"):
                self.assertEqual(self.client_a.post(f"{API}{kind}/", body, content_type="application/json").status_code, 400)
        self.assertFalse(HousingSearchProfile.objects.exists())
        self.assertFalse(HousingSearchLocation.objects.exists())

    def test_profile_ranges_types_and_related_ids_are_validated(self):
        location = self.create_location()
        invalid = (
            {"min_rooms": -1}, {"max_rooms": 101}, {"max_warm_rent": -1}, {"max_warm_rent": 1000001},
            {"min_rooms": 5, "max_rooms": 2}, {"min_rooms": True}, {"min_rooms": "NaN"},
            {"max_warm_rent": 123.456}, {"max_rooms": []}, {"balcony": "false"}, {"fitted_kitchen": 1},
            {"ground_floor_or_elevator": None}, {"location_ids": None}, {"location_ids": "1"},
            {"location_ids": [True]}, {"location_ids": [1.2]}, {"location_ids": [2**100]},
            {"location_ids": [999999]}, {"location_ids": [location["id"], location["id"]]},
        )
        for fields in invalid:
            with self.subTest(fields=fields):
                response = self.client_a.post(API + "search-profiles/", {"name": "Example", **fields}, content_type="application/json")
                self.assertEqual(response.status_code, 400)
        self.assertFalse(HousingSearchProfile.objects.exists())
        profile = self.create_profile(min_rooms=2, max_rooms=4)
        url = f"{API}search-profiles/{profile['id']}/"
        response = self.client_a.patch(url, {"min_rooms": 5}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client_a.get(url).json(), profile)

    def test_location_radius_validation_and_defaults(self):
        for value in (-1, 1001, True, None, "invalid", "Infinity", 0.001):
            with self.subTest(value=value):
                response = self.client_a.post(API + "search-locations/", {"name": "Example", "radius_km": value}, content_type="application/json")
                self.assertEqual(response.status_code, 400)
        response = self.client_a.post(API + "search-locations/", {"name": "Example"}, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["radius_km"], 15)

    def test_missing_or_out_of_range_detail_ids_return_not_found(self):
        for kind in ("search-profiles", "search-locations"):
            for pk in (0, 999999, 2**100):
                for method in ("get", "put", "patch", "delete"):
                    with self.subTest(kind=kind, pk=pk, method=method):
                        self.assertEqual(getattr(self.client_a, method)(f"{API}{kind}/{pk}/", content_type="application/json").status_code, 404)

    def test_database_enforces_ranges_when_api_is_bypassed(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            HousingSearchProfile.objects.create(user=self.user_a, name="Invalid", min_rooms=4, max_rooms=2)
        with self.assertRaises(IntegrityError), transaction.atomic():
            HousingSearchLocation.objects.create(user=self.user_a, name="Invalid", radius_km=-1)

    def test_malformed_expired_and_inactive_tokens_are_rejected(self):
        for data in (None, [], {"uid": []}, {"uid": True}, {"uid": "1"}, {"uid": 2**100}):
            token = signing.dumps(data, salt=HOUSING_TOKEN_SALT)
            self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION=f"Token {token}").status_code, 401)
        self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION="Token broken").status_code, 401)
        with patch("django.core.signing.time.time", return_value=1):
            expired = make_housing_auth_token(self.user_a)
        with patch("django.core.signing.time.time", return_value=HOUSING_TOKEN_MAX_AGE + 2):
            self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION=f"Token {expired}").status_code, 401)
        self.user_a.is_active = False
        self.user_a.save(update_fields=["is_active"])
        self.assertEqual(self.client_a.get(API + "search-profiles/").status_code, 401)

    def test_logout_revokes_only_current_token_and_new_login_works(self):
        credentials = {"username": self.user_a.username, "password": "sample-password-a"}
        first = self.client.post(API + "token-auth/", credentials, content_type="application/json").json()
        second = self.client.post(API + "token-auth/", credentials, content_type="application/json").json()
        self.assertNotEqual(first["token"], second["token"])
        self.assertEqual(first["username"], self.user_a.username)
        logged_in = Client(HTTP_AUTHORIZATION=f"Token {first['token']}")
        self.assertEqual(logged_in.post(API + "logout/").status_code, 204)
        self.assertEqual(logged_in.get(API + "search-profiles/").status_code, 401)
        self.assertEqual(logged_in.get(API + "listings/").status_code, 401)
        self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION=f"Token {second['token']}").status_code, 200)
        self.assertEqual(HousingTokenRevocation.objects.count(), 1)
        self.assertNotEqual(HousingTokenRevocation.objects.get().token_hash, first["token"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_registration_login_and_duplicate_validation(self):
        account = {"username": "housing-example-c", "email": "housing-c@example.com", "password": "sample-password-c", "password_confirm": "sample-password-c"}
        response = self.client.post(API + "register/", account, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["login_url"], "/wohnungssuche/login")
        self.assertTrue(response.json()["emailVerificationRequired"])
        self.assertEqual(response.json()["emailDelivery"], "email")
        user = get_user_model().objects.get(username=account["username"])
        self.assertTrue(user.check_password(account["password"]))
        self.assertFalse(user.is_active)
        self.assertTrue(user.profile.email_verification_pending)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertNotIn("token", response.json())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [account["email"]])
        self.assertEqual(self.client.post(API + "register/", account, content_type="application/json").status_code, 400)
        for field, value in (("email", "invalid"), ("username", []), ("password", None), ("password_confirm", "mismatch")):
            bad = {**account, "username": "housing-invalid-example", field: value}
            self.assertEqual(self.client.post(API + "register/", bad, content_type="application/json").status_code, 400)
        credentials = {"username": account["username"], "password": account["password"]}
        blocked = self.client.post(API + "token-auth/", credentials, content_type="application/json")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.json()["code"], "email_verification_required")
        self.assertNotIn("token", blocked.json())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION=f"Token {make_housing_auth_token(user)}").status_code, 401)
        link = urlsplit(re.search(r'https?://[^\s<>\"]+', mail.outbox[0].body).group())
        activated = self.client.get(f"{link.path}?{link.query}")
        self.assertEqual(activated.status_code, 302)
        self.assertEqual(activated["Location"], "/wohnungssuche/login")
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.profile.email_verification_pending)
        self.assertTrue(user.learning_profile.email_verified)
        login = self.client.post(API + "token-auth/", credentials, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.client.get(API + "search-profiles/", HTTP_AUTHORIZATION=f"Token {login.json()['token']}").json()["results"], [])


@override_settings(
    LOGIN_REQUIRED=False,
    AUTH_PASSWORD_VALIDATORS=[],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class HousingRegistrationVerificationTests(TestCase):
    account = {
        "username": "pending-housing-example", "email": "pending-housing@example.test",
        "password": "fictional-housing-password", "password_confirm": "fictional-housing-password",
    }

    def register(self, **overrides):
        return self.client.post(API + "register/", {**self.account, **overrides}, content_type="application/json")

    def test_failed_delivery_rolls_back_the_entire_registration(self):
        with patch("pages.verification.send_account_verification_email", return_value=False):
            response = self.register()
        self.assertEqual(response.status_code, 503)
        self.assertIn("Bestätigungs-E-Mail", response.json()["errors"]["detail"][0])
        self.assertFalse(get_user_model().objects.filter(username=self.account["username"]).exists())
        self.assertFalse(Profile.objects.exists())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertNotIn("token", response.json())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend")
    def test_console_delivery_is_identified_without_exposing_a_confirmation_token(self):
        with patch("pages.verification.send_account_verification_email", return_value=True):
            response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["emailVerificationRequired"])
        self.assertEqual(response.json()["emailDelivery"], "console")
        self.assertEqual(set(response.json()), {"detail", "email", "login_url", "emailVerificationRequired", "emailDelivery"})

    def test_wrong_password_and_administratively_disabled_accounts_get_generic_errors(self):
        self.assertEqual(self.register().status_code, 201)
        pending = self.client.post(API + "token-auth/", {
            "username": self.account["username"], "password": "fictional-wrong-password",
        }, content_type="application/json")
        self.assertEqual(pending.status_code, 400)
        self.assertNotIn("code", pending.json())
        Profile.objects.filter(user__username=self.account["username"]).update(email_verification_pending=False)
        disabled = self.client.post(API + "token-auth/", {
            "username": self.account["username"], "password": self.account["password"],
        }, content_type="application/json")
        self.assertEqual(disabled.status_code, 400)
        self.assertNotIn("code", disabled.json())
        self.assertNotIn("token", disabled.json())

    def test_duplicate_addresses_and_cross_field_collisions_are_rejected(self):
        get_user_model().objects.create_user(
            username="existing-address@example.test", email="existing-email@example.test",
            password="fictional-existing-password",
        )
        for fields, error_field in (
            ({"username": "EXISTING-ADDRESS@EXAMPLE.TEST"}, "username"),
            ({"username": "EXISTING-EMAIL@EXAMPLE.TEST"}, "username"),
            ({"email": "EXISTING-EMAIL@EXAMPLE.TEST"}, "email"),
            ({"email": "EXISTING-ADDRESS@EXAMPLE.TEST"}, "email"),
        ):
            with self.subTest(fields=fields):
                response = self.register(**fields)
                self.assertEqual(response.status_code, 400)
                self.assertIn(error_field, response.json()["errors"])
        self.assertEqual(len(mail.outbox), 0)
