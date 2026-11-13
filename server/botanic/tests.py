import json
from datetime import timedelta
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.contrib.auth import get_user_model
from django.core.cache import caches
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.test import Client, RequestFactory, TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone

from . import api
from .models import ApiBudget, Plant, Species, Watering
from .care import care_for
from .forms import PlantForm
from .views import _context
from config.middleware import SafeStatusPageMiddleware

TEST_CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
    "botanic": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "botanic-tests"},
}


class SafeStatusResponseTests(TestCase):
    def test_unhandled_html_errors_still_use_neutral_page(self):
        response = HttpResponse("Internal details", status=503)
        neutral = HttpResponse("Unavailable", status=503)
        middleware = SafeStatusPageMiddleware(lambda request: response)
        with patch("config.middleware.error_response", return_value=neutral) as render_error:
            self.assertIs(middleware(RequestFactory().get("/example/")), neutral)
        render_error.assert_called_once()

    def test_explicitly_handled_app_error_is_preserved(self):
        response = HttpResponse("Pflanzenquelle nicht verfügbar", status=503)
        response.status_page_handled = True
        middleware = SafeStatusPageMiddleware(lambda request: response)
        with patch("config.middleware.error_response") as render_error:
            self.assertIs(middleware(RequestFactory().get("/botanic/")), response)
        render_error.assert_not_called()

    def test_json_validation_errors_remain_unchanged(self):
        response = JsonResponse({"error": "Invalid query"}, status=400)
        middleware = SafeStatusPageMiddleware(lambda request: response)
        self.assertIs(middleware(RequestFactory().get("/botanic/api/suche/")), response)


@override_settings(LOGIN_REQUIRED=False, CACHES=TEST_CACHES)
class BotanicViewsTests(TestCase):
    @override_settings(LOGIN_REQUIRED=True)
    def test_weather_module_is_public_and_uses_the_botanic_shell(self):
        with patch("botanic.api.urlopen") as fetch:
            response = self.client.get(reverse("botanic:weather"))
        fetch.assert_not_called()
        self.assertContains(response, 'id="botanic-weather-root"')
        self.assertContains(response, "js/weather-widget.js")
        self.assertContains(response, 'id="weatherPageTitle"')
        self.assertContains(response, 'id="cityInput"')
        self.assertNotContains(response, 'type="module"')
        self.assertNotContains(response, "preact-vendor")
        self.assertContains(response, "Wetter | ENBT Botanic")
        self.assertEqual(response.context["tab"], "weather")
        self.assertIn("no-store", response["Cache-Control"])
        self.assertNotContains(response, "Fenstermonstera")
        self.assertNotContains(response, "Privat")

    @override_settings(LOGIN_REQUIRED=True)
    def test_former_weather_routes_redirect_to_the_integrated_module(self):
        for path in ("/wetter", "/wetter/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 301)
            self.assertEqual(response["Location"], reverse("botanic:weather"))

    def test_weather_keeps_owner_counts_without_changing_watering(self):
        self.login()
        response = self.client.get(reverse("botanic:weather"))
        self.assertEqual(response.context["plant_count"], 1)
        self.assertEqual(response.context["due_count"], 1)
        self.plant.refresh_from_db()
        self.assertEqual(self.plant.next_watering, self.today - timedelta(days=4))

    def test_owner_counts_use_one_query_and_ignore_other_owners(self):
        Plant.objects.create(owner=self.user, species=self.species, paused=True, next_watering=None)
        Plant.objects.create(owner=self.user, species=self.species, next_watering=self.today + timedelta(days=2))
        request = RequestFactory().get(reverse("botanic:weather"))
        request.user = self.user
        with self.assertNumQueries(1):
            context = _context(request, "weather")
        self.assertEqual((context["plant_count"], context["due_count"], context["paused_count"]), (3, 1, 1))

    def test_week_counts_are_grouped_and_ignore_paused_and_foreign_plants(self):
        self.login()
        Plant.objects.create(owner=self.user, species=self.species, next_watering=self.today)
        Plant.objects.create(owner=self.user, species=self.species, next_watering=self.today + timedelta(days=2))
        Plant.objects.create(owner=self.user, species=self.species, next_watering=self.today + timedelta(days=2))
        Plant.objects.create(owner=self.user, species=self.species, paused=True, next_watering=self.today)
        Plant.objects.create(owner=self.other, species=self.species, next_watering=self.today + timedelta(days=2))
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("botanic:index"), {"tab": "watering"})
        self.assertEqual([day["count"] for day in response.context["days"]], [1, 0, 2, 0, 0, 0, 0])
        counted_plant_queries = [query["sql"] for query in queries if '"botanic_plant"' in query["sql"] and "COUNT(" in query["sql"]]
        # Owner totals, grouped week dates, and the filtered paginator count.
        self.assertEqual(len(counted_plant_queries), 3)

    def setUp(self):
        self.user = get_user_model().objects.create_user(username="botanic@example.test", password="test-password")
        self.other = get_user_model().objects.create_user(username="other@example.test")
        self.today = timezone.localdate()
        self.species = Species.objects.create(taxon_id=122521, name="Fensterblatt", scientific_name="Monstera deliciosa", details_fetched_at=timezone.now())
        self.plant = Plant.objects.create(owner=self.user, species=self.species, nickname="Fenstermonstera",
                                          location="Wohnzimmer", watering_interval=10, next_watering=self.today - timedelta(days=4))
        self.foreign = Plant.objects.create(owner=self.other, species=self.species, nickname="Privat", notes="Nicht öffentlich")
        self.data = {"nickname": "Meine zweite Monstera", "location": "Büro", "watering_interval": "7",
                     "next_watering": self.today.isoformat(), "notes": "Eigene Erde"}

    def login(self):
        self.client.force_login(self.user)

    @patch("botanic.api.search", return_value={"results": [], "total": 0})
    @override_settings(LOGIN_REQUIRED=True)
    def test_public_search_with_global_login_requirement(self, search):
        response = self.client.get(reverse("botanic:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "ENBT")
        search.assert_called_once_with("Monstera", 1)

    def test_guest_collection_prompts_login_and_does_not_leak(self):
        response = self.client.get(reverse("botanic:index"), {"tab": "plants"})
        self.assertContains(response, "Konto erstellen")
        self.assertNotContains(response, "Fenstermonstera")
        self.assertNotContains(response, "Nicht öffentlich")

    def test_private_collection_survives_without_external_api(self):
        self.login()
        with patch("botanic.api.urlopen") as fetch:
            response = self.client.get(reverse("botanic:index"), {"tab": "plants"})
        fetch.assert_not_called()
        self.assertContains(response, "Fenstermonstera")
        self.assertNotContains(response, "Nicht öffentlich")
        self.assertEqual(response.context["due_count"], 1)

    def test_save_multiple_individual_plants_of_one_species(self):
        self.login()
        response = self.client.post(reverse("botanic:add", args=[self.species.pk]), self.data)
        self.assertEqual(response.status_code, 302)
        saved = Plant.objects.get(owner=self.user, nickname=self.data["nickname"])
        self.assertEqual(saved.species, self.species)
        self.assertEqual(saved.location, "Büro")
        self.assertEqual(saved.owner, self.user)

    def test_verified_care_start_value_and_saved_interval_are_separate(self):
        new_form = PlantForm(species=self.species)
        self.assertEqual(new_form.initial["watering_interval"], 10)
        self.plant.watering_interval = 23
        self.plant.save()
        existing_form = PlantForm(instance=self.plant, species=self.species)
        self.assertEqual(existing_form.initial["watering_interval"], 23)
        unknown = Species(scientific_name="Unknown species")
        self.assertIsNone(care_for(unknown))
        pilea = Species(scientific_name="Pilea peperomioides")
        self.assertIsNone(care_for(pilea)["interval"])

    def test_care_source_links_are_present_on_species_page(self):
        response = self.client.get(reverse("botanic:species", args=[self.species.pk]))
        self.assertContains(response, "7–10 Tage")
        self.assertContains(response, "Quelle: The Sill")
        self.assertContains(response, "https://www.google.com/search?")

    def test_guest_save_returns_to_public_species_after_login(self):
        response = self.client.post(reverse("botanic:add", args=[self.species.pk]), self.data)
        self.assertEqual(response.status_code, 302)
        self.assertIn("next=%2Fbotanic%2Farten%2F122521%2F", response.url)

    def test_invalid_intervals_and_dates_do_not_save(self):
        self.login()
        for overrides in ({"watering_interval": "0"}, {"watering_interval": "366"}, {"next_watering": "bad"}, {"next_watering": ""}):
            with self.subTest(overrides=overrides):
                response = self.client.post(reverse("botanic:add", args=[self.species.pk]), {**self.data, **overrides})
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'aria-invalid="true"')
        self.assertEqual(Plant.objects.filter(owner=self.user).count(), 1)

    def test_invalid_edit_retains_field_errors_and_saved_values(self):
        self.login()
        response = self.client.post(reverse("botanic:edit", args=[self.plant.pk]), {**self.data, "watering_interval": "0"})
        self.assertContains(response, 'id="id_watering_interval-errors"')
        self.assertContains(response, 'aria-invalid="true"')
        self.plant.refresh_from_db()
        self.assertEqual(self.plant.watering_interval, 10)

    @patch("botanic.api.get_species", side_effect=api.ApiError("Pflanzenquelle ist gerade nicht erreichbar."))
    def test_upstream_error_keeps_app_navigation_and_service_status(self, fetch):
        response = self.client.get(reverse("botanic:species", args=[999]))
        self.assertContains(response, "Zum Pflanzenkatalog", status_code=503)
        self.assertContains(response, "Pflanzenquelle ist gerade nicht erreichbar.", status_code=503)

    def test_paused_plant_may_have_no_date(self):
        self.login()
        response = self.client.post(reverse("botanic:add", args=[self.species.pk]), {**self.data, "paused": "on", "next_watering": ""})
        self.assertEqual(response.status_code, 302)
        saved = Plant.objects.get(owner=self.user, nickname=self.data["nickname"])
        self.assertTrue(saved.paused)
        self.assertIsNone(saved.next_watering)

    def test_foreign_objects_are_not_readable_or_mutable(self):
        self.login()
        self.assertEqual(self.client.get(reverse("botanic:edit", args=[self.foreign.pk])).status_code, 404)
        for route in ("edit", "water", "snooze", "delete"):
            response = self.client.post(reverse(f"botanic:{route}", args=[self.foreign.pk]), {**self.data, "days": "3"})
            self.assertEqual(response.status_code, 404)
        self.foreign.refresh_from_db()
        self.assertEqual(self.foreign.nickname, "Privat")

    def test_watering_uses_actual_day_and_is_idempotent(self):
        self.login()
        url = reverse("botanic:water", args=[self.plant.pk])
        self.client.post(url)
        self.client.post(url)
        self.plant.refresh_from_db()
        self.assertEqual(self.plant.next_watering, self.today + timedelta(days=10))
        self.assertEqual(self.plant.waterings.count(), 1)
        self.assertEqual(self.plant.waterings.get().watered_on, self.today)
        self.assertEqual(self.client.get(url).status_code, 405)

    def test_paused_plant_cannot_be_watered_or_snoozed(self):
        self.login()
        self.plant.paused = True
        self.plant.save()
        original = self.plant.next_watering
        self.client.post(reverse("botanic:water", args=[self.plant.pk]))
        self.client.post(reverse("botanic:snooze", args=[self.plant.pk]), {"days": "3"})
        self.plant.refresh_from_db()
        self.assertEqual(self.plant.next_watering, original)
        self.assertFalse(self.plant.waterings.exists())

    def test_snooze_from_today_for_overdue_plant(self):
        self.login()
        url = reverse("botanic:snooze", args=[self.plant.pk])
        self.assertEqual(self.client.post(url, {"days": "9999"}).status_code, 400)
        self.client.post(url, {"days": "3"})
        self.plant.refresh_from_db()
        self.assertEqual(self.plant.next_watering, self.today + timedelta(days=3))

    def test_edit_pause_and_resume(self):
        self.login()
        url = reverse("botanic:edit", args=[self.plant.pk])
        self.client.post(url, {**self.data, "paused": "on"})
        paused = self.client.get(reverse("botanic:index"), {"tab": "watering", "filter": "paused"})
        self.assertContains(paused, self.data["nickname"])
        self.assertEqual(paused.context["due_count"], 0)
        self.client.post(url, self.data)
        self.plant.refresh_from_db()
        self.assertFalse(self.plant.paused)
        self.assertEqual(self.plant.notes, "Eigene Erde")

    def test_collection_and_plan_filters(self):
        self.login()
        url = reverse("botanic:index")
        filtered = self.client.get(url, {"tab": "plants", "location": "Not a location"})
        self.assertEqual(len(filtered.context["plants"]), 0)
        upcoming = self.client.get(url, {"tab": "watering", "filter": "upcoming"})
        self.assertEqual(len(upcoming.context["plants"]), 0)
        invalid_date = self.client.get(url, {"tab": "watering", "day": "bad"})
        self.assertEqual(invalid_date.status_code, 404)

    def test_delete_removes_only_owned_plant_and_its_log(self):
        self.login()
        Watering.objects.create(plant=self.plant)
        url = reverse("botanic:delete", args=[self.plant.pk])
        self.assertEqual(self.client.get(url).status_code, 405)
        self.client.post(url)
        self.assertFalse(Plant.objects.filter(pk=self.plant.pk).exists())
        self.assertEqual(Watering.objects.count(), 0)
        self.assertTrue(Plant.objects.filter(pk=self.foreign.pk).exists())
        self.assertTrue(Species.objects.filter(pk=self.species.pk).exists())

    def test_writes_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        response = client.post(reverse("botanic:water", args=[self.plant.pk]))
        self.assertEqual(response.status_code, 403)
        client.get(reverse("botanic:edit", args=[self.plant.pk]))
        token = client.cookies["csrftoken"].value
        response = client.post(reverse("botanic:water", args=[self.plant.pk]), {"csrfmiddlewaretoken": token})
        self.assertEqual(response.status_code, 302)

    @override_settings(CONTENT_SECURITY_POLICY_ENFORCE=True)
    def test_csp_is_scoped_to_botanic_and_content_is_escaped(self):
        self.login()
        self.plant.nickname = "<script>alert(1)</script>"
        self.plant.save()
        response = self.client.get(reverse("botanic:edit", args=[self.plant.pk]))
        self.assertIn("https://inaturalist-open-data.s3.amazonaws.com", response["Content-Security-Policy"])
        self.assertContains(response, "&lt;script&gt;alert(1)&lt;/script&gt;")
        self.assertNotContains(response, "<script>alert(1)</script>")


@override_settings(LOGIN_REQUIRED=False, CACHES=TEST_CACHES)
class BotanicApiTests(TestCase):
    def setUp(self):
        caches["botanic"].clear()
        self.taxon = {"id": 122521, "name": "Monstera deliciosa", "preferred_common_name": "Fensterblatt",
                      "rank": "species", "iconic_taxon_name": "Plantae", "default_photo": {
                          "id": 63451902, "license_code": "cc-by", "attribution": "Example photographer (CC BY)",
                          "medium_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/63451902/medium.jpeg"}}

    def response(self, mock, payload):
        mock.return_value.__enter__.return_value.read.return_value = json.dumps(payload).encode()

    @patch("botanic.api.urlopen")
    def test_live_shape_normalization_search_cache_and_unicode(self, fetch):
        self.response(fetch, {"results": [self.taxon], "total_results": 1})
        first = api.search("Fensterblatt")
        second = api.search("fensterblatt")
        self.assertEqual(first["results"][0].name, "Fensterblatt")
        self.assertEqual(second["results"][0].pk, 122521)
        self.assertEqual(first["results"][0].image_license, "cc-by")
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(ApiBudget.objects.get().requests, 1)

    def test_image_license_and_host_allowlist(self):
        for overrides in ({"license_code": "cc-by-nc"}, {"license_code": None}, {"medium_url": "https://evil.example/image.jpg"},
                          {"medium_url": "javascript:alert(1)"}, {"medium_url": "http://static.inaturalist.org/x.jpg"}):
            with self.subTest(overrides=overrides):
                data = {**self.taxon, "default_photo": {**self.taxon["default_photo"], **overrides}}
                self.assertEqual(api._photo(data), {})
        data = {**self.taxon, "default_photo": None, "taxon_photos": [{"photo": self.taxon["default_photo"]}]}
        self.assertEqual(api._photo(data)["image_license"], "cc-by")
        self.assertEqual(api._photo({"taxon_photos": None}), {})

    def test_animals_and_higher_taxa_are_not_stored(self):
        self.assertIsNone(api._store({**self.taxon, "iconic_taxon_name": "Aves"}))
        self.assertIsNone(api._store({**self.taxon, "rank": "genus"}))
        self.assertEqual(Species.objects.count(), 0)

    @patch("botanic.api.urlopen")
    def test_global_rate_limit_and_daily_reset(self, fetch):
        self.response(fetch, {"results": [self.taxon], "total_results": 1})
        api.search("Monstera")
        with self.assertRaises(api.ApiError) as error:
            api.search("Ficus")
        self.assertEqual(error.exception.status, 429)
        budget = ApiBudget.objects.get()
        budget.next_request_at = timezone.now() - timedelta(seconds=2)
        budget.requests = 9500
        budget.save()
        with self.assertRaises(api.ApiError):
            api.search("Ficus")
        budget.day = timezone.localdate() - timedelta(days=1)
        budget.save()
        api.search("Ficus")
        budget.refresh_from_db()
        self.assertEqual(budget.requests, 1)

    @patch("botanic.api.urlopen", side_effect=HTTPError(api.API_BASE, 429, "Limited", {}, None))
    def test_upstream_429_causes_persistent_cooldown(self, fetch):
        response = self.client.get(reverse("botanic:search"), {"q": "Monstera"})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], "60")
        self.assertGreater(ApiBudget.objects.get().next_request_at, timezone.now() + timedelta(seconds=50))

    @patch("botanic.api.urlopen", side_effect=URLError("offline"))
    def test_failure_is_explicit_and_does_not_fake_results(self, fetch):
        response = self.client.get(reverse("botanic:search"), {"q": "Monstera"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("error", response.json())
        self.assertEqual(Species.objects.count(), 0)

    @patch("botanic.api.urlopen")
    def test_bad_query_and_page_do_not_call_provider(self, fetch):
        for query in ({"q": "x"}, {"q": "a" * 81}, {"q": "Monstera", "page": "999"}):
            self.assertEqual(self.client.get(reverse("botanic:search"), query).status_code, 400)
        fetch.assert_not_called()

    @patch("botanic.api.urlopen")
    def test_malformed_upstream_response_is_reported(self, fetch):
        self.response(fetch, {"results": None})
        self.assertEqual(self.client.get(reverse("botanic:search"), {"q": "Monstera"}).status_code, 503)

    @patch("botanic.api._request")
    def test_detail_photo_batch_is_one_additional_request(self, fetch):
        without_photo = {**self.taxon, "default_photo": None}
        fetch.side_effect = [{"results": [without_photo], "total_results": 1}, {"results": [self.taxon]}]
        result = api.search("Monstera")
        self.assertTrue(result["results"][0].image_url)
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(fetch.call_args.args[0], "/122521")

    @patch("botanic.api._request", side_effect=api.ApiError("offline"))
    def test_cached_species_remains_available_offline(self, fetch):
        species = api._store(self.taxon)
        self.assertEqual(api.get_species(species.pk), species)
