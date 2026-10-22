from django.contrib.staticfiles import finders
from django.test import SimpleTestCase, override_settings

from config.asset_redirects import ASSET_RENAMES, canonical_portfolio_url


@override_settings(LOGIN_REQUIRED=False)
class PortfolioAssetNameTests(SimpleTestCase):
    def test_legacy_grade_assets_redirect_with_query_string(self):
        for filename in ("index.html", "app.js", "styles.css", "gewonnen.mp3", "lost-signal.mp3", "img/favicon.png", "img/lost.png"):
            with self.subTest(filename=filename):
                response = self.client.get(f"/static/portfolio/test-main/{filename}?v=2")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], f"/static/portfolio/notenrechner/{filename}?v=2")
                self.assertIsNotNone(finders.find(f"portfolio/notenrechner/{filename}"))

    def test_legacy_housing_entries_redirect_and_normalize_without_changing_assets(self):
        for path in ("/static/portfolio/wohnungssuche", "/static/portfolio/wohnungssuche/", "/static/portfolio/wohnungssuche/index.html"):
            with self.subTest(path=path):
                response = self.client.get(path + "?source=portfolio")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/wohnungssuche/?source=portfolio")
                self.assertEqual(canonical_portfolio_url(path + "?source=portfolio#login"), "/wohnungssuche/?source=portfolio#login")
        asset = "/static/portfolio/wohnungssuche/navigation.js"
        self.assertEqual(canonical_portfolio_url(asset), asset)

    def test_renamed_images_keep_legacy_links(self):
        for old, new in ASSET_RENAMES.items():
            with self.subTest(old=old):
                response = self.client.get("/static/" + old)
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "/static/" + new)
                self.assertIsNotNone(finders.find(new))

    def test_url_normalization_preserves_suffixes_and_custom_urls(self):
        self.assertEqual(
            canonical_portfolio_url("/static/images/aktueles-logo.png?v=2#logo"),
            "/static/images/beirit-digital-logo.png?v=2#logo",
        )
        for url in ("https://demo.example.invalid/static/portfolio/test-main/index.html", "/media/projects/custom.webp", ""):
            self.assertEqual(canonical_portfolio_url(url), url)
