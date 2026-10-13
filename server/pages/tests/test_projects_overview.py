import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.template.loader import render_to_string
from django.test import SimpleTestCase, TestCase, override_settings

from pages.models import Project
from pages.projects_overview import build_projects_overview, projects_presentation_catalog


def sample_catalog():
    nav = dict(home="Home", portfolio="Projects", skills="Skills", aboutLink="About", contact="Contact", menu="Menu", menuOpen="Open menu", menuClose="Close menu")
    footer = dict(business="Example portfolio", location="Online", scrollTop="Back to top", links=dict(contact="Contact", imprint="Imprint", privacy="Privacy"))
    copy = dict(title="Projects", intro="Example projects", details="Details", live="View", technologies="Technologies", empty="No projects")
    return {
        "schemaVersion": 1,
        "imageSizes": "100vw",
        "covers": {"demo": dict(src="/static/demo.webp", srcSet="/static/demo-480.webp 480w, /static/demo.webp 1254w", label="Cover", variant="cover", width=1254, height=1254)},
        "technologies": [
            dict(name="JavaScript", aliases=["JS"], logo="js.svg", rank=0),
            dict(name="React", aliases=[], logo="react.svg", rank=1),
            dict(name="Django", aliases=[], logo="django.svg", rank=2),
        ],
        "glossary": {"de": [dict(pattern="django", flags="i", text="Django explanation")]},
        "locales": {
            language: dict(nav=nav, footer=footer, brand="Example portfolio", copy=copy, items=[dict(slug="demo", title=f"{language} title", text=f"{language} description", type=f"{language} type", status=f"{language} status")])
            for language in ("de", "ru", "uk")
        },
        "projectOverrides": {"sprachdienstleistungen": {language: dict(status=f"{language} case study", href="/deutschlive/", liveUrl="", localHref="") for language in ("de", "ru", "uk")}},
    }


class ProjectsOverviewPresentationTests(SimpleTestCase):
    def test_current_german_content_uses_locale_type_and_canonical_cover(self):
        overview = build_projects_overview([
            dict(slug="empty-image", title="Without image", sortOrder=0),
            dict(slug="demo", title="Current title", text="Current description", type="Database type", status="Current status", images=[dict(src="/old.webp", label="Old image")], sortOrder=1),
        ], catalog=sample_catalog())
        card = overview["cards"][1]
        self.assertEqual((card["title"], card["text"], card["type"], card["status"]), ("Current title", "Current description", "de type", "Current status"))
        self.assertIsNone(overview["cards"][0]["image"])
        self.assertEqual(card["image"]["src"], "/static/demo.webp")
        self.assertEqual(card["image"]["alt"], "Current title - Cover")
        self.assertTrue(card["image"]["eager"])
        self.assertEqual(card["image"]["sizes"], "100vw")

    def test_localized_projects_keep_server_order_and_native_links(self):
        source = [
            dict(slug="demo", title="ZZ", text="Database", sortOrder=2, orderIndex=1, liveUrl="https://demo.example.invalid/"),
            dict(slug="custom", title="AA", sortOrder=2, orderIndex=0, liveUrl="/custom-demo/", images=[dict(src="/custom.webp", label="Screenshot")]),
            dict(slug="case", title="Case", category="case", liveUrl="https://example.invalid/", sortOrder=3),
        ]
        for language in ("ru", "uk"):
            with self.subTest(language=language):
                cards = build_projects_overview(source, language, catalog=sample_catalog())["cards"]
                self.assertEqual([card["slug"] for card in cards], ["custom", "demo", "case"])
                self.assertEqual((cards[1]["title"], cards[1]["text"], cards[1]["status"]), (f"{language} title", f"{language} description", f"{language} status"))
                self.assertEqual(cards[1]["detailHref"], "/projekte/demo")
                self.assertTrue(cards[1]["liveExternal"])
                self.assertFalse(cards[0]["liveExternal"])
                self.assertEqual(cards[2]["liveHref"], "")
                self.assertEqual(cards[0]["image"]["width"], 960)

    def test_integrated_records_and_unpublished_projects_do_not_return(self):
        records = [dict(slug=slug, title=slug) for slug in ("vokabelbox", "wetter", "musikplayer", "deutschlive")]
        records += [dict(slug="draft", title="Draft", published=False), dict(slug="invalid", title=" "), dict(slug="sprachdienstleistungen", title="Platform", liveUrl="/old/")]
        cards = build_projects_overview(records, "uk", catalog=sample_catalog())["cards"]
        self.assertEqual([card["slug"] for card in cards], ["sprachdienstleistungen"])
        self.assertEqual(cards[0]["status"], "uk case study")
        self.assertEqual(cards[0]["liveHref"], "/deutschlive/")

    def test_technology_aliases_duplicates_and_unknown_labels(self):
        records = [dict(slug="test", title="Test", technologies=["Django / React", "JS", "JavaScript", {"title": "Example Tool"}, "React"])]
        tags = build_projects_overview(records, catalog=sample_catalog())["cards"][0]["technologyTags"]
        self.assertEqual([tag["label"] for tag in tags], ["JavaScript", "React", "Django", "Example Tool"])
        self.assertEqual(tags[0]["logo"], "/static/images/js.svg")
        self.assertEqual(tags[-1]["logo"], "")

    def test_all_user_content_is_escaped_in_the_html_and_links_are_safe(self):
        records = [dict(slug="example", title='<img src=x onerror="example"> Django', text='</p><script>example</script>', status="<strong>Sample</strong>", liveUrl="https://example.invalid/?x=%22")]
        overview = build_projects_overview(records, catalog=sample_catalog())
        document = render_to_string("pages/projects_overview.html", {"overview": overview})
        self.assertIn("&lt;img src=x onerror=&quot;example&quot;&gt; Django", document)
        self.assertIn("&lt;/p&gt;&lt;script&gt;example&lt;/script&gt;", document)
        self.assertNotIn("<script>", document)
        self.assertIn('target="_blank" rel="noopener noreferrer"', document)
        self.assertIn('data-project-tooltip="Django explanation"', document)
        self.assertIn('data-projects-rendered', document)

    def test_empty_published_list_is_rendered_without_fictional_fallback_cards(self):
        overview = build_projects_overview([], catalog=sample_catalog())
        document = render_to_string("pages/projects_overview.html", {"overview": overview})
        self.assertIn('class="project-overview__empty">No projects</p>', document)
        self.assertNotIn('class="project-overview-card ', document)

    def test_catalog_reloads_after_a_build_and_missing_build_uses_client_fallback(self):
        with TemporaryDirectory(prefix="beirit-projects-catalog-") as directory:
            path = Path(directory) / "assets/portfolio-dist/.vite/projects-presentation.json"
            path.parent.mkdir(parents=True)
            with override_settings(SERVER_DIR=Path(directory)):
                self.assertIsNone(projects_presentation_catalog())
                self.assertIsNone(build_projects_overview([]))
                catalog = sample_catalog()
                path.write_text(json.dumps(catalog), encoding="utf-8")
                self.assertEqual(projects_presentation_catalog()["imageSizes"], "100vw")
                catalog["imageSizes"] = "(min-width: 768px) 50vw, 100vw"
                path.write_text(json.dumps(catalog), encoding="utf-8")
                self.assertEqual(projects_presentation_catalog()["imageSizes"], catalog["imageSizes"])


@override_settings(LOGIN_REQUIRED=False)
class ProjectsOverviewDocumentTests(TestCase):
    def setUp(self):
        Project.objects.all().delete()

    def test_published_content_is_in_the_initial_document(self):
        Project.objects.create(title="Django sample", slug="sample", published=True, short_description="Visible before JavaScript", technologies="Django, React")
        response = self.client.get("/projekte", HTTP_ACCEPT_LANGUAGE="de-DE")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-projects-rendered')
        self.assertContains(response, '<h2>Django sample')
        self.assertContains(response, "Visible before JavaScript")
        self.assertContains(response, 'href="/projekte/sample"')
        self.assertContains(response, 'class="page-is-loaded"')
        self.assertNotContains(response, "Bitte aktivieren Sie JavaScript")
        self.assertNotContains(response, "preact-vendor-")

    def test_initial_language_is_localized_by_the_browser_header(self):
        Project.objects.create(title="Notenrechner", slug="notenrechner", published=True, short_description="Sample")
        for language, title in (("ru-RU", "Калькулятор оценок"), ("uk-UA", "Калькулятор оцінок")):
            with self.subTest(language=language):
                response = self.client.get("/projekte", HTTP_ACCEPT_LANGUAGE=language)
                self.assertContains(response, title)
                self.assertContains(response, f'lang="{language[:2]}"')
