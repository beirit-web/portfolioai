from pathlib import Path
import json

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.staticfiles import finders
from django.test import TestCase, override_settings
from django.urls import reverse

from pages.tests.test_portfolio_seo import PortfolioDocument
from pages.vokabelbox import content


@override_settings(LOGIN_REQUIRED=False)
class VokabelboxPortfolioTests(TestCase):
    def test_module_renders_shared_trainer_and_returns_to_parent_project(self):
        response = self.client.get(reverse("pages:vokabelbox"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "vokabelbox_content.html")
        self.assertContains(response, 'href="/projekte/sprachdienstleistungen/#vokabelbox"')
        self.assertContains(response, 'data-storage-key="sprachservice:vokabelbox:v1:guest"')
        self.assertContains(response, 'id="wordGrid"')
        self.assertContains(response, 'id="quizWord"')
        self.assertContains(response, 'name="robots" content="index, follow"')
        self.assertContains(response, f'href="{settings.SITE_URL}/vokabelbox/?lang=de"')
        self.assertIn("no-store", response["Cache-Control"])
        self.assertNotContains(response, "portfolio-dist")
        self.assertNotContains(response, 'js/main.js')
        for name in ("app.js", "style.css", "translations.js"):
            asset = f"vokabelbox/{name}"
            self.assertContains(response, f"/static/{asset}")
            self.assertEqual(Path(finders.find(asset)), settings.SERVER_DIR / "assets" / asset)

    @override_settings(LOGIN_REQUIRED=True)
    def test_guests_can_use_learning_module_when_account_routes_require_login(self):
        self.assertEqual(self.client.get(reverse("pages:vokabelbox")).status_code, 200)

    def test_browser_progress_is_scoped_to_guest_and_each_portfolio_account(self):
        for name in ("vocab-learner-one", "vocab-learner-two"):
            user = User.objects.create_user(username=name)
            self.client.force_login(user)
            response = self.client.get(reverse("pages:vokabelbox"))
            self.assertContains(response, f'data-storage-key="sprachservice:vokabelbox:v1:user-{user.pk}"')
            self.assertNotContains(response, 'data-storage-key="sprachservice:vokabelbox:v1:guest"')
            self.client.logout()
        self.assertContains(self.client.get(reverse("pages:vokabelbox")), 'data-storage-key="sprachservice:vokabelbox:v1:guest"')

    def test_canonical_route_and_get_only_learning_module(self):
        self.assertRedirects(self.client.get("/vokabelbox"), "/vokabelbox/", status_code=301)
        self.assertEqual(self.client.post(reverse("pages:vokabelbox")).status_code, 405)

    def test_module_uses_supported_browser_language(self):
        for language in ("de", "ru", "uk"):
            self.assertContains(
                self.client.get(reverse("pages:vokabelbox"), HTTP_ACCEPT_LANGUAGE=f"{language}-{language.upper()},en;q=0.8"),
                f'<html lang="{language}">',
            )

    def test_all_languages_have_readable_html_and_matching_discovery_metadata(self):
        for language in ("de", "ru", "uk"):
            with self.subTest(language=language):
                response = self.client.get(f"/vokabelbox/?lang={language}", HTTP_ACCEPT_LANGUAGE="en")
                document = PortfolioDocument(response)
                copy = content()["vocabulary"][language]
                canonical = f"{settings.SITE_URL}/vokabelbox/?lang={language}"
                self.assertEqual(response["Content-Language"], language)
                self.assertEqual(document.title, copy["title"])
                self.assertEqual(document.canonical, canonical)
                self.assertEqual(document.metadata["og:url"], canonical)
                for key in ("description", "og:description", "twitter:description"):
                    self.assertEqual(document.metadata[key], copy["description"])
                self.assertContains(response, f'<p class="vocab-intro" data-i18n="vocab.intro">{copy["intro"]}</p>', html=True)
                self.assertContains(response, 'class="word-card"', count=30)
                self.assertContains(response, content()["words"][0]["meanings"][language])
                alternates = {link["hreflang"]: link["href"] for link in document.links if "hreflang" in link}
                for code in ("de", "ru", "uk"):
                    self.assertEqual(alternates[code], f"{settings.SITE_URL}/vokabelbox/?lang={code}")
                schema = json.loads(next(script["content"] for script in document.scripts if script["attrs"].get("id") == "vocab-schema"))
                self.assertEqual(schema["url"], canonical)
                self.assertEqual(schema["inLanguage"], language)
                self.assertIn("LearningResource", schema["@type"])

    def test_search_is_available_without_scripts_and_canonical_excludes_filters(self):
        for query, language, word in (("apple", "de", "Apfel"), ("ребенок", "ru", "Kind"), ("комп'ютер", "uk", "Computer")):
            response = self.client.get("/vokabelbox/", {"lang": language, "q": query})
            self.assertContains(response, 'class="word-card"', count=1)
            self.assertContains(response, f'<strong lang="de">{word}</strong>', html=True)
            self.assertEqual(PortfolioDocument(response).canonical, f"{settings.SITE_URL}/vokabelbox/?lang={language}")
        response = self.client.get("/vokabelbox/", {"article": "die"})
        self.assertContains(response, 'class="word-card"', count=10)
        self.assertContains(response, 'data-article="die"', count=10)
        response = self.client.get("/vokabelbox/", {"q": '<b id="injected">Beispiel</b>'})
        self.assertNotContains(response, '<b id="injected">')

    def test_explicit_language_wins_over_cookie_and_invalid_state_has_safe_defaults(self):
        self.client.cookies["vokabelbox_language"] = "ru"
        response = self.client.get("/vokabelbox/?lang=uk", HTTP_ACCEPT_LANGUAGE="de")
        self.assertEqual(response["Content-Language"], "uk")
        self.client.cookies["vokabelbox_language"] = "invalid"
        response = self.client.get("/vokabelbox/?lang=invalid&view=invalid&article=invalid")
        self.assertEqual(response["Content-Language"], "de")
        self.assertContains(response, 'class="word-card"', count=30)
        self.assertContains(response, 'data-view="words" aria-current="page"', count=1)
        self.assertIn("Cookie", response["Vary"])
        self.assertIn("Accept-Language", response["Vary"])
