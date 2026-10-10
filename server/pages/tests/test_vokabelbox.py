from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.staticfiles import finders
from django.test import TestCase, override_settings
from django.urls import reverse


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
        self.assertContains(response, 'name="robots" content="noindex, follow"')
        self.assertContains(response, f'href="{settings.SITE_URL}/vokabelbox/"')
        self.assertIn("no-store", response["Cache-Control"])
        self.assertNotContains(response, "react-home-dist")
        self.assertNotContains(response, 'js/main.js')
        for name in ("app.js", "style.css", "translations.js"):
            asset = f"vokabelbox/{name}"
            self.assertContains(response, f"/static/{asset}")
            self.assertEqual(Path(finders.find(asset)), settings.PORTFOLIO_LANGUAGE_DIR / "assets" / asset)

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
