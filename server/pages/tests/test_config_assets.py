from django.test import SimpleTestCase, override_settings

from config.asset_redirects import ASSET_RENAMES, canonical_portfolio_url


@override_settings(LOGIN_REQUIRED=False)
class PortfolioAssetCompatibilityTests(SimpleTestCase):
    query = "v=2&name=a%2Bb&name=x&empty="

    def test_grade_asset_redirect_quotes_decoded_path_and_keeps_raw_query(self):
        for asset_path in (
            "img/example%3Fcopy%23part%25.svg",
            "img/Ger%C3%A4te%20und%20Notizen.svg",
            "img/example%2520name.svg",
        ):
            for method in ("get", "head"):
                with self.subTest(asset_path=asset_path, method=method):
                    response = getattr(self.client, method)(
                        f"/static/portfolio/test-main/{asset_path}?{self.query}"
                    )
                    self.assertEqual(response.status_code, 301)
                    self.assertEqual(
                        response["Location"],
                        f"/static/portfolio/notenrechner/{asset_path}?{self.query}",
                    )

    def test_image_aliases_keep_raw_query(self):
        for old, new in ASSET_RENAMES.items():
            with self.subTest(old=old):
                response = self.client.get(f"/static/{old}?{self.query}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], f"/static/{new}?{self.query}")

    def test_canonical_urls_preserve_query_and_fragment_exactly(self):
        for old, new in (
            ("/static/images/aktueles-logo.png", "/static/images/beirit-digital-logo.png"),
            ("/static/portfolio/test-main/app.js", "/static/portfolio/notenrechner/app.js"),
        ):
            for suffix in ("?", "#", "?#", f"?{self.query}#part%23two", "#section?source=legacy"):
                with self.subTest(old=old, suffix=suffix):
                    self.assertEqual(canonical_portfolio_url(old + suffix), new + suffix)

    def test_custom_urls_are_returned_without_normalization(self):
        for value in (
            "/static/images/custom.svg?",
            "/static/images/custom.svg?v=2#",
            "/static/portfolio/test-main-custom/app.js?",
            "https://demo.example.invalid/static/portfolio/test-main/app.js?",
            "/media/projects/custom.svg?v=2#",
            "",
            None,
        ):
            with self.subTest(value=value):
                self.assertEqual(canonical_portfolio_url(value), value)
