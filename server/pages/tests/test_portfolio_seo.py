import json
from html.parser import HTMLParser
from xml.etree import ElementTree

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse

from pages.models import Project


class PortfolioDocument(HTMLParser):
    """Read public metadata and script contents as a browser sees them."""

    def __init__(self, response):
        super().__init__()
        self.title = ""
        self.metadata = {}
        self.links = []
        self.scripts = []
        self._script = None
        self._in_title = False
        self.feed(response.content.decode())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            self.metadata[attrs.get("name") or attrs.get("property")] = attrs.get("content", "")
        elif tag == "link":
            self.links.append(attrs)
        elif tag == "script":
            self._script = {"attrs": attrs, "content": ""}
            self.scripts.append(self._script)

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._script is not None:
            self._script["content"] += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script":
            self._script = None

    @property
    def canonical(self):
        return next(link["href"] for link in self.links if link.get("rel") == "canonical")

    @property
    def config(self):
        return json.loads(next(
            script["content"] for script in self.scripts
            if script["attrs"].get("id") == "beirit-home-config-data"
        ))

    @property
    def graph(self):
        return json.loads(next(
            script["content"] for script in self.scripts
            if script["attrs"].get("type") == "application/ld+json"
        ))["@graph"]


@override_settings(
    SITE_URL="https://portfolio.example.invalid",
    LOGIN_REQUIRED=False,
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class PortfolioSeoTests(TestCase):
    site_url = "https://portfolio.example.invalid"

    def setUp(self):
        # Data migrations seed projects; each test specifies its public records.
        Project.objects.all().delete()

    def create_project(self, slug, **overrides):
        values = {
            "title": "Projektbeispiel",
            "short_description": "Fallstudie eines Django-Projekts mit öffentlichem Quellcode.",
            "technologies": "Django, Python, React",
            "published": True,
        }
        values.update(overrides)
        return Project.objects.create(slug=slug, **values)

    def document(self, path):
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        return PortfolioDocument(response)

    def test_main_routes_share_portfolio_metadata_with_client_configuration(self):
        routes = {
            "/": "Beirit Web | Portfolio für Web- und Softwareentwicklung",
            "/kompetenzen": "Technologien und Kompetenzen | Beirit Web",
            "/projekte": "Web- und Softwareprojekte | Beirit Web",
            "/ueber-mich": "Über mich | Beirit Web",
            "/kontakt": "Kontakt | Beirit Web",
        }
        for path, expected_title in routes.items():
            with self.subTest(path=path):
                document = self.document(f"{path}?utm_source=portfolio")
                page_meta = document.config["pageMeta"]
                self.assertEqual(document.title, expected_title)
                self.assertEqual(page_meta["title"], expected_title)
                self.assertEqual(document.metadata["og:title"], expected_title)
                self.assertEqual(document.metadata["twitter:title"], expected_title)
                for name in ("description", "og:description", "twitter:description"):
                    self.assertEqual(document.metadata[name], page_meta["description"])
                    self.assertTrue(document.metadata[name])
                self.assertEqual(document.canonical, f"{self.site_url}{path}")
                self.assertEqual(document.metadata["og:url"], document.canonical)
                self.assertEqual(document.metadata["twitter:url"], document.canonical)
                self.assertEqual(page_meta["canonical"], document.canonical)
                self.assertEqual(document.metadata["robots"], "index, follow")
                self.assertEqual(document.metadata["keywords"], page_meta["keywords"])
                self.assertIn("Portfolio", page_meta["keywords"])
                self.assertNotIn("erstellen lassen", page_meta["keywords"])
                self.assertFalse(any(link.get("hreflang") for link in document.links))

        homepage = self.document("/")
        self.assertEqual(
            homepage.metadata["description"],
            "Portfolio mit Webanwendungen, Softwareprojekten und technischen Fallstudien auf Basis von React, Django und Python.",
        )

    def test_person_profile_describes_the_owner_only_on_about_page(self):
        about = self.document("/ueber-mich/")
        profile = next(entry for entry in about.graph if entry["@type"] == "ProfilePage")
        self.assertEqual(profile["url"], f"{self.site_url}/ueber-mich")
        self.assertEqual(profile["mainEntity"]["@type"], "Person")
        self.assertEqual(profile["mainEntity"]["name"], "Eugen Beirit")
        self.assertNotIn("address", profile["mainEntity"])
        self.assertNotIn("telephone", profile["mainEntity"])

        for path in ("/", "/kompetenzen", "/projekte", "/kontakt"):
            with self.subTest(path=path):
                graph = self.document(path).graph
                serialized = json.dumps(graph)
                for forbidden in ("Person", "LocalBusiness", "ProfessionalService", "FAQPage", "priceRange", "PostalAddress"):
                    self.assertNotIn(f'"{forbidden}"', serialized)
                website = next(entry for entry in graph if entry["@type"] == "WebSite")
                self.assertEqual(website["url"], f"{self.site_url}/")
        self.assertTrue(any(entry["@type"] == "ContactPage" for entry in self.document("/kontakt").graph))

    def test_project_collection_lists_only_published_independent_projects(self):
        later = self.create_project("zweites-projekt", title="Zweites Projekt", sort_order=20)
        first = self.create_project("erstes-projekt", title="Erstes Projekt", sort_order=10)
        self.create_project("geheimer-entwurf", title="Privater Entwurf", published=False)
        for slug in ("vokabelbox", "wetter", "musikplayer", "deutschlive"):
            self.create_project(slug, title=f"Integriertes Modul {slug}", sort_order=0)

        document = self.document("/projekte/")
        collection = next(entry for entry in document.graph if entry["@type"] == "CollectionPage")
        self.assertEqual(collection["mainEntity"]["@type"], "ItemList")
        items = collection["mainEntity"]["itemListElement"]
        self.assertEqual([item["position"] for item in items], [1, 2])
        self.assertEqual([item["item"]["name"] for item in items], [first.title, later.title])
        self.assertEqual([item["item"]["url"] for item in items], [
            f"{self.site_url}/projekte/erstes-projekt",
            f"{self.site_url}/projekte/zweites-projekt",
        ])
        self.assertTrue(all(item["item"]["@type"] == "CreativeWork" for item in items))

    def test_project_details_and_legacy_aliases_publish_one_canonical_creative_work(self):
        project = self.create_project("detailprojekt", title="Öffentliche Fallstudie")
        for path in (
            "/projekte/detailprojekt",
            "/projekte/detailprojekt/",
            "/referenzen/detailprojekt",
            "/referenzen/detailprojekt/",
        ):
            with self.subTest(path=path):
                document = self.document(f"{path}?source=legacy")
                self.assertEqual(document.canonical, f"{self.site_url}/projekte/detailprojekt")
                self.assertEqual(document.metadata["og:url"], document.canonical)
                self.assertEqual(document.config["pageMeta"]["canonical"], document.canonical)
                page = next(entry for entry in document.graph if entry["@type"] == "WebPage")
                work = page["mainEntity"]
                self.assertEqual(page["url"], document.canonical)
                self.assertEqual(work["@type"], "CreativeWork")
                self.assertEqual(work["name"], project.title)
                self.assertEqual(work["description"], project.short_description)
                self.assertEqual(work["keywords"], project.technologies)
                self.assertEqual(work["url"], document.canonical)

    def test_missing_and_unpublished_projects_are_noindexed_without_leaking_draft_content(self):
        self.create_project("privater-entwurf", title="Interner unveröffentlichter Titel", published=False)
        for slug in ("unbekanntes-projekt", "privater-entwurf"):
            with self.subTest(slug=slug):
                document = self.document(f"/projekte/{slug}")
                self.assertEqual(document.metadata["robots"], "noindex, follow")
                self.assertEqual(document.config["pageMeta"]["robots"], "noindex, follow")
                self.assertEqual(document.title, "Projekt nicht gefunden | Beirit Web")
                self.assertNotIn("Interner unveröffentlichter Titel", json.dumps(document.graph))
                page = next(entry for entry in document.graph if entry["@type"] == "WebPage")
                self.assertNotIn("mainEntity", page)

    def test_sitemap_contains_only_primary_canonical_pages_and_published_project_details(self):
        visible = self.create_project("sichtbare-fallstudie")
        self.create_project("entwurf", published=False)
        for slug in ("vokabelbox", "wetter", "musikplayer", "deutschlive"):
            self.create_project(slug)

        response = self.client.get(reverse("pages:sitemap_xml"))
        self.assertEqual(response.status_code, 200)
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        entries = ElementTree.fromstring(response.content).findall("s:url", namespace)
        locations = [entry.findtext("s:loc", namespaces=namespace) for entry in entries]
        self.assertCountEqual(locations, [
            f"{self.site_url}/",
            f"{self.site_url}/kompetenzen",
            f"{self.site_url}/projekte",
            f"{self.site_url}/ueber-mich",
            f"{self.site_url}/kontakt",
            f"{self.site_url}/projekte/sichtbare-fallstudie",
            *[f"{self.site_url}/vokabelbox/?lang={language}" for language in ("de", "ru", "uk")],
            *[
                f"{self.site_url}/deutschlive{path}"
                for path in (
                    "/", "/learn", "/quiz", "/writing", "/manual",
                    "/impressum", "/datenschutz", "/nutzungsbedingungen", "/kontakt",
                )
            ],
        ])
        self.assertEqual(len(locations), len(set(locations)))
        detail = next(entry for entry in entries if entry.findtext("s:loc", namespaces=namespace).endswith("/sichtbare-fallstudie"))
        self.assertEqual(detail.findtext("s:lastmod", namespaces=namespace), visible.updated_at.date().isoformat())

    def test_project_json_scripts_preserve_special_text_without_injecting_markup(self):
        title = 'Django </script><script id="injected">alert(1)</script> & Beispiel'
        self.create_project("sonderzeichen", title=title, short_description="Fallstudie <API> & React")
        document = self.document("/projekte/sonderzeichen")
        page = next(entry for entry in document.graph if entry["@type"] == "WebPage")
        self.assertEqual(page["mainEntity"]["name"], title)
        self.assertEqual(document.title, f"{title} | Projekte | Beirit Web")
        self.assertEqual(document.config["pageMeta"]["title"], document.title)
        self.assertEqual(document.metadata["og:title"], document.title)
        self.assertFalse(any(script["attrs"].get("id") == "injected" for script in document.scripts))
        schema_scripts = [script for script in document.scripts if script["attrs"].get("type") == "application/ld+json"]
        self.assertEqual(len(schema_scripts), 1)
        self.assertNotIn("</script>", schema_scripts[0]["content"].lower())

    def test_legal_pages_have_explicit_indexing_policy_and_no_business_schema(self):
        for route_name, robots in (
            ("pages:imprint", "index, follow"),
            ("pages:privacy", "index, follow"),
            ("pages:legal", "index, follow"),
        ):
            with self.subTest(route_name=route_name):
                document = self.document(reverse(route_name))
                self.assertEqual(document.metadata["robots"], robots)
                self.assertIn("Muster-", document.title)
                self.assertFalse(any(script["attrs"].get("type") == "application/ld+json" for script in document.scripts))
