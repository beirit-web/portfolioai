import json
from datetime import date, time, timedelta
from unittest.mock import patch

from django.contrib.messages import get_messages
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
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
    build_account_mailbox_hash,
    build_home_ticker_interpreters,
    build_shared_calendar_days,
    safe_static_url,
)


class ImprintPageTests(TestCase):
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


class CalendarEventsApiTests(TestCase):
    def setUp(self):
        self.interpreter_one = User.objects.create_user(
            username="anna",
            password="testpass123",
            email="anna@example.com",
        )
        self.interpreter_two = User.objects.create_user(
            username="Michael",
            password="testpass123",
            email="michael@example.com",
        )

    def test_events_json_filters_single_interpreter_and_keeps_global_entries(self):
        self.client.force_login(self.interpreter_one)

        Appointment.objects.create(
            interpreter=self.interpreter_one,
            date=date(2026, 3, 12),
            start_time=time(9, 0),
            end_time=time(10, 0),
            subject="Persönlicher Termin",
        )
        Appointment.objects.create(
            interpreter=self.interpreter_two,
            date=date(2026, 3, 13),
            start_time=time(11, 0),
            end_time=time(12, 0),
            subject="Anderer Termin",
        )
        Appointment.objects.create(
            interpreter=None,
            date=date(2026, 3, 14),
            start_time=time(8, 0),
            end_time=time(9, 0),
            subject="Globaler Termin",
        )
        UnavailableDay.objects.create(
            interpreter=None,
            date=date(2026, 3, 15),
            note="Global gesperrt",
        )
        UnavailableDay.objects.create(
            interpreter=self.interpreter_two,
            date=date(2026, 3, 16),
            note="Nur für Michael gesperrt",
        )

        response = self.client.get(
            reverse("pages:events_json"),
            {"interpreter": str(self.interpreter_one.id)},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        event_titles = {event["title"] for event in payload["events"]}

        self.assertIn("Persönlicher Termin", event_titles)
        self.assertIn("Globaler Termin", event_titles)
        self.assertNotIn("Anderer Termin", event_titles)
        self.assertIn("2026-03-15", payload["days"])
        self.assertNotIn("2026-03-16", payload["days"])

    def test_events_json_for_guests_keeps_times_but_hides_private_details(self):
        Appointment.objects.create(
            interpreter=self.interpreter_one,
            date=date(2026, 3, 12),
            start_time=time(9, 0),
            end_time=time(10, 30),
            subject="Vertraulicher Termin",
            location="Musterstadt",
            username="anna",
            note="Nur intern",
        )

        response = self.client.get(
            reverse("pages:events_json"),
            {"interpreter": str(self.interpreter_one.id)},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        event = next(
            item for item in payload["events"] if item["start"] == "2026-03-12T09:00"
        )

        self.assertEqual(event["title"], "Belegt")
        self.assertEqual(event["start"], "2026-03-12T09:00")
        self.assertEqual(event["end"], "2026-03-12T10:30")
        self.assertNotIn("location", event)
        self.assertNotIn("username", event)
        self.assertNotIn("note", event)

    def test_events_batch_json_groups_shared_and_personal_calendar_data(self):
        self.client.force_login(self.interpreter_one)

        Appointment.objects.create(
            interpreter=None,
            date=date(2026, 4, 2),
            start_time=time(10, 0),
            end_time=time(11, 0),
            subject="Globaler Block",
        )
        Appointment.objects.create(
            interpreter=self.interpreter_one,
            date=date(2026, 4, 3),
            start_time=time(14, 0),
            end_time=time(15, 0),
            subject="Nur Anna",
        )
        UnavailableDay.objects.create(
            interpreter=self.interpreter_two,
            date=date(2026, 4, 4),
            note="Fortbildung",
        )

        response = self.client.get(
            reverse("pages:events_batch_json"),
            [
                ("interpreter", str(self.interpreter_one.id)),
                ("interpreter", str(self.interpreter_two.id)),
            ],
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        anna_calendar = payload["calendars"][str(self.interpreter_one.id)]
        boris_calendar = payload["calendars"][str(self.interpreter_two.id)]

        anna_titles = {event["title"] for event in anna_calendar["events"]}
        boris_titles = {event["title"] for event in boris_calendar["events"]}

        self.assertIn("Globaler Block", anna_titles)
        self.assertIn("Nur Anna", anna_titles)
        self.assertIn("Globaler Block", boris_titles)
        self.assertNotIn("Nur Anna", boris_titles)
        self.assertEqual(
            boris_calendar["days"]["2026-04-04"]["note"],
            "Fortbildung",
        )
        self.assertIn("2026-04-03", payload["shared_days"])

    def test_events_json_disables_caching(self):
        response = self.client.get(reverse("pages:events_json"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("no-cache", response["Cache-Control"])
        self.assertIn("no-store", response["Cache-Control"])


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
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
                "images/futuristic_android_pc.mp4",
                fallback_path="images/ladeseite.mp4",
            )

        self.assertEqual(url, "/static/images/ladeseite.mp4")

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

    def test_build_home_ticker_interpreters_formats_and_caches_per_language(self):
        user = User.objects.create_user(
            username="homehelper",
            email="homehelper@example.com",
            password="testpass123",
        )
        InterpreterApplication.objects.create(
            user=user,
            languages="Deutsch, Russisch",
            region="Berlin",
            motivation="Ich helfe bei Formularen.",
            status=InterpreterApplication.STATUS_APPROVED,
        )

        cache.clear()

        with self.assertNumQueries(1):
            de_items = build_home_ticker_interpreters("de")

        self.assertEqual(len(de_items), 2)
        self.assertEqual(de_items[0]["languages"], "Deutsch / Russisch")
        self.assertEqual(de_items[0]["meta"], "Dolmetschen & Begleitung")
        self.assertTrue(de_items[0]["is_default_meta"])

        with self.assertNumQueries(0):
            cached_de_items = build_home_ticker_interpreters("de")

        self.assertEqual(cached_de_items, de_items)

        with self.assertNumQueries(1):
            ru_items = build_home_ticker_interpreters("ru")

        self.assertEqual(ru_items[0]["meta"], "Перевод и сопровождение")

    def test_build_shared_calendar_days_marks_saturday_as_unavailable(self):
        shared_days = build_shared_calendar_days(base_date=date(2026, 3, 1))

        saturday = shared_days["2026-03-07"]
        sunday = shared_days["2026-03-08"]

        self.assertTrue(saturday["weekend"])
        self.assertTrue(saturday["unavailable"])
        self.assertEqual(saturday["note"], "Samstag")
        self.assertTrue(sunday["weekend"])
        self.assertTrue(sunday["unavailable"])

    def test_build_shared_calendar_days_marks_niedersachsen_holiday_as_unavailable(self):
        shared_days = build_shared_calendar_days(base_date=date(2026, 10, 1))

        reformation_day = shared_days["2026-10-31"]

        self.assertTrue(reformation_day["holiday"])
        self.assertTrue(reformation_day["unavailable"])
        self.assertEqual(reformation_day["note"], "Reformationstag")

    def test_build_shared_calendar_days_does_not_mark_heiligabend_as_holiday(self):
        shared_days = build_shared_calendar_days(base_date=date(2026, 12, 1))

        self.assertNotIn("2026-12-24", shared_days)

@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class AdminDashboardTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="testpass123",
        )
        self.user = User.objects.create_user(
            username="maria",
            email="maria@example.com",
            password="testpass123",
        )
        self.client.force_login(self.admin_user)

    def test_admin_index_renders_dashboard_cards(self):
        InterpreterApplication.objects.create(
            user=self.user,
            languages="Deutsch, Ukrainisch",
            region="Berlin",
            motivation="Ich möchte helfen.",
        )
        open_message = ChatMessage.objects.create(
            lang="de",
            user=self.user,
            contact_email="maria@example.com",
            client_hash="client-1234567890",
            text="Ich brauche Unterstützung bei einem Termin.",
            handled=False,
        )
        ChatReply.objects.create(
            client_hash="client-1234567890",
            text="Wir melden uns zeitnah.",
            delivered=False,
        )
        delivered_reply = ChatReply.objects.create(
            client_hash="client-2222222222",
            text="Ihr Termin wurde bestätigt.",
            delivered=True,
        )
        Appointment.objects.create(
            interpreter=self.user,
            date=date(2026, 5, 3),
            start_time=time(11, 0),
            end_time=time(12, 0),
            subject="Arzttermin",
        )
        blocked_day = UnavailableDay.objects.create(
            interpreter=self.user,
            date=date(2026, 5, 4),
            note="Fortbildung",
        )
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hierarchische Verwaltungsstruktur")
        self.assertContains(response, "Ordnerbaum")
        self.assertContains(response, "Schnellzugriff")
        self.assertContains(response, "Administration")
        self.assertContains(response, "Authentifizierung und Autorisierung")
        self.assertContains(response, "Benutzer und Profile")
        self.assertContains(response, "Kommunikation")
        self.assertContains(response, "Termine und Verfügbarkeit")
        self.assertContains(response, "Bewerbungen")
        self.assertContains(response, "Inhalte und Datenmodelle")
        self.assertContains(response, "Kontonachrichten")
        self.assertContains(response, "Rückrufwünsche")
        self.assertContains(response, "Kontodokumente")
        self.assertContains(response, reverse("admin:pages_chatmessage_changelist"))
        self.assertContains(response, reverse("admin:pages_chatreply_changelist"))
        self.assertContains(response, reverse("admin:pages_unavailableday_changelist"))
        self.assertContains(response, reverse("admin:pages_accountnotice_changelist"))
        self.assertContains(response, reverse("admin:pages_callbackrequest_changelist"))

    def test_admin_index_orders_sections_by_operational_priority(self):
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")

        self.assertLess(content.index('id="administration"'), content.index('id="authentication"'))
        self.assertLess(content.index('id="authentication"'), content.index('id="profiles"'))
        self.assertLess(content.index('id="profiles"'), content.index('id="communication"'))
        self.assertLess(content.index('id="communication"'), content.index('id="scheduling"'))
        self.assertLess(content.index('id="scheduling"'), content.index('id="applications"'))
        self.assertLess(content.index("<h2>Bewerbungen</h2>"), content.index("<h2>Inhalte und Datenmodelle</h2>"))

    def test_new_admin_model_registrations_are_available(self):
        changelist_urls = (
            "admin:pages_profile_changelist",
            "admin:pages_appointment_changelist",
            "admin:pages_unavailableday_changelist",
            "admin:pages_accountdocument_changelist",
            "admin:pages_accountnotice_changelist",
            "admin:pages_callbackrequest_changelist",
        )

        for url_name in changelist_urls:
            response = self.client.get(reverse(url_name))
            self.assertEqual(response.status_code, 200, url_name)


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class AdminAccountWorkflowTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="workflow-admin",
            email="workflow-admin@example.com",
            password="testpass123",
        )
        self.user = User.objects.create_user(
            username="helena@example.com",
            email="helena@example.com",
            password="testpass123",
        )
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.callback_phone = "+49 151 11111111"
        profile.callback_time_windows = "Werktags 09 bis 14 Uhr"
        profile.notify_new_reply = True
        profile.notify_new_message = False
        profile.notify_appointment_changes = True
        profile.save()
        self.callback_request = CallbackRequest.objects.create(
            user=self.user,
            phone="+49 151 77777777",
            time_windows="Montag bis Mittwoch 10 bis 13 Uhr",
            note="Bitte zuerst Nachricht senden.",
        )
        AccountDocument.objects.create(
            user=self.user,
            title="Jobcenter Bescheid",
            note="Dokument fuer Sidebar-Test",
            file_data=b"pdf-test",
            file_name="jobcenter.pdf",
            file_mime="application/pdf",
            file_size=8,
        )
        AccountNotice.objects.create(
            user=self.user,
            title="Rueckruf intern vorgemerkt",
            text="Bitte bevorzugt Dienstag kontaktieren.",
        )
        ChatMessage.objects.create(
            lang="de",
            user=self.user,
            contact_email=self.user.email,
            client_hash=build_account_mailbox_hash(self.user),
            text="Ich bin Dienstag zwischen 10 und 13 Uhr erreichbar.",
            handled=False,
        )
        ChatReply.objects.create(
            client_hash=build_account_mailbox_hash(self.user),
            text="Vielen Dank, wir melden uns in diesem Zeitraum.",
            delivered=False,
        )
        self.client.force_login(self.admin_user)

    def test_callback_request_change_view_offers_prefilled_notice_link(self):
        response = self.client.get(
            reverse("admin:pages_callbackrequest_change", args=[self.callback_request.pk])
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Kontonachricht vorbereiten")
        self.assertContains(response, f"user={self.user.pk}")
        self.assertContains(response, "Letzter Postfachverlauf")
        self.assertContains(response, "Letzte Kontonachrichten")
        self.assertContains(response, "Neueste Dokumente")
        self.assertContains(response, "Kontostatus")
        self.assertContains(response, "Profil öffnen")
        self.assertContains(response, "Dokumente öffnen")
        self.assertContains(response, "Postfach öffnen")
        self.assertContains(response, "Kontonachrichten öffnen")
        self.assertContains(response, "helena@example.com")
        self.assertContains(response, "+49 151 11111111")
        self.assertContains(response, "Werktags 09 bis 14 Uhr")
        self.assertContains(response, "E-Mail bei Kontonachricht")
        self.assertContains(response, "Deaktiviert")
        self.assertContains(response, f"user__id__exact={self.user.pk}")
        self.assertContains(response, "Jobcenter Bescheid")
        self.assertContains(response, "Rueckruf intern vorgemerkt")
        self.assertContains(response, "Ich bin Dienstag zwischen 10 und 13 Uhr erreichbar.")

    def test_account_notice_add_view_prefills_data_from_querystring(self):
        response = self.client.get(
            reverse("admin:pages_accountnotice_add"),
            {
                "user": self.user.pk,
                "title": "Rueckmeldung zum Rueckruf",
                "text": "Bitte morgen um 11 Uhr erreichbar sein.",
                "next": reverse("admin:pages_callbackrequest_change", args=[self.callback_request.pk]),
            },
        )

        self.assertEqual(response.status_code, 200)
        form = response.context["adminform"].form
        self.assertEqual(form.initial["user"], str(self.user.pk))
        self.assertEqual(form.initial["title"], "Rueckmeldung zum Rueckruf")
        self.assertEqual(form.initial["text"], "Bitte morgen um 11 Uhr erreichbar sein.")
        self.assertEqual(
            response.context["account_notice_back_url"],
            reverse("admin:pages_callbackrequest_change", args=[self.callback_request.pk]),
        )


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

    @override_settings(
        CHAT_CONTACTS=[
            {
                "label": "Viber",
                "url": "https://viber.example/nadia",
                "hint": "Schnelle Rückfragen",
            }
        ]
    )
    def test_legacy_interpreter_page_redirects_to_home_services_section(self):
        response = self.client.get(reverse("pages:interpreter_list"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}#leistungen")


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
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
    def test_public_utility_pages_are_noindexed(self):
        for url_name in ("pages:login", "pages:register"):
            with self.subTest(url_name=url_name):
                response = self.client.get(reverse(url_name))

                self.assertEqual(response.status_code, 200)
                self.assertContains(
                    response,
                    '<meta name="robots" content="noindex, follow" />',
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


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
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
    def test_home_uses_services_anchor_instead_of_interpreter_page_link(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="beirit-root"')
        self.assertNotContains(response, reverse("pages:interpreter_list"))

    @override_settings(LOGIN_REQUIRED=False)
    def test_service_catalog_redirects_to_competencies(self):
        response = self.client.get(reverse("pages:service_catalog"))

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], reverse("pages:skills_page_no_slash"))

    @override_settings(LOGIN_REQUIRED=False)
    def test_interpreter_list_redirects_to_home_services_section_even_with_query(self):
        response = self.client.get(
            reverse("pages:interpreter_list"),
            {"profil": "eugen"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}#leistungen")

    @override_settings(
        LOGIN_REQUIRED=False,
        CONTACT_EMAIL="private@example.com",
        CONTACT_PHONE_LANDLINE="+49 30 987654",
        CONTACT_REGION="Geheime Adresse 7",
        CONTACT_AVAILABILITY="Nur nach Vereinbarung",
    )
    def test_public_pages_hide_sensitive_contact_details_for_anonymous_visitors(self):
        for page_name in ("pages:home", "pages:donate"):
            response = self.client.get(reverse(page_name))

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

    @override_settings(LOGIN_REQUIRED=False, CALENDAR_ENABLED=True)
    def test_home_does_not_embed_legacy_calendar_for_approved_interpreter(self):
        user = User.objects.create_user(
            username="dolmetscherin",
            email="dolmetscherin@example.com",
            password="testpass123",
        )
        InterpreterApplication.objects.create(
            user=user,
            status=InterpreterApplication.STATUS_APPROVED,
            display_name="Dolmetscherin",
            languages="Deutsch, Russisch",
            region="Berlin",
        )
        self.client.force_login(user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"isAuthenticated": true')
        self.assertNotContains(response, 'id="availabilityCalendar"')

    @override_settings(LOGIN_REQUIRED=False, CALENDAR_ENABLED=True)
    def test_home_hides_calendar_for_guest(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"isAuthenticated": false')
        self.assertNotContains(response, 'id="availabilityCalendar"')


class HomeAccountCardTests(TestCase):
    @override_settings(LOGIN_REQUIRED=False)
    def test_home_shows_account_actions_for_logged_in_user(self):
        user = User.objects.create_user(
            username="kundin",
            email="kundin@example.com",
            password="testpass123",
            first_name="Nadia",
        )
        self.client.force_login(user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"isAuthenticated": true')
        self.assertContains(response, 'id="beirit-root"')
        self.assertNotContains(response, "Ihr Begleiter durch den Papierdschungel")


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
        self.assertContains(response, "Keine E-Mail hinterlegt", count=3)

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


class InterpreterContactBookTests(TestCase):
    def setUp(self):
        self.interpreter = User.objects.create_user(
            username="nadia",
            email="nadia@example.com",
            password="testpass123",
        )
        InterpreterApplication.objects.create(
            user=self.interpreter,
            display_name="Nadia",
            languages="Deutsch, Arabisch",
            region="Berlin",
            motivation="Ich dolmetsche bei Terminen.",
            status=InterpreterApplication.STATUS_APPROVED,
        )
        self.contact_user = User.objects.create_user(
            username="amir",
            email="amir@example.com",
            password="testpass123",
            first_name="Amir",
        )

    def test_dashboard_shows_logged_in_chat_users_in_contact_book(self):
        ChatMessage.objects.create(
            lang="de",
            user=self.contact_user,
            contact_email=self.contact_user.email,
            client_hash="client-abc",
            text="Ich brauche Hilfe beim Arzttermin.",
            handled=False,
        )
        self.client.force_login(self.interpreter)

        response = self.client.get(reverse("pages:interpreter_dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Kontaktbuch")
        self.assertContains(response, "Amir")
        self.assertContains(response, "amir@example.com")
        self.assertContains(response, "Ich brauche Hilfe beim Arzttermin.")

    def test_dashboard_can_reply_to_contact_book_entry(self):
        ChatMessage.objects.create(
            lang="de",
            user=self.contact_user,
            contact_email=self.contact_user.email,
            client_hash="client-abc",
            text="Können Sie mir schreiben?",
            handled=False,
        )
        self.client.force_login(self.interpreter)

        response = self.client.post(
            reverse("pages:interpreter_dashboard"),
            {
                "action": "reply_contact",
                "contact_key": f"user:{self.contact_user.id}",
                "reply_text": "Ja, ich antworte Ihnen hier.",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            ChatReply.objects.filter(
                client_hash="client-abc",
                text="Ja, ich antworte Ihnen hier.",
            ).exists()
        )
        self.assertTrue(
            ChatMessage.objects.filter(
                user=self.contact_user, handled=True).exists()
        )

    def test_dashboard_shows_unassigned_chat_messages_as_fallback_contacts(self):
        ChatMessage.objects.create(
            lang="de",
            user=None,
            contact_email="",
            client_hash="anon-1234567890",
            text="Hallo, ich habe schon zweimal geschrieben.",
            handled=False,
        )
        ChatMessage.objects.create(
            lang="de",
            user=None,
            contact_email="",
            client_hash="anon-1234567890",
            text="Kommt das bei Ihnen an?",
            handled=False,
        )
        self.client.force_login(self.interpreter)

        response = self.client.get(reverse("pages:interpreter_dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Kontakt anon-12345")
        self.assertContains(response, "Kommt das bei Ihnen an?")


@override_settings(
    LOGIN_REQUIRED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="noreply@example.com",
    SITE_URL="https://portfolio.example.invalid",
    STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage",
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
        token = email_verification_token_generator.make_token(user)
        verification_path = reverse(
            "pages:verify_email",
            kwargs={"uidb64": uidb64, "token": token},
        )
        self.assertIn(verification_path, mail.outbox[0].body)

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


class ProfileAccountWorkspaceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="konto@example.com",
            email="konto@example.com",
            password="testpass123",
        )
        Profile.objects.get_or_create(user=self.user)
        self.client.force_login(self.user)

    def test_profile_page_renders_account_workspace_sections(self):
        response = self.client.get(reverse("pages:profile"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Dokumentenablage")
        self.assertContains(response, "Internes Postfach")
        self.assertContains(response, "Rückruf &amp; Terminfenster")
        self.assertContains(response, "E-Mail-Benachrichtigungen steuern")
        self.assertNotContains(response, 'name="document_submit"')
        self.assertNotContains(response, 'name="image_submit"')

    def test_uploads_are_disabled_by_default(self):
        upload = SimpleUploadedFile(
            "jobcenter-brief.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )

        response = self.client.post(
            reverse("pages:profile"),
            {
                "document-title": "Jobcenter Brief",
                "document_submit": "1",
                "document-file": upload,
            },
        )

        self.assertRedirects(response, reverse("pages:profile"))
        self.assertFalse(AccountDocument.objects.filter(user=self.user).exists())

        api_response = self.client.post(
            reverse("pages:upload_document"),
            {"file": upload},
        )
        self.assertEqual(api_response.status_code, 404)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="smtp.example.test",
        EMAIL_HOST_USER="noreply@example.com",
        DEFAULT_FROM_EMAIL="noreply@example.com",
        CONTACT_EMAIL="team@example.com",
        USER_UPLOADS_ENABLED=True,
    )
    def test_profile_document_upload_and_download(self):
        upload = SimpleUploadedFile(
            "jobcenter-brief.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )

        response = self.client.post(
            reverse("pages:profile"),
            {
                "document-title": "Jobcenter Brief",
                "document-note": "Bitte spaeter besprechen",
                "document_submit": "1",
                "document-file": upload,
            },
        )

        self.assertRedirects(response, reverse("pages:profile"))
        document = AccountDocument.objects.get(user=self.user)
        self.assertEqual(document.title, "Jobcenter Brief")
        self.assertEqual(document.file_name, "jobcenter-brief.pdf")
        self.assertEqual(document.file_size, len(b"%PDF-1.4 test"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["team@example.com"])

        download_response = self.client.get(
            reverse("pages:account_document_download", args=[document.pk])
        )

        self.assertEqual(download_response.status_code, 200)
        self.assertEqual(download_response.content, b"%PDF-1.4 test")
        self.assertIn("attachment;", download_response["Content-Disposition"])

    def test_profile_mailbox_submit_creates_account_thread_message(self):
        response = self.client.post(
            reverse("pages:profile"),
            {
                "mailbox-text": "Ich brauche Hilfe mit einem Formular.",
                "mailbox_submit": "1",
            },
        )

        self.assertRedirects(response, reverse("pages:profile"))
        message = ChatMessage.objects.get(user=self.user)
        self.assertEqual(message.client_hash, build_account_mailbox_hash(self.user))
        self.assertEqual(message.text, "Ich brauche Hilfe mit einem Formular.")
        self.assertEqual(message.contact_email, "konto@example.com")

    def test_profile_callback_request_updates_defaults(self):
        response = self.client.post(
            reverse("pages:profile"),
            {
                "callback-phone": "+49 151 12345678",
                "callback-time_windows": "Mo-Do 09:00-12:00",
                "callback-note": "Bitte zuerst kurz ankundigen",
                "callback_submit": "1",
            },
        )

        self.assertRedirects(response, reverse("pages:profile"))
        callback_request = CallbackRequest.objects.get(user=self.user)
        self.assertEqual(callback_request.phone, "+49 151 12345678")
        self.assertEqual(callback_request.time_windows, "Mo-Do 09:00-12:00")
        self.user.refresh_from_db()
        profile = self.user.profile
        self.assertEqual(profile.callback_phone, "+49 151 12345678")
        self.assertEqual(profile.callback_time_windows, "Mo-Do 09:00-12:00")

    def test_profile_notification_preferences_can_be_saved(self):
        response = self.client.post(
            reverse("pages:profile"),
            {
                "notifications-callback_phone": "+49 152 00000000",
                "notifications-callback_time_windows": "Freitag ab 14 Uhr",
                "notifications-notify_new_message": "on",
                "notifications_submit": "1",
            },
        )

        self.assertRedirects(response, reverse("pages:profile"))
        self.user.refresh_from_db()
        profile = self.user.profile
        self.assertEqual(profile.callback_phone, "+49 152 00000000")
        self.assertEqual(profile.callback_time_windows, "Freitag ab 14 Uhr")
        self.assertFalse(profile.notify_new_reply)
        self.assertTrue(profile.notify_new_message)
        self.assertFalse(profile.notify_appointment_changes)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_HOST="smtp.example.test",
    EMAIL_HOST_USER="noreply@example.com",
    DEFAULT_FROM_EMAIL="noreply@example.com",
    SITE_URL="https://portfolio.example.invalid",
)
class AccountNotificationSignalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="signals@example.com",
            email="signals@example.com",
            password="testpass123",
        )
        self.profile, _ = Profile.objects.get_or_create(user=self.user)

    def test_chat_reply_sends_mail_for_account_mailbox_thread(self):
        ChatMessage.objects.create(
            lang="de",
            user=self.user,
            contact_email=self.user.email,
            client_hash=build_account_mailbox_hash(self.user),
            text="Erste Kontonachricht",
            handled=False,
        )

        ChatReply.objects.create(
            client_hash=build_account_mailbox_hash(self.user),
            text="Wir haben Ihre Nachricht erhalten.",
            delivered=False,
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn("Neue Antwort", mail.outbox[0].subject)
        self.assertIn("Wir haben Ihre Nachricht erhalten.", mail.outbox[0].body)

    def test_account_notice_respects_notification_preference(self):
        self.profile.notify_new_message = False
        self.profile.save(update_fields=["notify_new_message"])

        AccountNotice.objects.create(
            user=self.user,
            title="Interner Hinweis",
            text="Bitte laden Sie das fehlende Formular hoch.",
        )

        self.assertEqual(len(mail.outbox), 0)

        self.profile.notify_new_message = True
        self.profile.save(update_fields=["notify_new_message"])

        AccountNotice.objects.create(
            user=self.user,
            title="Neue interne Nachricht",
            text="Der Termin wurde intern vorbereitet.",
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Neue interne Nachricht")

    def test_callback_request_update_sends_mail_when_status_changes(self):
        callback_request = CallbackRequest.objects.create(
            user=self.user,
            phone="+49 151 99999999",
            time_windows="Dienstag 10-12 Uhr",
            note="Bitte nur vormittags anrufen.",
        )

        self.assertEqual(len(mail.outbox), 0)

        callback_request.status = CallbackRequest.STATUS_SCHEDULED
        callback_request.scheduled_for = timezone.make_aware(
            timezone.datetime(2026, 5, 5, 10, 30)
        )
        callback_request.note = "Terminfenster bestaetigt"
        callback_request.save()

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn("Aktualisierung", mail.outbox[0].subject)
        self.assertIn("Termin geplant", mail.outbox[0].body)
