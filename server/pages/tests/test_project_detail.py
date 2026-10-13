from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from pages.models import InterpreterApplication, Profile, Project
from pages.project_detail import build_project_detail
from pages.projects_overview import projects_presentation_catalog


@override_settings(LOGIN_REQUIRED=False)
class ProjectDetailDocumentTests(TestCase):
    def setUp(self):
        Project.objects.all().delete()
        self.project = Project.objects.create(
            title="Fictional shop report", slug="online-shop", published=True,
            short_description="Current introduction", situation="Current situation",
            implementation="Current implementation", result="Current result",
            features="Session-Warenkorb\nDjango-Storefront", technologies="Django, Python",
            live_url="/shop/",
        )

    def test_report_is_complete_before_javascript_and_excludes_client_runtime(self):
        for suffix in ("", "/"):
            response = self.client.get(f"/projekte/online-shop{suffix}")
            self.assertContains(response, "data-project-detail-rendered")
            self.assertContains(response, '<h1>Fictional shop report</h1>')
            for text in ("Current introduction", "Current situation", "Current implementation", "Current result", "Session-Warenkorb"):
                self.assertContains(response, text)
            self.assertContains(response, 'class="page-is-loaded"')
            self.assertContains(response, 'href="/shop/"')
            self.assertContains(response, 'id="technical-decision-title"')
            for script in ("preact-vendor-", "useI18n-", "mountSiteApp-", "project-detail-app-"):
                self.assertNotContains(response, script)
            self.assertNotContains(response, "Bitte aktivieren Sie JavaScript")

    def test_current_data_changes_do_not_require_a_new_build(self):
        self.client.get("/projekte/online-shop")
        self.project.situation = "Updated fictional situation"
        self.project.save(update_fields=["situation"])
        response = self.client.get("/projekte/online-shop")
        self.assertContains(response, "Updated fictional situation")
        self.assertNotContains(response, "Current situation")

    def test_contract_report_skips_home_directory_and_does_not_create_profiles(self):
        self.project.slug = "vertragsgenerator"
        self.project.save(update_fields=["slug"])
        user = User.objects.create_user(
            username="fictional-report-helper", email="helper@example.invalid",
        )
        InterpreterApplication.objects.create(
            user=user, display_name="Fictional helper", languages="Deutsch",
            region="Musterstadt", motivation="Fictional sample application",
            status=InterpreterApplication.STATUS_APPROVED,
        )
        self.assertFalse(Profile.objects.filter(user=user).exists())

        response = self.client.get("/projekte/vertragsgenerator")
        self.assertContains(response, "data-project-detail-rendered")
        self.assertContains(response, '<h1>Fictional shop report</h1>')
        self.assertFalse(Profile.objects.filter(user=user).exists())

    def test_home_does_not_load_the_retired_directory(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("home_active_entry", response.context)
        self.assertNotIn("ticker_interpreters", response.context)

    def test_localized_reports_keep_the_frontend_language_behavior(self):
        catalog = projects_presentation_catalog()
        for language in ("ru", "uk"):
            localized = next(item for item in catalog["locales"][language]["detail"]["items"] if item["slug"] == "online-shop")
            response = self.client.get("/projekte/online-shop", HTTP_ACCEPT_LANGUAGE=language)
            self.assertContains(response, f'<h1>{localized["title"]}</h1>')
            self.assertContains(response, localized["situation"])
            self.assertNotContains(response, "Current situation")

    def test_authored_content_is_escaped_in_the_report(self):
        self.project.situation = '<script>alert("fictional sample")</script>'
        self.project.save(update_fields=["situation"])
        response = self.client.get("/projekte/online-shop")
        self.assertContains(response, "&lt;script&gt;alert")
        self.assertNotContains(response, '<script>alert("fictional sample")</script>')

    def test_missing_presentation_build_keeps_the_client_fallback(self):
        with patch("pages.project_detail.projects_presentation_catalog", return_value=None):
            response = self.client.get("/projekte/online-shop")
        self.assertNotContains(response, "data-project-detail-rendered>")
        self.assertContains(response, "/project-detail-")

    def test_unpublished_reports_do_not_expose_their_content(self):
        self.project.published = False
        self.project.save(update_fields=["published"])
        response = self.client.get("/projekte/online-shop")
        self.assertNotContains(response, "Current situation")
        self.assertNotContains(response, "data-project-detail-rendered>")

    def test_feature_vectors_allow_only_svg_primitives_and_attributes(self):
        catalog = projects_presentation_catalog()
        catalog = {**catalog, "featureIconNodes": {**catalog["featureIconNodes"], "Code2": [
            ["path", {"d": "M1 2", "onclick": "alert(1)"}], ["script", {"d": "invalid"}],
        ]}}
        detail = build_project_detail({"slug": "sample", "title": "Example", "technologies": ["Example API"]}, catalog=catalog)
        self.assertEqual(detail["codeIcon"], [{"tag": "path", "attributes": [("d", "M1 2")]}])
