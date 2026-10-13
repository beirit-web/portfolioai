"""Public page metadata and indexing rules for the Botanic application."""

from html.parser import HTMLParser
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from . import api
from .models import Plant, Species


class BotanicDocument(HTMLParser):
    """Read rendered metadata and primary headings, including escaped values."""

    def __init__(self, response):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.metadata = {}
        self.meta_names = []
        self.canonicals = []
        self.headings = []
        self.main_headings = []
        self._in_title = False
        self._in_main = False
        self._heading = None
        self.feed(response.content.decode())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            name = attrs.get("name") or attrs.get("property")
            self.meta_names.append(name)
            self.metadata[name] = attrs.get("content", "")
        elif tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        elif tag == "main":
            self._in_main = True
        elif tag == "h1":
            self._heading = {"text": "", "in_main": self._in_main}

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._heading is not None:
            self._heading["text"] += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "main":
            self._in_main = False
        elif tag == "h1" and self._heading is not None:
            text = self._heading["text"].strip()
            self.headings.append(text)
            if self._heading["in_main"]:
                self.main_headings.append(text)
            self._heading = None


@override_settings(
    SITE_URL="https://portfolio.example.invalid/",
    LOGIN_REQUIRED=False,
    STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage",
    CACHES={
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
        "botanic": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
    },
)
class BotanicSeoTests(TestCase):
    site_url = "https://portfolio.example.invalid"
    private_markers = (
        "vertraulich-konto@example.test",
        "Privater-Testname-583",
        "Privater-Testraum-583",
        "Privater-Testhinweis-583",
    )
    foreign_markers = (
        "fremdes-konto@example.test",
        "Fremder-Testname-583",
        "Fremder-Testraum-583",
        "Fremder-Testhinweis-583",
    )

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username=self.private_markers[0], password="fictional-test-password"
        )
        self.species = Species.objects.create(
            taxon_id=999001,
            name='Beispielpflanze "Grün & Gold"',
            scientific_name="Specimen exemplaris",
            details_fetched_at=timezone.now(),
        )
        self.plant = Plant.objects.create(
            owner=self.user,
            species=self.species,
            nickname=self.private_markers[1],
            location=self.private_markers[2],
            notes=self.private_markers[3],
            next_watering=timezone.localdate(),
        )
        self.other_user = get_user_model().objects.create_user(
            username=self.foreign_markers[0]
        )
        Plant.objects.create(
            owner=self.other_user,
            species=self.species,
            nickname=self.foreign_markers[1],
            location=self.foreign_markers[2],
            notes=self.foreign_markers[3],
            next_watering=timezone.localdate(),
        )
        search_patch = patch(
            "botanic.api.search",
            return_value={
                "results": [self.species], "total": 1,
                "has_previous": False, "has_next": False,
            },
        )
        self.search = search_patch.start()
        self.addCleanup(search_patch.stop)
        species_patch = patch(
            "botanic.api.get_species", return_value=self.species
        )
        self.get_species = species_patch.start()
        self.addCleanup(species_patch.stop)

    def assert_metadata(self, response, *, canonical, robots, title=None):
        document = BotanicDocument(response)
        self.assertEqual(document.canonicals, [self.site_url + canonical])
        if title is not None:
            self.assertEqual(document.title, title)
        self.assertTrue(document.title.strip())
        self.assertTrue(document.metadata["description"].strip())
        self.assertEqual(document.meta_names.count("description"), 1)
        self.assertEqual(document.meta_names.count("robots"), 1)
        self.assertEqual(document.metadata["robots"], robots)
        self.assertEqual(response["X-Robots-Tag"], robots)
        for prefix in ("og", "twitter"):
            self.assertEqual(document.metadata[f"{prefix}:title"], document.title)
            self.assertEqual(
                document.metadata[f"{prefix}:description"],
                document.metadata["description"],
            )
            self.assertEqual(document.metadata[f"{prefix}:url"], document.canonicals[0])
        return document

    def assert_private_metadata(self, document):
        exposed_values = " ".join([
            document.title, *document.canonicals, *document.metadata.values()
        ])
        for marker in (*self.private_markers, *self.foreign_markers):
            self.assertNotIn(marker, exposed_values)

    def test_guest_collection_is_public_without_private_filters_or_records(self):
        for params in (
            {"tab": "plants"},
            {
                "tab": "plants", "q": self.private_markers[1],
                "location": self.private_markers[2], "page": "2", "utm_source": "example",
            },
        ):
            with self.subTest(params=params):
                response = self.client.get(reverse("botanic:index"), params)
                document = self.assert_metadata(
                    response, canonical="/botanic/?tab=plants", robots="index, follow",
                    title="Meine Pflanzen | ENBT Botanic | Beirit Digital",
                )
                self.assert_private_metadata(document)
                self.assertEqual(document.headings, ["Meine Pflanzen"])
                self.assertEqual(document.main_headings, ["Meine Pflanzen"])
                self.assertContains(response, "Pflanzen hinzufügen")
                self.assertContains(response, "Gießtermine")
                for marker in (*self.private_markers, *self.foreign_markers):
                    self.assertNotContains(response, marker)

    def test_member_collection_remains_private_and_only_contains_owner_records(self):
        self.client.force_login(self.user)
        params = {
            "tab": "plants", "q": self.private_markers[1],
            "location": self.private_markers[2], "page": "2", "utm_source": "example",
        }
        for filters in ({"tab": "plants"}, params):
            with self.subTest(filters=filters):
                response = self.client.get(reverse("botanic:index"), filters)
                document = self.assert_metadata(
                    response, canonical="/botanic/?tab=plants", robots="noindex, nofollow",
                    title="Meine Pflanzen | ENBT Botanic | Beirit Digital",
                )
                self.assert_private_metadata(document)
                self.assertEqual(document.headings, ["Meine Pflanzen"])
                self.assertEqual(document.main_headings, ["Meine Pflanzen"])
                self.assertContains(response, self.private_markers[1])
                self.assertContains(response, self.private_markers[2])
                for marker in self.foreign_markers:
                    self.assertNotContains(response, marker)

    def test_watering_remains_private_with_its_own_canonical(self):
        for authenticated in (False, True):
            with self.subTest(authenticated=authenticated):
                if authenticated:
                    self.client.force_login(self.user)
                response = self.client.get(reverse("botanic:index"), {
                    "tab": "watering", "filter": "all", "day": timezone.localdate().isoformat(),
                    "utm_source": "example",
                })
                document = self.assert_metadata(
                    response, canonical="/botanic/?tab=watering", robots="noindex, nofollow",
                    title="Gießplan | ENBT Botanic | Beirit Digital",
                )
                self.assert_private_metadata(document)

    def test_default_view_metadata_follows_the_actual_guest_or_member_view(self):
        guest = self.client.get(reverse("botanic:index"))
        self.assert_metadata(
            guest, canonical="/botanic/?tab=search", robots="index, follow"
        )
        self.client.force_login(self.user)
        member = self.client.get(reverse("botanic:index"))
        document = self.assert_metadata(
            member, canonical="/botanic/?tab=plants", robots="noindex, nofollow",
            title="Meine Pflanzen | ENBT Botanic | Beirit Digital",
        )
        self.assert_private_metadata(document)

    def test_public_search_preserves_content_parameters_and_drops_tracking(self):
        searches = (
            ({"tab": "search", "q": "Monstera", "page": "1", "utm_source": "example"},
             "/botanic/?tab=search"),
            ({"tab": "search", "q": "Grün & Gold", "page": "2", "utm_source": "example"},
             "/botanic/?tab=search&q=Gr%C3%BCn+%26+Gold&page=2"),
            ({"tab": "search", "q": "Pilea", "page": "1", "source": "example"},
             "/botanic/?tab=search&q=Pilea"),
        )
        for params, canonical in searches:
            with self.subTest(params=params):
                response = self.client.get(reverse("botanic:index"), params)
                self.assert_metadata(response, canonical=canonical, robots="index, follow")

    def test_public_species_metadata_is_escaped_and_keeps_the_species_canonical(self):
        path = reverse("botanic:species", args=[self.species.pk])
        for authenticated in (False, True):
            with self.subTest(authenticated=authenticated):
                if authenticated:
                    self.client.force_login(self.user)
                response = self.client.get(path, {"utm_source": "example"})
                document = self.assert_metadata(
                    response, canonical=path, robots="index, follow",
                    title=f"{self.species.name} | ENBT Botanic | Beirit Digital",
                )
                self.assertIn(self.species.scientific_name, document.metadata["description"])
                self.assertEqual(document.headings, [self.species.name])
                self.assertEqual(document.main_headings, [self.species.name])

    def test_private_edit_metadata_does_not_publish_personal_plant_details(self):
        self.client.force_login(self.user)
        path = reverse("botanic:edit", args=[self.plant.pk])
        response = self.client.get(path, {"q": self.private_markers[1]})
        self.assertContains(response, self.private_markers[1])
        document = self.assert_metadata(
            response, canonical=path, robots="noindex, nofollow",
            title="Pflanze bearbeiten | ENBT Botanic | Beirit Digital",
        )
        self.assert_private_metadata(document)

    def test_weather_keeps_its_private_indexing_policy(self):
        path = reverse("botanic:weather")
        response = self.client.get(path, {"location": self.private_markers[2]})
        document = self.assert_metadata(
            response, canonical=path, robots="noindex, nofollow"
        )
        self.assert_private_metadata(document)

    def test_upstream_errors_are_not_indexable_even_when_search_returns_http_200(self):
        self.search.side_effect = api.ApiError("Fiktive Pflanzenquelle nicht verfügbar.")
        search = self.client.get(reverse("botanic:index"), {"tab": "search"})
        self.assertEqual(search.status_code, 200)
        self.assert_metadata(
            search, canonical="/botanic/?tab=search", robots="noindex, nofollow"
        )
        self.get_species.side_effect = api.ApiError("Fiktive Pflanzenquelle nicht verfügbar.")
        path = reverse("botanic:species", args=[self.species.pk])
        species = self.client.get(path)
        self.assertEqual(species.status_code, 503)
        self.assert_metadata(species, canonical=path, robots="noindex, nofollow")

    def test_invalid_search_forms_are_not_indexable(self):
        for invalid in ({"q": "x"}, {"q": "Pilea", "page": "21"}):
            with self.subTest(invalid=invalid):
                response = self.client.get(reverse("botanic:index"), {"tab": "search", **invalid})
                document = BotanicDocument(response)
                self.assertEqual(document.metadata["robots"], "noindex, nofollow")
                self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
        self.search.assert_not_called()

    def test_invalid_add_and_edit_posts_keep_personal_form_data_out_of_metadata(self):
        self.client.force_login(self.user)
        data = {
            "nickname": self.private_markers[1], "location": self.private_markers[2],
            "notes": self.private_markers[3], "watering_interval": "0",
            "next_watering": timezone.localdate().isoformat(),
        }
        paths = (
            reverse("botanic:add", args=[self.species.pk]),
            reverse("botanic:edit", args=[self.plant.pk]),
        )
        for path in paths:
            with self.subTest(path=path):
                response = self.client.post(path, data)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'aria-invalid="true"')
                document = BotanicDocument(response)
                self.assertEqual(document.metadata["robots"], "noindex, nofollow")
                self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
                self.assert_private_metadata(document)
