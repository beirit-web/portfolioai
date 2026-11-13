import json
from html.parser import HTMLParser
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse


class JsonScriptParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = {}
        self.active_id = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type") == "application/json":
            self.active_id = attrs.get("id")
            self.scripts.setdefault(self.active_id, []).append("")

    def handle_data(self, data):
        if self.active_id is not None:
            self.scripts[self.active_id][-1] += data

    def handle_endtag(self, tag):
        if tag == "script":
            self.active_id = None


@override_settings(LOGIN_REQUIRED=False)
class HomeConfigIntegrationTests(TestCase):
    def rendered_config(self, response, script_id="beirit-home-config-data"):
        self.assertEqual(response.status_code, 200)
        parser = JsonScriptParser()
        parser.feed(response.content.decode())
        scripts = parser.scripts.get(script_id, [])
        self.assertEqual(len(scripts), 1)
        return json.loads(scripts[0])

    def test_shared_config_has_resolved_routes_on_every_public_react_page(self):
        expected_routes = {
            "contactApiUrl": "pages:contact_request_api",
            "projectsApiUrl": "pages:projects_api",
            "weatherSearchesUrl": "pages:weather_searches",
            "loginUrl": "pages:login",
            "registerUrl": "pages:register",
            "profileUrl": "pages:profile",
            "logoutUrl": "pages:logout",
        }
        for route in ("pages:home", "pages:skills_page", "pages:projects_page",
                      "pages:about_page", "pages:contact"):
            with self.subTest(route=route):
                response = self.client.get(reverse(route))
                config = self.rendered_config(response)
                self.assertEqual(config, response.context["react_home_config"])
                for key, url_name in expected_routes.items():
                    self.assertEqual(config[key], reverse(url_name))
                for key in ("logoUrl", "logoSmallUrl", "logoLargeUrl"):
                    self.assertTrue(config[key].startswith("/static/images/"))

    def test_legacy_weather_redirects_to_botanic(self):
        response = self.client.get(reverse("pages:weather"))
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], reverse("botanic:weather"))

    def test_config_json_preserves_strings_without_allowing_script_injection(self):
        logo_url = '</script><script id="injected">alert("test")</script>'
        with patch("pages.views.safe_static_url", return_value=logo_url):
            response = self.client.get(reverse("pages:home"))

        config = self.rendered_config(response)
        self.assertEqual(config["logoUrl"], logo_url)
        self.assertNotContains(response, '<script id="injected">')

    def test_home_provides_csrf_cookie_for_frontend_contact_submission(self):
        response = self.client.get(reverse("pages:home"))

        self.assertIn("csrftoken", response.cookies)
        self.assertTrue(response.cookies["csrftoken"].value)

    def test_guest_session_config_uses_a_json_boolean(self):
        response = self.client.get(reverse("pages:home"))
        session_config = self.rendered_config(response, "auth-session-config-data")

        self.assertIs(session_config["isAuthenticated"], False)
