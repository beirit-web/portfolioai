from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings
from django.urls import reverse


@override_settings(LOGIN_REQUIRED=False)
class DeutschLiveRouteTests(SimpleTestCase):
    query = "lang=de&token=a%2Bb&token=x&empty="

    def test_unknown_api_paths_return_uncached_json_for_each_method(self):
        for path in (
            "/deutschlive/api",
            "/deutschlive/api/",
            "/deutschlive/api///",
            "/deutschlive/api/missing",
            "/deutschlive/api/missing/",
            "/deutschlive/api/auth/login/missing/",
        ):
            for method in ("get", "head", "post", "put", "patch", "delete", "options"):
                with self.subTest(path=path, method=method):
                    response = getattr(self.client, method)(path)
                    self.assertEqual(response.status_code, 404)
                    self.assertEqual(response["Content-Type"], "application/json")
                    if method == "head":
                        self.assertEqual(response.content, b"")
                    else:
                        self.assertIn("error", response.json())
                    self.assertIn("no-store", response["Cache-Control"])
                    self.assertNotIn("Location", response)

    def test_known_api_route_keeps_its_view_and_method_handling(self):
        response = self.client.get("/deutschlive/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertIn("csrfToken", response.json())
        self.assertEqual(self.client.post("/deutschlive/api/auth/csrf/").status_code, 405)

    def test_legacy_case_redirect_keeps_path_and_raw_query(self):
        for suffix in ("", "recordings", "dashboard"):
            for method in ("get", "head"):
                with self.subTest(suffix=suffix, method=method):
                    response = getattr(self.client, method)(f"/deutschLive/{suffix}?{self.query}")
                    self.assertEqual(response.status_code, 301)
                    self.assertEqual(response["Location"], f"/deutschlive/{suffix}?{self.query}")

    def test_legacy_case_redirect_preserves_encoded_path_characters(self):
        for path in ("recordings%3Fcopy%23part%25", "Ger%C3%A4te%20und%20Notizen"):
            with self.subTest(path=path):
                response = self.client.get(f"/deutschLive/{path}?{self.query}")
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], f"/deutschlive/{path}?{self.query}")

    def test_grade_aliases_keep_query_and_standalone_destination(self):
        for prefix in ("deutschlive", "deutschLive"):
            for suffix in ("grades", "grades/", "grades///"):
                for method in ("get", "head"):
                    with self.subTest(prefix=prefix, suffix=suffix, method=method):
                        response = getattr(self.client, method)(f"/{prefix}/{suffix}?{self.query}")
                        self.assertEqual(response.status_code, 302)
                        self.assertEqual(
                            response["Location"],
                            f"/static/portfolio/notenrechner/index.html?{self.query}",
                        )

    def test_spa_trailing_slashes_redirect_to_routes_recognized_by_the_app(self):
        for path in ("recordings-archiv", "recordings", "dashboard", "learn", "quiz"):
            for slash in ("/", "///"):
                with self.subTest(path=path, slash=slash):
                    response = self.client.get(f"/deutschlive/{path}{slash}?{self.query}")
                    self.assertEqual(response.status_code, 301)
                    self.assertEqual(response["Location"], f"/deutschlive/{path}?{self.query}")

    def test_spa_slash_redirect_preserves_encoded_path_characters(self):
        path = "recordings%3Fcopy%23part%25"
        response = self.client.get(f"/deutschlive/{path}///?{self.query}")
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], f"/deutschlive/{path}?{self.query}")

    def test_spa_and_named_archive_serve_uncached_app_html_with_route_metadata(self):
        html = b'<!doctype html><html lang="ru"><head><title>Sample</title></head><body><div id="root"></div></body></html>'
        with TemporaryDirectory(prefix="beirit-config-routes-") as directory:
            index = Path(directory) / "assets" / "deutschlive-dist" / "index.html"
            index.parent.mkdir(parents=True)
            index.write_bytes(html)
            with override_settings(BASE_DIR=Path(directory)):
                paths = ("/deutschlive/", "/deutschlive/dashboard", reverse("deutschlive_recordings_archive"))
                for path in paths:
                    with self.subTest(path=path):
                        response = self.client.get(path)
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response["Content-Type"], "text/html; charset=utf-8")
                        self.assertIn("no-store", response["Cache-Control"])
                        self.assertContains(response, '<div id="root"></div>')
                        self.assertContains(response, '<link rel="canonical"')
                        self.assertIn("X-Robots-Tag", response)
                        response.close()
                get_response = self.client.get("/deutschlive/")
                response = self.client.head("/deutschlive/")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["Content-Length"], str(len(get_response.content)))
                self.assertEqual(response.content, b"")
                response.close()

    def test_missing_app_build_returns_404_for_spa_and_archive(self):
        with TemporaryDirectory(prefix="beirit-config-routes-") as directory:
            with override_settings(BASE_DIR=Path(directory)):
                for path in ("/deutschlive/", reverse("deutschlive_recordings_archive")):
                    with self.subTest(path=path):
                        self.assertEqual(self.client.get(path).status_code, 404)
