from django.test import SimpleTestCase, override_settings


@override_settings(LOGIN_REQUIRED=False)
class ServiceDemoTests(SimpleTestCase):
    path = "/demos/sprachdienstleistungen/"

    @override_settings(LANGUAGE_SERVICES_DEMO_URL="https://languages.example.com/")
    def test_destination_is_fixed_and_does_not_forward_visitor_parameters(self):
        response = self.client.get(self.path, {"next": "https://other.example.com/", "token": "fictional-token"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "https://languages.example.com/")
        self.assertEqual(response["Referrer-Policy"], "no-referrer")
        self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")

    def test_missing_or_unsafe_destination_fails_closed(self):
        for value in ("", "http://languages.example.com/", "//languages.example.com/", "javascript:alert(1)", "https://user:password@languages.example.com/", "https://languages.example.com/?token=fictional"):
            with self.subTest(value=value), self.settings(LANGUAGE_SERVICES_DEMO_URL=value):
                response = self.client.get(self.path)
                self.assertEqual(response.status_code, 503)
                self.assertNotIn("Location", response)

    @override_settings(LANGUAGE_SERVICES_DEMO_URL="https://languages.example.com/")
    def test_form_submissions_are_not_forwarded(self):
        self.assertEqual(self.client.post(self.path, {"message": "fictional"}).status_code, 405)
