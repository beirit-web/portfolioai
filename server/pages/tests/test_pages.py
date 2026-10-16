import json
from datetime import date, time, timedelta
from urllib.parse import urlparse
from unittest.mock import patch

from django.conf import settings
from django.contrib.messages import get_messages
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import resolve, reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils import timezone

from pages.models import (
    AccountDocument,
    AccountNotice,
    Appointment,
    CallbackRequest,
    ChatMessage,
    ChatReply,
    InterpreterApplication,
    Profile,
    UnavailableDay,
)
from pages.modules.tokens import email_verification_token_generator
from pages.views import (
    safe_static_url,
)
from .test_portfolio_seo import PortfolioDocument


class ImprintPageTests(TestCase):
    @override_settings(LOGIN_REQUIRED=False, SITE_URL="https://portfolio.example.invalid/")
    def test_metadata_is_localized_and_canonical_without_query_parameters(self):
        for lang, title, locale in (
            ("de", "Muster-Impressum | Beirit Web Portfolio", "de_DE"),
            ("ru", "Пример импрессума | Портфолио Beirit Web", "ru_RU"),
            ("uk", "Зразок імпресуму | Портфоліо Beirit Web", "uk_UA"),
        ):
            with self.subTest(language=lang):
                response = self.client.get("/impressum?utm_source=preview", HTTP_ACCEPT_LANGUAGE=lang)
                document = PortfolioDocument(response)
                self.assertEqual(document.title, title)
                self.assertEqual(document.metadata["og:title"], title)
                self.assertEqual(document.metadata["twitter:title"], title)
                self.assertEqual(document.metadata["description"], document.metadata["og:description"])
                self.assertEqual(document.metadata["description"], document.metadata["twitter:description"])
                self.assertEqual(document.metadata["og:locale"], locale)
                self.assertEqual(document.metadata["robots"], "noindex, follow")
                self.assertEqual(document.canonical, "https://portfolio.example.invalid/impressum")
                self.assertEqual(document.metadata["og:url"], document.canonical)

    @override_settings(LOGIN_REQUIRED=False)
    def test_navigation_links_to_standalone_pages_and_has_a_disclosure_control(self):
        response = self.client.get("/impressum")
        for path in ("/projekte", "/kompetenzen", "/ueber-mich", "/kontakt"):
            self.assertContains(response, f'href="{path}"')
        self.assertContains(response, 'aria-controls="imprint-navigation-links"')
        self.assertContains(response, 'aria-expanded="false"')
        self.assertNotContains(response, 'href="/#profil"')
        self.assertNotContains(response, 'href="/#kontakt"')

    @override_settings(LOGIN_REQUIRED=False)
    def test_imprint_contains_explicitly_fictional_portfolio_details(self):
        response = self.client.get(reverse("pages:imprint"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Fiktive Musterangaben")
        self.assertContains(response, "Max Mustermann")
        self.assertContains(response, "Musterstraße 1")
        self.assertContains(response, "12345 Musterstadt")
        self.assertContains(response, "Es werden keine Leistungen verkauft oder Zahlungen angeboten.")
        self.assertContains(response, 'href="/kontakt/"')
        self.assertContains(response, 'href="/datenschutz/"')

    @override_settings(
        LOGIN_REQUIRED=False,
        SITE_CONFIG={"owner_name": "Injected Owner", "street": "Private Straße 999", "phone": "+491234567890"},
    )
    def test_imprint_ignores_runtime_identity_configuration(self):
        response = self.client.get(reverse("pages:imprint"))
        self.assertContains(response, "Musterstraße 1")
        self.assertNotContains(response, "Injected Owner")
        self.assertNotContains(response, "Private Straße 999")
        self.assertNotContains(response, 'href="tel:+491234567890"')

    def test_legacy_trailing_slash_redirects_to_canonical_imprint(self):
        response = self.client.get("/impressum/")

        self.assertRedirects(
            response,
            "/impressum",
            status_code=301,
            fetch_redirect_response=False,
        )

    def test_privacy_page_contains_required_supplemental_information(self):
        response = self.client.get(reverse("pages:privacy"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Stand: Oktober 2026")
        self.assertContains(response, "SSL-/TLS-Verschlüsselung")
        self.assertContains(response, "Automatisierte Entscheidungen")
        self.assertContains(response, "Datenschutzaufsichtsbehörde")
        self.assertContains(response, 'href="/impressum"')
        self.assertContains(response, 'href="/datenschutz/"')

    @override_settings(LOGIN_REQUIRED=False, SITE_URL="https://portfolio.example.invalid/")
    def test_privacy_metadata_matches_the_rendered_language_and_clean_canonical(self):
        for language, rendered_language, title, locale in (
            ("de", "de", "Muster-Datenschutz | Beirit Web Portfolio", "de_DE"),
            ("ru", "ru", "Пример политики конфиденциальности | Beirit Web Portfolio", "ru_RU"),
            ("uk", "de", "Muster-Datenschutz | Beirit Web Portfolio", "de_DE"),
        ):
            with self.subTest(language=language):
                response = self.client.get("/datenschutz/?utm_source=preview", HTTP_ACCEPT_LANGUAGE=language)
                document = PortfolioDocument(response)
                self.assertContains(response, f'<html lang="{rendered_language}"')
                self.assertEqual(document.title, title)
                self.assertEqual(document.metadata["og:title"], title)
                self.assertEqual(document.metadata["twitter:title"], title)
                self.assertEqual(document.metadata["description"], document.metadata["og:description"])
                self.assertEqual(document.metadata["description"], document.metadata["twitter:description"])
                self.assertEqual(document.metadata["og:locale"], locale)
                self.assertEqual(document.metadata["robots"], "noindex, follow")
                self.assertEqual(document.canonical, "https://portfolio.example.invalid/datenschutz/")
                self.assertEqual(document.metadata["og:url"], document.canonical)

    @override_settings(LOGIN_REQUIRED=False)
    def test_privacy_is_server_rendered_without_app_styles_and_translation_bundles(self):
        response = self.client.get("/datenschutz/")
        self.assertContains(response, 'aria-controls="imprint-navigation-links"')
        self.assertContains(response, 'class="privacy-contact-links"')
        self.assertContains(response, 'href="/kontakt"')
        self.assertNotContains(response, "/static/css/main.css")
        self.assertNotContains(response, "/static/js/main.js")
        self.assertNotContains(response, "/static/js/i18n-data.js")

    def test_legacy_project_terms_route_redirects_to_portfolio(self):
        response = self.client.get(reverse("pages:project_terms"))

        self.assertEqual(reverse("pages:project_terms"), "/projektbedingungen")
        self.assertRedirects(response, "/projekte", status_code=301, fetch_redirect_response=False)

        slash_response = self.client.get("/projektbedingungen/")
        self.assertRedirects(
            slash_response,
            "/projektbedingungen",
            status_code=301,
            fetch_redirect_response=False,
        )




@override_settings(STORAGES={
    **settings.STORAGES,
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class WeatherPageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="weatheruser",
            email="weatheruser@example.com",
            password="testpass123",
        )

    @override_settings(LOGIN_REQUIRED=True)
    def test_weather_page_is_public_without_login(self):
        response = self.client.get(reverse("pages:weather"), follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="botanic-weather-root"')
        self.assertContains(response, "noindex, nofollow")
        self.assertNotContains(response, "css/weather.css")
        self.assertNotContains(response, "weatherSavedSearchesList")

    @override_settings(LOGIN_REQUIRED=True)
    def test_weather_page_without_slash_is_not_sent_to_login(self):
        response = self.client.get("/wetter", follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="botanic-weather-root"')

    def test_weather_page_renders(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:weather"), follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="botanic-weather-root"')
        self.assertContains(response, "weatheruser")
        self.assertNotContains(response, "css/weather.css")

    def test_weather_page_disables_caching(self):
        self.client.force_login(self.user)
        for route in ("pages:weather", "pages:weather_no_slash"):
            with self.subTest(route=route):
                response = self.client.get(reverse(route), follow=True)

                self.assertEqual(response.status_code, 200)
                self.assertIn("no-cache", response["Cache-Control"])
                self.assertIn("no-store", response["Cache-Control"])

    def test_weather_saved_searches_api_requires_login(self):
        response = self.client.get(reverse("pages:weather_searches"))

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "auth_required")


class HomeViewHelperTests(TestCase):
    def tearDown(self):
        cache.clear()
        super().tearDown()

    def test_safe_static_url_falls_back_when_manifest_entry_is_missing(self):
        with patch("pages.views.static", side_effect=ValueError("Missing staticfiles manifest entry")):
            url = safe_static_url(
                "images/missing-test-asset.svg",
                fallback_path="images/beirit-web-favicon-mini.svg",
            )

        self.assertEqual(url, "/static/images/beirit-web-favicon-mini.svg")

    @override_settings(EMAIL_HOST="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", CONTACT_EMAIL="owner@example.com")
    def test_home_contact_form_stores_request_and_sends_notification(self):
        response = self.client.post(
            reverse("pages:home"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "subject": "Frage zu einem Webprojekt",
                "message": "Bitte eine Webseite prüfen.",
                "privacy_consent": "on",
            },
            follow=True,
        )

        self.assertRedirects(response, f"{reverse('pages:home')}#kontakt")
        message = ChatMessage.objects.get()
        self.assertEqual(message.contact_email, "ada@example.com")
        self.assertIn("Kontaktformular Beirit Digital", message.text)
        self.assertIn("Betreff: Frage zu einem Webprojekt", message.text)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner@example.com"])

    def test_home_contact_form_requires_privacy_consent(self):
        response = self.client.post(
            reverse("pages:home"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "subject": "Frage zu einem Webprojekt",
                "message": "Bitte eine Webseite prüfen.",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ChatMessage.objects.count(), 0)
        self.assertContains(response, "Bitte bestätigen Sie den Datenschutzhinweis.")

    @override_settings(EMAIL_HOST="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", CONTACT_EMAIL="owner@example.com", PRIVACY_CONSENT_VERSION="2026-06-22")
    def test_contact_request_api_accepts_react_form_submission(self):
        response = self.client.post(
            reverse("pages:contact_request_api"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "subject": "Architektur des Webprojekts",
                "message": "Bitte eine Webseite prüfen.",
                "privacy_consent": "on",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)
        message = ChatMessage.objects.get()
        self.assertIn("Betreff: Architektur des Webprojekts", message.text)
        self.assertIsNotNone(message.privacy_consent_at)
        self.assertEqual(message.privacy_consent_version, "2026-06-22")
        self.assertIn("Bitte eine Webseite prüfen.", message.text)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(EMAIL_HOST="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", CONTACT_EMAIL="owner@example.com")
    def test_contact_request_api_accepts_different_project_subjects(self):
        for index, subject in enumerate(("Fehlerbehebung", "Neue Funktion", "Übersetzung", "Fachlicher Austausch")):
            with self.subTest(subject=subject):
                response = self.client.post(
                    reverse("pages:contact_request_api"),
                    {
                        "name": "Ada Lovelace",
                        "email": f"projekt-{index}@example.com",
                        "subject": subject,
                        "message": "Bitte ein Webprojekt prüfen.",
                        "privacy_consent": "on",
                    },
                    HTTP_X_REQUESTED_WITH="XMLHttpRequest",
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["ok"], True)

    @override_settings(EMAIL_HOST="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", CONTACT_EMAIL="owner@example.com")
    def test_contact_request_api_accepts_russian_react_form_values(self):
        response = self.client.post(
            reverse("pages:contact_request_api"),
            {
                "name": "Ada Lovelace",
                "email": "ada-ru@example.com",
                "subject": "Вопрос о переводе проекта",
                "message": "Как добавлена русская версия?",
                "privacy_consent": "on",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
            HTTP_ACCEPT_LANGUAGE="ru",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)
        message = ChatMessage.objects.get(contact_email="ada-ru@example.com")
        self.assertEqual(message.lang, "ru")
        self.assertIn("Betreff: Вопрос о переводе проекта", message.text)
        self.assertIn("Как добавлена русская версия?", message.text)









class ChatContactDisplayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="kontaktuser",
            email="kontakt@example.com",
            password="testpass123",
        )
        self.interpreter = User.objects.create_user(
            username="dolmetscherin",
            email="dolmetscherin@example.com",
            password="testpass123",
        )
        InterpreterApplication.objects.create(
            user=self.interpreter,
            display_name="Nadia",
            languages="Deutsch, Arabisch",
            region="Berlin",
            motivation="Unterstützung bei Terminen und Formularen.",
            status=InterpreterApplication.STATUS_APPROVED,
        )

    @override_settings(
        CHAT_CONTACTS=[
            {
                "label": "Viber",
                "url": "https://viber.example/nadia",
                "hint": "Schnelle Rückfragen",
            }
        ]
    )
    def test_home_contact_panel_shows_configured_chat_contacts(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Viber")
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "chat-0"}),
        )
        self.assertNotContains(response, "https://viber.example/nadia")
        self.assertNotContains(response, "Schnelle Rückfragen")

    @override_settings(
        CHAT_CONTACTS=[
            {
                "label": "Viber",
                "url": "https://viber.example/nadia",
                "hint": "Schnelle Rückfragen",
            }
        ],
    )
    def test_home_contact_panel_groups_secondary_contact_options_in_secondary_section(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Weitere Kontaktwege")
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "telegram"}),
        )
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "proton"}),
        )
        self.assertNotContains(response, "Viber")



@override_settings(STORAGES={
    **settings.STORAGES,
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class SeoSignalTests(TestCase):
    @override_settings(SITE_URL="https://portfolio.example.invalid", LOGIN_REQUIRED=False)
    def test_homepage_uses_configured_portfolio_domain_for_canonical_and_open_graph(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://portfolio.example.invalid/" />',
            html=True,
        )
        self.assertContains(
            response,
            '<meta property="og:url" content="https://portfolio.example.invalid/" />',
            html=True,
        )

    @override_settings(LOGIN_REQUIRED=False)
    def test_homepage_renders_auth_session_flag_as_boolean_for_guests(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"isAuthenticated": false')

    @override_settings(
        SITE_URL="https://portfolio.example.invalid",
        SITE_HOST="portfolio.example.invalid",
        LOGIN_REQUIRED=False,
    )
    def test_robots_txt_references_primary_domain_sitemap(self):
        response = self.client.get(reverse("pages:robots_txt"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "Sitemap: https://portfolio.example.invalid/sitemap.xml",
        )
        self.assertContains(response, "Host: portfolio.example.invalid")

    @override_settings(SITE_URL="https://portfolio.example.invalid", LOGIN_REQUIRED=False)
    def test_sitemap_xml_lists_public_pages_under_portfolio_domain(self):
        response = self.client.get(reverse("pages:sitemap_xml"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "<loc>https://portfolio.example.invalid/</loc>",
        )
        self.assertContains(response, "<lastmod>")
        self.assertNotContains(
            response,
            "<loc>https://portfolio.example.invalid/dolmetscher/</loc>",
        )

    @override_settings(SITE_URL="https://portfolio.example.invalid", LOGIN_REQUIRED=False)
    def test_homepage_exposes_portfolio_schema_without_business_or_faq_claims(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"@type": "WebSite"')
        self.assertContains(response, '"@type": "WebPage"')
        self.assertNotContains(response, '"LocalBusiness"')
        self.assertNotContains(response, '"ProfessionalService"')
        self.assertNotContains(response, '"FAQPage"')
        self.assertNotContains(response, '"priceRange"')

    @override_settings(LOGIN_REQUIRED=False)
    def test_public_auth_pages_use_their_indexing_policy(self):
        for url_name, robots in (("pages:login", "index, follow"), ("pages:register", "noindex, follow")):
            with self.subTest(url_name=url_name):
                response = self.client.get(reverse(url_name))

                self.assertEqual(response.status_code, 200)
                self.assertContains(
                    response,
                    f'<meta name="robots" content="{robots}" />',
                    html=True,
                )

    @override_settings(LOGIN_REQUIRED=False)
    def test_authenticated_utility_page_is_noindexed(self):
        user = User.objects.create_user(
            username="seo-user",
            email="seo-user@example.com",
            password="testpass123",
        )
        self.client.force_login(user)

        response = self.client.get(reverse("pages:weather"), follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<meta name="robots" content="noindex, nofollow" />',
            html=True,
        )

    @override_settings(LOGIN_REQUIRED=False)
    def test_production_google_verification_is_not_published(self):
        response = self.client.get("/google-example-verification.html")
        self.assertEqual(response.status_code, 404)


@override_settings(STORAGES={
    **settings.STORAGES,
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class LegacyHostRedirectTests(TestCase):
    @override_settings(
        SITE_URL="https://portfolio.example.invalid",
        SITE_HOST="portfolio.example.invalid",
        REDIRECT_OLD_HOSTS=["www.portfolio.example.invalid"],
        ALLOWED_HOSTS=["testserver", "portfolio.example.invalid", "www.portfolio.example.invalid"],
        LOGIN_REQUIRED=False,
    )
    def test_legacy_fly_host_redirects_to_primary_domain_with_path_and_query(self):
        response = self.client.get(
            reverse("pages:interpreter_list"),
            {"region": "Musterstadt"},
            HTTP_HOST="www.portfolio.example.invalid",
        )

        self.assertEqual(response.status_code, 301)
        self.assertEqual(
            response["Location"],
            "https://portfolio.example.invalid/dolmetscher/?region=Musterstadt",
        )

    @override_settings(
        SITE_URL="https://portfolio.example.invalid",
        SITE_HOST="portfolio.example.invalid",
        REDIRECT_OLD_HOSTS=["www.portfolio.example.invalid"],
        ALLOWED_HOSTS=["testserver", "portfolio.example.invalid", "www.portfolio.example.invalid"],
        LOGIN_REQUIRED=False,
    )
    def test_canonical_host_does_not_self_redirect(self):
        response = self.client.get(reverse("pages:home"), HTTP_HOST="portfolio.example.invalid")

        self.assertEqual(response.status_code, 200)


class PublicAccessTests(TestCase):
    @override_settings(LOGIN_REQUIRED=False)
    def test_home_is_public_for_anonymous_visitors(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="beirit-root"')


    @override_settings(LOGIN_REQUIRED=False)
    def test_service_catalog_redirects_to_competencies(self):
        response = self.client.get(reverse("pages:service_catalog"))

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], reverse("pages:skills_page_no_slash"))


    @override_settings(
        LOGIN_REQUIRED=False,
        CONTACT_EMAIL="private@example.com",
        CONTACT_PHONE_LANDLINE="+49 30 987654",
        CONTACT_REGION="Geheime Adresse 7",
        CONTACT_AVAILABILITY="Nur nach Vereinbarung",
    )
    def test_public_pages_hide_sensitive_contact_details_for_anonymous_visitors(self):
        for page_name in ("pages:home", "pages:donate"):
            response = self.client.get(reverse(page_name), follow=True)

            self.assertEqual(response.status_code, 200)
            self.assertNotContains(response, "private@example.com")
            self.assertNotContains(response, "secure@example.invalid")
            self.assertNotContains(response, "+49 171 2345678")
            self.assertNotContains(response, "+49 30 987654")
            self.assertNotContains(response, "Geheime Adresse 7")
            self.assertNotContains(response, "Nur nach Vereinbarung")
            self.assertNotContains(response, "https://example.invalid/491712345678")
            self.assertNotContains(response, "https://signal.example/private")
            self.assertNotContains(response, "https://example.invalid/private_handle")

        home_response = self.client.get(reverse("pages:home"))
        self.assertNotContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "email"}),
        )
        self.assertNotContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "landline"}),
        )
        self.assertNotContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "signal"}),
        )
        self.assertNotContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "telegram"}),
        )

    @override_settings(
        LOGIN_REQUIRED=False,
        CONTACT_EMAIL="private@example.com",
        CONTACT_PHONE_LANDLINE="+49 33 987654",
        CONTACT_REGION="Geheime Adresse 7",
        CONTACT_AVAILABILITY="Nur nach Vereinbarung",
    )
    def test_home_shows_only_internal_contact_actions_for_logged_in_users(self):
        user = User.objects.create_user(
            username="kontaktkunde",
            email="kontaktkunde@example.com",
            password="testpass123",
        )
        self.client.force_login(user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Signal")
        self.assertNotContains(response, reverse("pages:contact_action", kwargs={"action": "telegram"}))
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "email"}),
        )
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "landline"}),
        )
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "signal"}),
        )
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "telegram"}),
        )
        self.assertNotContains(response, "private@example.com")
        self.assertNotContains(response, "secure@example.invalid")
        self.assertNotContains(response, "+49 150 2345678")
        self.assertNotContains(response, "+49 33 987654")
        self.assertNotContains(response, "https://example.invalid/491502345678")
        self.assertNotContains(response, "https://signal.example/private")
        self.assertNotContains(response, "https://example.invalid/private_handle")

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_action_does_not_redirect_whatsapp(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "whatsapp"})
        )

        self.assertEqual(response.status_code, 404)

    @override_settings(LOGIN_REQUIRED=False, CONTACT_EMAIL="private@example.com")
    def test_contact_action_redirects_email_with_prefilled_recipient(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "email"})
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "mailto:private%40example.com")

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_action_does_not_redirect_proton(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "proton"})
        )

        self.assertEqual(response.status_code, 404)

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_action_does_not_redirect_signal(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "signal"})
        )

        self.assertEqual(response.status_code, 404)

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_action_does_not_redirect_telegram(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "telegram"})
        )

        self.assertEqual(response.status_code, 404)

    @override_settings(
        LOGIN_REQUIRED=False,
        CHAT_CONTACTS=[
            {
                "label": "LegacyMessenger",
                "url": "https://example.invalid/private_handle",
                "hint": "Direkter Kontakt",
            },
            {
                "label": "Signal",
                "url": "https://example.invalid/group",
                "hint": "Alter Gruppenlink",
            },
        ],
    )
    def test_legacy_messenger_contacts_are_hidden(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "telegram"}),
        )
        self.assertNotContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "signal"}),
        )
        self.assertNotContains(response, reverse("pages:contact_action", kwargs={"action": "chat-0"}))
        self.assertNotContains(response, "https://example.invalid/private_handle")
        self.assertNotContains(response, "https://example.invalid/group")

    @override_settings(LOGIN_REQUIRED=False, CONTACT_PHONE_LANDLINE="+49 30 987654")
    def test_contact_action_redirects_landline_without_reverse_lookup(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "landline"})
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "tel:+4930987654")

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_route_renders_accessible_contact_page(self):
        response = self.client.get(reverse("pages:contact"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Kontakt")




class ProfilePageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profilkunde",
            email="profilkunde@example.com",
            password="testpass123",
            first_name="Mila",
        )
        self.profile, _ = Profile.objects.get_or_create(user=self.user)

    def test_profile_page_shows_thumbnail_for_existing_profile_image(self):
        self.profile.image_data = (
            b"GIF87a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff"
            b"\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,"
            b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
        )
        self.profile.image_mime = "image/gif"
        self.profile.image_name = "avatar.gif"
        self.profile.save()

        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:profile"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Aktuelles Profilbild")
        self.assertContains(response, "data:image/gif;base64,")
        self.assertContains(response, "Bild entfernen")
        self.assertContains(response, reverse("pages:delete_account"))

    def test_profile_page_shows_placeholder_when_email_is_missing(self):
        self.user.email = ""
        self.user.save(update_fields=["email"])

        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:profile"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Keine E-Mail hinterlegt")

    def test_profile_page_can_remove_existing_profile_image(self):
        self.profile.image_data = (
            b"GIF87a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff"
            b"\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,"
            b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
        )
        self.profile.image_mime = "image/gif"
        self.profile.image_name = "avatar.gif"
        self.profile.save()

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("pages:profile"),
            {"image-remove_image": "on", "image_submit": "1"},
        )

        self.assertEqual(response.status_code, 302)
        self.profile.refresh_from_db()
        self.assertIsNone(self.profile.image_data)
        self.assertEqual(self.profile.image_mime, "")
        self.assertEqual(self.profile.image_name, "")

    def test_profile_page_can_update_account_data(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("pages:profile"),
            {
                "account-first_name": "Mila",
                "account-last_name": "Demir",
                "account-email": "neu@example.com",
                "account_submit": "1",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Mila")
        self.assertEqual(self.user.last_name, "Demir")
        self.assertEqual(self.user.email, "neu@example.com")
        self.assertEqual(self.user.username, "neu@example.com")

    def test_profile_page_can_clear_optional_name_fields(self):
        self.user.last_name = "Kaya"
        self.user.save(update_fields=["last_name"])

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("pages:profile"),
            {
                "account-first_name": "",
                "account-last_name": "",
                "account-email": "profilkunde@example.com",
                "account_submit": "1",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "")
        self.assertEqual(self.user.last_name, "")

    def test_profile_page_rejects_duplicate_email(self):
        User.objects.create_user(
            username="existing@example.com",
            email="existing@example.com",
            password="testpass123",
        )

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("pages:profile"),
            {
                "account-first_name": "Mila",
                "account-last_name": "",
                "account-email": "existing@example.com",
                "account_submit": "1",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Diese E-Mail wird bereits verwendet.")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "profilkunde@example.com")

    def test_delete_account_removes_user_record(self):
        user_id = self.user.pk

        self.client.force_login(self.user)
        response = self.client.post(reverse("pages:delete_account"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))
        self.assertFalse(User.objects.filter(pk=user_id).exists())

    def test_delete_account_page_shows_placeholder_when_email_is_missing(self):
        self.user.email = ""
        self.user.save(update_fields=["email"])

        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:delete_account"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Keine E-Mail hinterlegt")




@override_settings(
    LOGIN_REQUIRED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="noreply@example.com",
    SITE_URL="https://portfolio.example.invalid",
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class RegistrationVerificationTests(TestCase):
    def test_register_creates_inactive_user_and_sends_verification_mail(self):
        response = self.client.post(
            reverse("pages:register"),
            {
                "email": "neu@example.com",
                "password1": "starkespasswort123",
                "password2": "starkespasswort123",
                "privacy_consent": "on",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response["Location"].startswith(reverse("pages:login")))
        self.assertIn("email=neu%40example.com", response["Location"])
        self.assertNotIn("_auth_user_id", self.client.session)

        user = User.objects.get(email="neu@example.com")
        self.assertFalse(user.is_active)
        self.assertIsNotNone(user.profile.privacy_consent_at)
        self.assertEqual(user.profile.privacy_consent_version, "2026-06-22")
        self.assertEqual(user.profile.privacy_consent_source, "registration")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["neu@example.com"])

        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        verification_link = next(
            line for line in mail.outbox[0].body.splitlines()
            if line.startswith("https://portfolio.example.invalid/verify-email/")
        )
        verification = resolve(urlparse(verification_link).path)
        self.assertEqual(verification.view_name, "pages:verify_email")
        self.assertEqual(verification.kwargs["uidb64"], uidb64)
        self.assertTrue(email_verification_token_generator.check_token(user, verification.kwargs["token"]))

    def test_verify_email_activates_user_and_logs_user_in(self):
        user = User.objects.create_user(
            username="neu@example.com",
            email="neu@example.com",
            password="starkespasswort123",
            is_active=False,
        )
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token_generator.make_token(user)

        response = self.client.get(
            reverse(
                "pages:verify_email",
                kwargs={"uidb64": uidb64, "token": token},
            )
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertEqual(str(self.client.session.get("_auth_user_id")), str(user.pk))

    def test_login_rejects_inactive_user_with_verification_hint(self):
        User.objects.create_user(
            username="neu@example.com",
            email="neu@example.com",
            password="starkespasswort123",
            is_active=False,
        )

        response = self.client.post(
            reverse("pages:login"),
            {
                "username": "neu@example.com",
                "password": "starkespasswort123",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse über den Link in der Bestätigungs-E-Mail.",
        )

    def test_login_expires_at_browser_close(self):
        User.objects.create_user(
            username="aktiv@example.com",
            email="aktiv@example.com",
            password="starkespasswort123",
            is_active=True,
        )

        response = self.client.post(
            reverse("pages:login"),
            {
                "username": "aktiv@example.com",
                "password": "starkespasswort123",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_login_ignores_unsafe_next_redirect(self):
        User.objects.create_user(
            username="sicher@example.com",
            email="sicher@example.com",
            password="starkespasswort123",
            is_active=True,
        )

        response = self.client.post(
            f"{reverse('pages:login')}?next=https://evil.example",
            {
                "username": "sicher@example.com",
                "password": "starkespasswort123",
                "next": "https://evil.example",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))

    def test_register_keeps_no_user_when_verification_mail_fails(self):
        with patch("pages.views.send_account_verification_email", return_value=False):
            response = self.client.post(
                reverse("pages:register"),
                {
                    "email": "fehler@example.com",
                    "password1": "starkespasswort123",
                    "password2": "starkespasswort123",
                    "privacy_consent": "on",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "Bestätigungs-E-Mail konnte gerade nicht versendet werden.",
        )
        self.assertFalse(User.objects.filter(email="fehler@example.com").exists())


@override_settings(LOGIN_REQUIRED=False, SESSION_IDLE_TIMEOUT_SECONDS=180)
class GlobalIdleLogoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="idle@example.com",
            email="idle@example.com",
            password="testpass123",
        )
        self.client_one = Client()
        self.client_two = Client()
        self.client_one.force_login(self.user)
        self.client_two.force_login(self.user)
        self.status_url = reverse("pages:session_status")
        self.activity_url = reverse("pages:session_activity")

    def bootstrap_sessions(self):
        response_one = self.client_one.get(self.status_url)
        response_two = self.client_two.get(self.status_url)
        self.assertEqual(response_one.status_code, 200)
        self.assertEqual(response_two.status_code, 200)

    def test_idle_timeout_logs_user_out_on_all_devices(self):
        self.bootstrap_sessions()
        profile = Profile.objects.get(user=self.user)
        profile.last_activity_at = timezone.now() - timedelta(minutes=4)
        profile.save(update_fields=["last_activity_at"])

        response_one = self.client_one.get(self.status_url)

        self.assertEqual(response_one.status_code, 401)
        self.assertEqual(response_one.json()["reason"], "idle_timeout")
        self.assertNotIn("_auth_user_id", self.client_one.session)

        profile.refresh_from_db()
        self.assertEqual(profile.session_generation, 1)

        response_two = self.client_two.get(self.status_url)

        self.assertEqual(response_two.status_code, 401)
        self.assertEqual(response_two.json()["reason"], "session_revoked")
        self.assertNotIn("_auth_user_id", self.client_two.session)

    def test_activity_on_other_device_keeps_global_session_alive(self):
        self.bootstrap_sessions()
        profile = Profile.objects.get(user=self.user)
        stale_time = timezone.now() - timedelta(seconds=175)
        profile.last_activity_at = stale_time
        profile.save(update_fields=["last_activity_at"])

        response = self.client_two.post(
            self.activity_url,
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        profile.refresh_from_db()
        self.assertGreater(profile.last_activity_at, stale_time)

        response_one = self.client_one.get(self.status_url)

        self.assertEqual(response_one.status_code, 200)
        self.assertTrue(response_one.json()["authenticated"])

    def test_expired_session_redirects_protected_page_with_idle_reason(self):
        self.bootstrap_sessions()
        profile = Profile.objects.get(user=self.user)
        profile.last_activity_at = timezone.now() - timedelta(minutes=4)
        profile.save(update_fields=["last_activity_at"])

        response = self.client_one.get(reverse("pages:profile"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}?reason=idle")
        self.assertNotIn("_auth_user_id", self.client_one.session)

    def test_home_shows_idle_timeout_message(self):
        response = self.client.get(f"{reverse('pages:home')}?reason=idle")

        self.assertEqual(response.status_code, 200)
        messages = [str(message) for message in get_messages(response.wsgi_request)]
        self.assertTrue(any("3 Minuten" in message for message in messages))
