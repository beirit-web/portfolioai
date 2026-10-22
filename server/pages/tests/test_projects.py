from importlib import import_module
import json
from types import SimpleNamespace

from django.apps import apps
from django.contrib.staticfiles import finders
from django.db import connection
from django.test import TestCase, override_settings
from django.urls import reverse

from pages.models import Project


class ProjectPortfolioTests(TestCase):
    def test_case_study_refresh_corrects_sample_content_and_preserves_custom_edits(self):
        migration = import_module("pages.migrations.0050_refresh_portfolio_case_studies")
        contract = self.create_project(
            slug="vertragsgenerator",
            description=migration.CONTRACT_FIELDS["description"][0],
            implementation="Eigene Beschreibung der Umsetzung",
        )
        platform = self.create_project(
            slug="sprachdienstleistungen", status="live", status_label="Live",
            short_description=migration.OLD_PLATFORM_INTRO + " Mit DeutschLive.",
            description="Individuell gepflegte Fallstudie",
        )
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        contract.refresh_from_db()
        platform.refresh_from_db()
        self.assertEqual(contract.description, migration.CONTRACT_FIELDS["description"][1])
        self.assertEqual(contract.implementation, "Eigene Beschreibung der Umsetzung")
        self.assertEqual(platform.status_label, "Portfolio-Fallstudie")
        self.assertEqual(platform.short_description, migration.NEW_PLATFORM_INTRO + " Mit DeutschLive.")
        self.assertEqual(platform.description, "Individuell gepflegte Fallstudie")

    @override_settings(LOGIN_REQUIRED=False)
    def test_grade_calculator_uses_standalone_assets_and_local_links(self):
        project = self.create_project(slug="notenrechner", technologies="React, TypeScript", live_url="/deutschlive/grades")
        migration = import_module("pages.migrations.0049_standalone_grade_calculator")
        migration.forwards(apps, SimpleNamespace(connection=connection))
        rename_migration = import_module("pages.migrations.0051_rename_portfolio_assets")
        rename_migration.forwards(apps, SimpleNamespace(connection=connection))
        project.refresh_from_db()
        self.assertEqual(project.technology_list, ["HTML", "CSS", "JavaScript"])
        self.assertEqual(project.live_url, "/static/portfolio/notenrechner/index.html")
        self.assertIsNotNone(finders.find("portfolio/notenrechner/index.html"))
        for path in ("/deutschlive/grades", "/deutschlive/grades/", "/deutschLive/grades"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 302)
            self.assertEqual(response["Location"], project.live_url)

    @override_settings(LOGIN_REQUIRED=False)
    def test_housing_project_links_use_django_before_and_after_migration(self):
        housing = self.create_project(slug="wohnungssuche-bodensee", live_url="/static/portfolio/wohnungssuche/index.html")
        custom = self.create_project(slug="custom-housing", live_url="https://demo.example.invalid/housing/")
        projects = self.client.get(reverse("pages:projects_api")).json()["projects"]
        self.assertEqual(next(p for p in projects if p["slug"] == housing.slug)["liveUrl"], "/wohnungssuche/")
        migration = import_module("pages.migrations.0055_housing_django_url")
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        housing.refresh_from_db()
        custom.refresh_from_db()
        self.assertEqual(housing.live_url, "/wohnungssuche/")
        self.assertEqual(custom.live_url, "https://demo.example.invalid/housing/")

    def test_asset_renaming_preserves_custom_project_metadata(self):
        migration = import_module("pages.migrations.0051_rename_portfolio_assets")
        legacy = self.create_project(
            live_url="/static/portfolio/test-main/index.html",
            image_url="/static/images/portfolio-test-main-desktop.webp",
        )
        custom = self.create_project(
            live_url="https://demo.example.invalid/noten/",
            image_url="/media/projects/eigenes-bild.webp",
            description="Eigene Projektbeschreibung",
        )
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        legacy.refresh_from_db()
        custom.refresh_from_db()
        self.assertEqual(legacy.live_url, "/static/portfolio/notenrechner/index.html")
        self.assertEqual(legacy.image_url, "/static/images/portfolio-notenrechner-desktop.webp")
        self.assertEqual(custom.live_url, "https://demo.example.invalid/noten/")
        self.assertEqual(custom.image_url, "/media/projects/eigenes-bild.webp")
        self.assertEqual(custom.description, "Eigene Projektbeschreibung")

    @override_settings(LOGIN_REQUIRED=False)
    def test_api_uses_canonical_asset_names_before_data_migration(self):
        self.create_project(
            live_url="/static/portfolio/test-main/index.html",
            image_url="/static/images/portfolio-test-main-desktop.webp",
        )
        project = self.client.get(reverse("pages:projects_api")).json()["projects"][0]
        self.assertEqual(project["liveUrl"], "/static/portfolio/notenrechner/index.html")
        self.assertEqual(project["image"], "/static/images/portfolio-notenrechner-desktop.webp")

    @override_settings(LOGIN_REQUIRED=False)
    def test_deutschlive_redirects_to_platform_and_migration_is_idempotent(self):
        child = self.create_project(slug="deutschlive", featured=True)
        platform = self.create_project(slug="sprachdienstleistungen", description="Eigene Beschreibung", features="Vokabelbox")
        migration = import_module("pages.migrations.0047_integrate_deutschlive_into_language_platform")
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        child.refresh_from_db()
        platform.refresh_from_db()
        self.assertFalse(child.published)
        self.assertFalse(child.featured)
        self.assertIn("Eigene Beschreibung", platform.description)
        self.assertIn("kein Audio-Upload", platform.description)
        self.assertEqual(platform.features.count("DeutschLive"), 1)
        for prefix in ("/projekte", "/referenzen"):
            for suffix in ("", "/"):
                response = self.client.get(f"{prefix}/deutschlive{suffix}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/projekte/sprachdienstleistungen/#deutschlive")

    @override_settings(LOGIN_REQUIRED=False)
    def test_music_player_and_deutschlive_are_language_platform_modules(self):
        self.create_project(slug="musikplayer", featured=True)
        self.create_project(slug="deutschlive", featured=True)
        platform = self.create_project(slug="sprachdienstleistungen", featured=True)
        payload = self.client.get(reverse("pages:projects_api")).json()
        for key in ("projects", "featuredProjects"):
            self.assertEqual([item["slug"] for item in payload[key]], [platform.slug])
        for prefix in ("/projekte", "/referenzen"):
            for suffix in ("", "/"):
                response = self.client.get(f"{prefix}/musikplayer{suffix}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/projekte/sprachdienstleistungen/#musikplayer")

    def test_music_player_migration_preserves_descriptions_and_is_idempotent(self):
        migration = import_module("pages.migrations.0046_integrate_music_player_into_deutschlive")
        player = self.create_project(slug="musikplayer", featured=True)
        platform = self.create_project(slug="deutschlive", description="Eigene Lernplattform", features="Quiz")
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        player.refresh_from_db()
        platform.refresh_from_db()
        self.assertFalse(player.published)
        self.assertFalse(player.featured)
        self.assertIn("Eigene Lernplattform", platform.description)
        self.assertIn("nicht auf den Server", platform.description)
        self.assertEqual(platform.features.count("Audioplayer"), 1)

    @override_settings(LOGIN_REQUIRED=False)
    def test_weather_api_and_old_project_links_use_botanic(self):
        self.create_project(title="Wetter", slug="wetter", featured=True)
        botanic = self.create_project(title="ENBT Botanic", slug="enbt-botanic", featured=True)
        payload = self.client.get(reverse("pages:projects_api")).json()
        for key in ("projects", "featuredProjects"):
            self.assertEqual([item["slug"] for item in payload[key]], [botanic.slug])
        for prefix in ("/projekte", "/referenzen"):
            for suffix in ("", "/"):
                response = self.client.get(f"{prefix}/wetter{suffix}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/projekte/enbt-botanic/#wetter")

    def test_weather_migration_keeps_botanic_content_and_is_idempotent(self):
        migration = import_module("pages.migrations.0045_integrate_weather_into_botanic")
        weather = self.create_project(slug="wetter", featured=True)
        botanic = self.create_project(slug="enbt-botanic", description="Eigene Beschreibung", features="Pflanzensuche")
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        weather.refresh_from_db()
        botanic.refresh_from_db()
        self.assertFalse(weather.published)
        self.assertFalse(weather.featured)
        self.assertIn("Eigene Beschreibung", botanic.description)
        self.assertEqual(botanic.features.count("Wettermodul"), 1)
        self.assertEqual(botanic.implementation.count("Wettermodul"), 1)
        self.assertIn("Wettermodul", botanic.short_description)

    def setUp(self):
        Project.objects.all().delete()

    def create_project(self, **overrides):
        index = Project.objects.count() + 1
        data = {
            "title": f"Projekt {index}",
            "slug": f"projekt-{index}",
            "short_description": "Kurze Beschreibung",
            "category": "Tools",
            "status": Project.STATUS_DEMO,
            "published": True,
            "featured": False,
            "sort_order": index,
        }
        data.update(overrides)
        return Project.objects.create(**data)

    @override_settings(LOGIN_REQUIRED=False)
    def test_shop_preview_migration_updates_both_api_image_fields(self):
        migration = import_module("pages.migrations.0043_shop_preview_image")
        project = self.create_project(slug="online-shop", image_url=migration.OLD_URL,
                                      image_alt=migration.OLD_ALT, featured=True)
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        project.refresh_from_db()
        self.assertEqual(project.image_url, migration.NEW_URL)
        self.assertEqual(project.image_alt, migration.NEW_ALT)
        self.assertIsNotNone(finders.find(migration.NEW_URL.removeprefix("/static/")))
        payload = self.client.get(reverse("pages:projects_api")).json()
        for key in ("projects", "featuredProjects"):
            self.assertEqual(payload[key][0]["image"], migration.NEW_URL)
            self.assertEqual(payload[key][0]["images"][0]["src"], migration.NEW_URL)
        migration.backwards(apps, editor)
        project.refresh_from_db()
        self.assertEqual(project.image_url, migration.OLD_URL)
        self.assertEqual(project.image_alt, migration.OLD_ALT)

    def test_shop_preview_migration_preserves_custom_images_and_other_projects(self):
        migration = import_module("pages.migrations.0043_shop_preview_image")
        editor = SimpleNamespace(connection=connection)
        project = self.create_project(slug="online-shop", image_url="/media/custom-shop.webp", image_alt="Custom")
        other = self.create_project(image_url=migration.OLD_URL)
        migration.forwards(apps, editor)
        project.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(project.image_url, "/media/custom-shop.webp")
        self.assertEqual(project.image_alt, "Custom")
        self.assertEqual(other.image_url, migration.OLD_URL)
        project.image_url = migration.OLD_URL
        project.image = "projects/custom-shop.webp"
        project.save()
        migration.forwards(apps, editor)
        project.refresh_from_db()
        self.assertEqual(project.image_url, migration.OLD_URL)
        self.assertEqual(project.image.name, "projects/custom-shop.webp")

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_api_returns_only_published_projects(self):
        visible = self.create_project(title="Sichtbar", slug="sichtbar")
        self.create_project(title="Entwurf", slug="entwurf", published=False)

        response = self.client.get(reverse("pages:projects_api"))

        self.assertEqual(response.status_code, 200)
        titles = [project["title"] for project in response.json()["projects"]]
        self.assertEqual(titles, [visible.title])

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_api_limits_featured_projects_to_six(self):
        for index in range(8):
            self.create_project(
                title=f"Featured {index}",
                slug=f"featured-{index}",
                featured=True,
                sort_order=index,
            )

        response = self.client.get(reverse("pages:projects_api"))

        self.assertEqual(response.status_code, 200)
        featured = response.json()["featuredProjects"]
        self.assertEqual(len(featured), 6)
        self.assertEqual([project["slug"] for project in featured], [f"featured-{index}" for index in range(6)])

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_api_exposes_live_and_github_only_when_saved(self):
        self.create_project(
            title="Mit Links",
            slug="mit-links",
            live_url="https://example.com/live",
            github_url="https://github.com/example/project",
        )
        self.create_project(title="Ohne Links", slug="ohne-links")

        response = self.client.get(reverse("pages:projects_api"))

        projects = {project["slug"]: project for project in response.json()["projects"]}
        self.assertEqual(projects["mit-links"]["liveUrl"], "https://example.com/live")
        self.assertEqual(projects["mit-links"]["githubUrl"], "https://github.com/example/project")
        self.assertEqual(projects["ohne-links"]["liveUrl"], "")
        self.assertEqual(projects["ohne-links"]["githubUrl"], "")

    @override_settings(LOGIN_REQUIRED=False)
    def test_project_pages_are_served_for_new_and_legacy_urls(self):
        self.create_project(title="Detailprojekt", slug="detailprojekt")

        canonical = self.client.get(reverse("pages:project_detail_page", kwargs={"project_slug": "detailprojekt"}))
        legacy = self.client.get(reverse("pages:reference_project_page", kwargs={"project_slug": "detailprojekt"}))

        self.assertEqual(canonical.status_code, 200)
        self.assertEqual(legacy.status_code, 200)
        self.assertContains(canonical, "Detailprojekt | Projekte | Beirit Web")

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_page_uses_expected_meta_description(self):
        response = self.client.get(reverse("pages:projects_page"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Web- und Softwareprojekte | Beirit Web")
        self.assertContains(
            response,
            "Webanwendungen, Django-Projekte und Python-Tools mit technischen Einblicken und Live-Demos.",
        )

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_page_embeds_the_same_published_records_and_order_as_the_api(self):
        self.create_project(title="Zulu", slug="zulu", sort_order=5, image_url="/static/images/zulu.webp")
        self.create_project(title="Äpfel", slug="apfel", sort_order=5, featured=True)
        self.create_project(title="Entwurf", slug="entwurf", published=False, sort_order=0)
        self.create_project(title="Wetter", slug="wetter", sort_order=0)

        response = self.client.get(reverse("pages:projects_page"))
        api_projects = self.client.get(reverse("pages:projects_api")).json()["projects"]

        self.assertEqual(response.context["react_home_config"]["initialProjects"], api_projects)
        self.assertEqual([item["slug"] for item in api_projects], ["zulu", "apfel"])
        self.assertEqual([item["orderIndex"] for item in api_projects], [0, 1])
        self.assertEqual(response.context["react_project_image_preload"], {"src": "/static/images/zulu.webp"})

    @override_settings(LOGIN_REQUIRED=False)
    def test_overview_preload_uses_the_first_displayed_cover_with_responsive_sources(self):
        self.create_project(title="Ohne Bild", slug="ohne-bild", sort_order=0)
        self.create_project(slug="online-shop", sort_order=1, image_url="/static/images/shop-screenshot.webp")

        response = self.client.get(reverse("pages:projects_page"))
        preload = response.context["react_project_image_preload"]

        self.assertEqual(preload["src"], "/static/images/portfolio-covers/online-shop-cover-v1.webp")
        self.assertEqual(preload["srcset"], (
            "/static/images/portfolio-covers/online-shop-cover-v1-480.webp 480w, "
            "/static/images/portfolio-covers/online-shop-cover-v1-768.webp 768w, "
            "/static/images/portfolio-covers/online-shop-cover-v1.webp 1254w"
        ))
        self.assertIn("(max-width: 47.99rem)", preload["sizes"])

    @override_settings(LOGIN_REQUIRED=False)
    def test_project_report_preloads_responsive_cover_and_only_inlines_report_css(self):
        self.create_project(slug="online-shop")
        for suffix in ("", "/"):
            response = self.client.get(f"/projekte/online-shop{suffix}")
            preload = response.context["react_project_image_preload"]
            self.assertTrue(response.context["react_is_project_detail"])
            self.assertIn("online-shop-cover-v1-960.webp 960w", preload["srcset"])
            self.assertContains(response, f'imagesizes="{preload["sizes"]}"')
            self.assertContains(response, "data-vite-inline='src/project-detail-page.css'")
            self.assertNotContains(response, '<link rel="stylesheet"')

    @override_settings(LOGIN_REQUIRED=False)
    def test_empty_projects_are_embedded_without_preloading_or_adding_data_to_the_homepage(self):
        response = self.client.get(reverse("pages:projects_page"))
        self.assertEqual(response.context["react_home_config"]["initialProjects"], [])
        self.assertIsNone(response.context["react_project_image_preload"])
        home = self.client.get(reverse("pages:home"))
        self.assertNotIn("initialProjects", home.context["react_home_config"])

    @override_settings(LOGIN_REQUIRED=False)
    def test_embedded_project_content_cannot_close_the_configuration_script(self):
        content = '</script><script>alert("sample")</script>'
        self.create_project(title=content, slug="script-sample")
        response = self.client.get(reverse("pages:projects_page"))
        document = response.content.decode()
        script_data = document.split('<script id="beirit-home-config-data" type="application/json">', 1)[1].split("</script>", 1)[0]
        self.assertEqual(json.loads(script_data)["initialProjects"][0]["title"], content)
        self.assertNotIn("<script>", script_data)

    @override_settings(LOGIN_REQUIRED=False)
    def test_integrated_vokabelbox_is_excluded_even_from_stale_published_records(self):
        self.create_project(title="Vokabelbox", slug="vokabelbox", published=True, featured=True)
        platform = self.create_project(title="Sprachplattform", slug="sprachdienstleistungen", featured=True)
        payload = self.client.get(reverse("pages:projects_api")).json()
        for key in ("projects", "featuredProjects"):
            self.assertEqual([project["slug"] for project in payload[key]], [platform.slug])

    def test_integration_migration_preserves_platform_content_and_unpublishes_old_card(self):
        platform = self.create_project(title="Sprachplattform", slug="sprachdienstleistungen", description="Eigene Beschreibung", features="Login")
        vocabulary = self.create_project(title="Vokabelbox", slug="vokabelbox", featured=True)
        migration = import_module("pages.migrations.0044_integrate_vokabelbox_into_language_platform")
        editor = SimpleNamespace(connection=connection)
        migration.forwards(apps, editor)
        migration.forwards(apps, editor)
        platform.refresh_from_db()
        vocabulary.refresh_from_db()
        self.assertFalse(vocabulary.published)
        self.assertFalse(vocabulary.featured)
        self.assertIn("Eigene Beschreibung", platform.description)
        self.assertEqual(platform.features.count("Vokabelbox"), 1)
        self.assertIn("Vokabelbox", platform.short_description)
        self.assertIn("Lernstand", platform.implementation)

    @override_settings(LOGIN_REQUIRED=False)
    def test_old_vocabulary_project_urls_redirect_to_the_platform_module(self):
        for prefix in ("/projekte", "/referenzen"):
            for suffix in ("", "/"):
                response = self.client.get(f"{prefix}/vokabelbox{suffix}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/projekte/sprachdienstleistungen/#vokabelbox")
