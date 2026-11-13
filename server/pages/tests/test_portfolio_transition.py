from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from pages.forms import ContactRequestForm
from pages.models import ChatMessage


class PortfolioTransitionTests(TestCase):
    @override_settings(
        LOGIN_REQUIRED=False,
        CONTACT_EMAIL="private-owner@example.invalid",
        CONTACT_PHONE_LANDLINE="+49 30 123456",
        CHAT_CONTACTS=[{"label": "Private chat", "url": "https://chat.example.invalid/private", "hint": "Private hint"}],
        SITE_CONFIG={
            "owner_name": "Private Owner",
            "street": "Private Straße 999",
            "email": "private-owner@example.invalid",
            "phone": "+49 30 123456",
        },
    )
    def test_runtime_settings_cannot_publish_private_owner_data(self):
        private_values = ("Private Owner", "Private Straße 999", "private-owner@example.invalid", "+49 30 123456", "Private chat", "Private hint")
        for path in ("/", "/kontakt", "/ueber-mich", "/impressum", "/datenschutz/", "/rechtliches/"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                for value in private_values:
                    self.assertNotContains(response, value)
                self.assertEqual(response.context["contact_actions"], {})
                self.assertEqual(response.context["chat_contacts"], [])
        for action in ("email", "landline", "chat-0"):
            with self.subTest(action=action):
                response = self.client.get(reverse("pages:contact_action", kwargs={"action": action}))
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("Location", response)

    def test_public_portfolio_routes_render(self):
        for route_name in ("pages:home", "pages:projects_page", "pages:skills_page", "pages:about_page", "pages:contact"):
            with self.subTest(route_name=route_name):
                self.assertEqual(self.client.get(reverse(route_name)).status_code, 200)

    def test_legacy_business_pages_redirect_to_portfolio(self):
        expected_targets = {
            "pages:service_catalog": "/kompetenzen",
            "pages:pricing_page": "/projekte",
            "pages:faq_page": "/kontakt",
            "pages:project_terms": "/projekte",
        }
        for route_name, target in expected_targets.items():
            with self.subTest(route_name=route_name):
                response = self.client.get(reverse(route_name))
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response.url, target)

    def test_home_config_does_not_expose_prices_or_paypal(self):
        response = self.client.get(reverse("pages:home"))
        config = response.context["react_home_config"]
        self.assertNotIn("priceRows", config)
        self.assertFalse(any(key.lower().startswith("paypal") for key in config))

    @patch("pages.views.projects_presentation_catalog", return_value=None)
    def test_home_fallback_shell_does_not_duplicate_hero_content(self, catalog):
        # The normal homepage is prerendered; this shell is only the fallback
        # when its presentation catalogue is unavailable.
        response = self.client.get(reverse("pages:home"))
        html = response.content.decode()
        root_markup = html.split('<div id="beirit-root">', 1)[1].split("<noscript>", 1)[0]

        self.assertIn('<section class="hero-stage" aria-hidden="true">', root_markup)
        self.assertNotIn("hero-stage__content", root_markup)
        self.assertNotIn("Webentwicklung", root_markup)
        self.assertNotIn("Softwareentwicklung", root_markup)

    def test_contact_form_contains_only_neutral_contact_fields(self):
        form = ContactRequestForm()
        self.assertEqual(
            set(form.fields),
            {"name", "email", "subject", "message", "privacy_consent", "company"},
        )

    @patch("pages.views.send_notification_email")
    def test_contact_api_stores_subject_without_business_fields(self, send_notification_email):
        response = self.client.post(
            reverse("pages:contact_request_api"),
            {
                "name": "Erika Beispiel",
                "email": "erika@example.com",
                "subject": "Frage zum Django-Projekt",
                "message": "Welche Architektur wurde verwendet?",
                "privacy_consent": "on",
                "company": "",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        message = ChatMessage.objects.get()
        self.assertIn("Betreff: Frage zum Django-Projekt", message.text)
        self.assertNotIn("Budget", message.text)
        self.assertNotIn("Dringlichkeit", message.text)
        send_notification_email.assert_called_once()
