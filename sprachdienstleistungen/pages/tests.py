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

from .models import (
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
from utils.tokens import email_verification_token_generator
from .views import (
    build_account_mailbox_hash,
    build_home_ticker_interpreters,
    build_shared_calendar_days,
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

    def test_events_json_marks_pending_requests_busy_and_ignores_released_statuses(self):
        Appointment.objects.create(
            date=date(2026, 9, 5),
            preferred_time=time(10, 0),
            start_time=time(10, 0),
            name="Pending Kunde",
            status=Appointment.STATUS_PENDING,
        )
        Appointment.objects.create(
            date=date(2026, 9, 12),
            preferred_time=time(10, 0),
            start_time=time(10, 0),
            name="Abgelehnt",
            status=Appointment.STATUS_REJECTED,
        )
        Appointment.objects.create(
            date=date(2026, 9, 19),
            preferred_time=time(10, 0),
            start_time=time(10, 0),
            name="Storniert",
            status=Appointment.STATUS_CANCELLED,
        )

        response = self.client.get(reverse("pages:events_json"))
        payload = response.json()

        self.assertTrue(payload["days"]["2026-09-05"]["busy"])
        self.assertFalse(payload["days"].get("2026-09-12", {}).get("busy", False))
        self.assertFalse(payload["days"].get("2026-09-19", {}).get("busy", False))


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class WeatherPageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="weatheruser",
            email="weatheruser@example.com",
            password="testpass123",
        )

    def test_weather_page_requires_login(self):
        response = self.client.get(reverse("pages:weather"))

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("pages:login"), response["Location"])

    def test_weather_page_renders(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:weather"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "weather-widget")
        self.assertContains(response, "Bisher am kältesten")

    def test_weather_page_disables_caching(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("pages:weather"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("no-cache", response["Cache-Control"])
        self.assertIn("no-store", response["Cache-Control"])


class HomeViewHelperTests(TestCase):
    def tearDown(self):
        cache.clear()
        super().tearDown()

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

    def test_build_shared_calendar_days_keeps_saturday_available_and_blocks_sunday(self):
        shared_days = build_shared_calendar_days(base_date=date(2026, 3, 1))

        saturday = shared_days["2026-03-07"]
        sunday = shared_days["2026-03-08"]

        self.assertTrue(saturday["weekend"])
        self.assertFalse(saturday.get("unavailable", False))
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
class AppointmentRequestTests(TestCase):
    def setUp(self):
        # Fixture dates stay future Saturdays regardless of the execution date.
        today_patch = patch("pages.forms.timezone.localdate", return_value=date(2026, 9, 1))
        today_patch.start()
        self.addCleanup(today_patch.stop)

    def appointment_payload(self, **overrides):
        payload = {
            "action": "request_appointment",
            "name": "Maria Muster",
            "email": "maria@example.com",
            "phone": "",
            "date": "2026-09-05",
            "preferred_time": "10:30",
            "appointment_type": Appointment.APPOINTMENT_TYPE_ONLINE,
            "message": "Bitte online.",
            "privacy_consent": "on",
        }
        payload.update(overrides)
        return payload

    def test_appointment_booking_page_renders_calendar_for_direct_google_link(self):
        response = self.client.get(reverse("pages:appointment_booking"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Samstagstermin buchen")
        self.assertContains(response, 'data-appointment-calendar')
        self.assertContains(response, reverse("pages:events_json"))
        self.assertContains(response, "window.CALENDAR_ENABLED = true")

    def test_portfolio_home_has_no_appointment_booking_link(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, f'href="{reverse("pages:appointment_booking")}"')
        self.assertNotContains(response, "Samstagstermin buchen")
        self.assertContains(response, "Portfolio-Fallstudie")

    def test_appointment_booking_request_requires_email_or_phone(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(email="", phone=""),
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "Bitte geben Sie mindestens eine Kontaktmöglichkeit an: E-Mail-Adresse oder Mobilnummer.",
        )
        self.assertFalse(Appointment.objects.filter(name="Maria Muster").exists())

    def test_appointment_booking_request_accepts_international_phone_without_email(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(email="", phone="+49 151 12345678"),
        )

        self.assertEqual(response.status_code, 200)
        appointment = Appointment.objects.get(name="Maria Muster")
        self.assertEqual(appointment.status, Appointment.STATUS_PENDING)
        self.assertEqual(appointment.name, "Maria Muster")
        self.assertEqual(appointment.email, "")
        self.assertEqual(appointment.phone, "+49 151 12345678")
        self.assertEqual(appointment.preferred_time, time(10, 30))
        self.assertEqual(appointment.start_time, time(10, 30))
        self.assertEqual(appointment.appointment_type, Appointment.APPOINTMENT_TYPE_ONLINE)
        self.assertContains(
            response,
            "Wir melden uns über die von Ihnen angegebene Kontaktmöglichkeit, um den Termin zu bestätigen.",
        )
        self.assertNotContains(response, "endgültig bestätigt")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="smtp.example.test",
        EMAIL_HOST_USER="noreply@example.com",
        DEFAULT_FROM_EMAIL="noreply@example.com",
        APPOINTMENT_REQUEST_EMAIL="team@example.com",
        CONTACT_EMAIL="team@example.com",
        ADMIN_URL="admin/",
        SITE_URL="https://languages.example.invalid",
    )
    def test_appointment_booking_request_sends_internal_notification(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(
                email="maria@example.com",
                phone="+49 151 12345678",
                message="Bitte online mit kurzer Vorbereitung.",
            ),
        )

        self.assertEqual(response.status_code, 200)
        appointment = Appointment.objects.get(name="Maria Muster")
        self.assertEqual(len(mail.outbox), 1)
        notification = mail.outbox[0]
        self.assertEqual(notification.to, ["team@example.com"])
        self.assertIn("Neue Terminanfrage", notification.subject)
        self.assertIn("Name: Maria Muster", notification.body)
        self.assertIn("E-Mail: maria@example.com", notification.body)
        self.assertIn("Mobilnummer: +49 151 12345678", notification.body)
        self.assertIn("Datum: 05.09.2026", notification.body)
        self.assertIn("Gewünschte Uhrzeit: 10:30", notification.body)
        self.assertIn("Online-Sprachmittlung", notification.body)
        self.assertIn("Bitte online mit kurzer Vorbereitung.", notification.body)
        self.assertIn(
            f"/admin/pages/appointment/{appointment.pk}/change/",
            notification.body,
        )

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="smtp.example.test",
        EMAIL_HOST_USER="noreply@example.com",
        DEFAULT_FROM_EMAIL="noreply@example.com",
        APPOINTMENT_REQUEST_EMAIL="team@example.com",
        ADMIN_URL="hidden-%admin/",
        SITE_URL="https://languages.example.invalid",
    )
    def test_appointment_notification_does_not_reverse_admin_url(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(),
        )

        self.assertEqual(response.status_code, 200)
        appointment = Appointment.objects.get(name="Maria Muster")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            f"/hidden-%admin/pages/appointment/{appointment.pk}/change/",
            mail.outbox[0].body,
        )

    def test_appointment_booking_request_rejects_invalid_email_and_phone(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(email="ungueltig", phone="abc"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Bitte gültige E-Mail-Adresse eingeben.")
        self.assertContains(response, "Bitte geben Sie eine gültige Mobilnummer ein")
        self.assertFalse(Appointment.objects.filter(name="Maria Muster").exists())

    def test_appointment_booking_request_only_accepts_free_saturdays(self):
        Appointment.objects.create(
            date=date(2026, 9, 5),
            preferred_time=time(9, 0),
            start_time=time(9, 0),
            status=Appointment.STATUS_PENDING,
        )

        busy_response = self.client.post(reverse("pages:appointment_booking"), self.appointment_payload())

        self.assertEqual(busy_response.status_code, 200)
        self.assertContains(busy_response, "Dieser Samstag ist nicht mehr frei.")
        self.assertFalse(Appointment.objects.filter(name="Maria Muster").exists())

        Appointment.objects.filter(date=date(2026, 9, 5)).update(status=Appointment.STATUS_CANCELLED)
        released_response = self.client.post(reverse("pages:appointment_booking"), self.appointment_payload())

        self.assertEqual(released_response.status_code, 200)
        self.assertEqual(Appointment.objects.filter(name="Maria Muster", status=Appointment.STATUS_PENDING).count(), 1)

    def test_appointment_booking_request_rejects_weekdays(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(date="2026-09-04"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Bitte wählen Sie einen Samstag aus.")
        self.assertFalse(Appointment.objects.filter(name="Maria Muster").exists())

    def test_appointment_booking_request_requires_privacy_consent(self):
        response = self.client.post(
            reverse("pages:appointment_booking"),
            self.appointment_payload(privacy_consent=""),
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Bitte bestätigen Sie die Datenschutz-Zustimmung.")
        self.assertFalse(Appointment.objects.filter(name="Maria Muster").exists())


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

    def test_appointment_admin_shows_customer_request_details_and_actions(self):
        appointment = Appointment.objects.create(
            date=date(2026, 9, 5),
            preferred_time=time(10, 30),
            start_time=time(10, 30),
            appointment_type=Appointment.APPOINTMENT_TYPE_ONLINE,
            name="Maria Muster",
            email="maria@example.com",
            phone="+49 151 12345678",
            message="Bitte online.",
            status=Appointment.STATUS_PENDING,
        )

        changelist_response = self.client.get(reverse("admin:pages_appointment_changelist"))

        self.assertEqual(changelist_response.status_code, 200)
        self.assertContains(changelist_response, "Maria Muster")
        self.assertContains(changelist_response, "maria@example.com")
        self.assertContains(changelist_response, "+49 151 12345678")
        self.assertContains(changelist_response, "Anfrage offen")

        change_response = self.client.get(
            reverse("admin:pages_appointment_change", args=[appointment.id])
        )

        self.assertEqual(change_response.status_code, 200)
        self.assertContains(change_response, "Bitte online.")
        self.assertContains(change_response, "Online-Sprachmittlung")

        action_response = self.client.post(
            reverse("admin:pages_appointment_changelist"),
            {
                "action": "confirm_appointments",
                "_selected_action": [str(appointment.id)],
                "index": "0",
            },
            follow=True,
        )
        appointment.refresh_from_db()

        self.assertEqual(action_response.status_code, 200)
        self.assertEqual(appointment.status, Appointment.STATUS_CONFIRMED)


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


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
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

    @override_settings(CONTACT_PHONE_WHATSAPP="+49 171 2345678")
    def test_home_contact_panel_uses_only_email_and_whatsapp(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "email"}),
        )
        self.assertContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "whatsapp"}),
        )

    def test_legacy_interpreter_page_redirects_to_home_services_section(self):
        response = self.client.get(reverse("pages:interpreter_list"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}#leistungen")


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class SeoSignalTests(TestCase):
    @override_settings(SITE_URL="https://languages.example.invalid", LOGIN_REQUIRED=False)
    def test_homepage_uses_primary_domain_for_canonical_and_open_graph(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://languages.example.invalid/" />',
            html=True,
        )
        self.assertContains(
            response,
            '<meta property="og:url" content="https://languages.example.invalid/" />',
            html=True,
        )

    @override_settings(LOGIN_REQUIRED=False)
    def test_homepage_renders_auth_session_flag_as_boolean_for_guests(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"isAuthenticated": false')

    @override_settings(
        SITE_URL="https://languages.example.invalid",
        SITE_HOST="languages.example.invalid",
        LOGIN_REQUIRED=False,
    )
    def test_robots_txt_references_primary_domain_sitemap(self):
        response = self.client.get(reverse("pages:robots_txt"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "Sitemap: https://languages.example.invalid/sitemap.xml",
        )
        self.assertContains(response, "Host: languages.example.invalid")

    @override_settings(SITE_URL="https://languages.example.invalid", LOGIN_REQUIRED=False)
    def test_sitemap_xml_lists_public_pages_under_primary_domain(self):
        response = self.client.get(reverse("pages:sitemap_xml"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            "<loc>https://languages.example.invalid/</loc>",
        )
        self.assertContains(response, "<lastmod>")
        self.assertNotContains(response, "/spenden/")
        self.assertNotContains(
            response,
            "<loc>https://languages.example.invalid/dolmetscher/</loc>",
        )

    @override_settings(SITE_URL="https://languages.example.invalid", LOGIN_REQUIRED=False)
    def test_homepage_exposes_local_business_and_faq_schema(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"@type": ["LocalBusiness", "ProfessionalService"]')
        self.assertContains(response, '"@type": "FAQPage"')
        self.assertContains(response, "Deutsch-Russisch Dolmetsch- und Sprachdienstleistungen")

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

        response = self.client.get(reverse("pages:weather"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<meta name="robots" content="noindex, follow" />',
            html=True,
        )

    @override_settings(LOGIN_REQUIRED=False)
    def test_portfolio_does_not_serve_google_site_verification(self):
        response = self.client.get("/google-example-verification.html")

        self.assertEqual(response.status_code, 404)
        self.assertNotContains(response, "google-site-verification:", status_code=404)


@override_settings(
    CONTENT_SECURITY_POLICY_ENFORCE=False,
    LOGIN_REQUIRED=False,
    SECURE_HSTS_INCLUDE_SUBDOMAINS=True,
    SECURE_HSTS_PRELOAD=True,
    SECURE_HSTS_SECONDS=31536000,
    SITE_URL="https://portfolio.example.invalid",
    SITE_HOST="portfolio.example.invalid",
    STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage",
)
class PublicSecurityHeaderTests(TestCase):
    def test_homepage_sends_hardened_security_headers(self):
        response = self.client.get(reverse("pages:home"), secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Strict-Transport-Security"], "max-age=31536000; includeSubDomains; preload")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["X-Frame-Options"], "DENY")
        self.assertEqual(response["Referrer-Policy"], "strict-origin-when-cross-origin")
        self.assertIn("camera=()", response["Permissions-Policy"])
        self.assertIn("default-src 'self'", response["Content-Security-Policy-Report-Only"])
        self.assertNotIn("Content-Security-Policy", response)

    def test_security_txt_is_served_from_well_known_path(self):
        response = self.client.get(reverse("pages:security_txt"), secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/plain; charset=utf-8")
        self.assertContains(response, "Contact: mailto:max.mustermann@example.com")
        self.assertContains(response, "Preferred-Languages: de, ru, uk")
        self.assertContains(response, "Canonical: https://portfolio.example.invalid/.well-known/security.txt")

    def test_healthz_is_lightweight_json_for_monitoring(self):
        response = self.client.get(reverse("pages:healthz"), secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json(), {"status": "ok", "service": "sprachdienstleistungen"})
        self.assertEqual(response["Cache-Control"], "max-age=0, no-cache, no-store, must-revalidate, private")


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class LegacyHostRedirectTests(TestCase):
    @override_settings(
        SITE_URL="https://languages.example.invalid",
        SITE_HOST="languages.example.invalid",
        REDIRECT_OLD_HOSTS=["legacy-language.example.invalid", "www.legacy-language.example.invalid"],
        ALLOWED_HOSTS=["testserver", "languages.example.invalid", "legacy-language.example.invalid", "www.legacy-language.example.invalid"],
        LOGIN_REQUIRED=False,
    )
    def test_old_domain_redirects_to_primary_domain_with_path_and_query(self):
        response = self.client.get(
            reverse("pages:interpreter_list"),
            {"region": "Musterstadt"},
            HTTP_HOST="legacy-language.example.invalid",
        )

        self.assertEqual(response.status_code, 301)
        self.assertEqual(
            response["Location"],
            "https://languages.example.invalid/dolmetscher/?region=Musterstadt",
        )

    @override_settings(
        SITE_URL="https://languages.example.invalid",
        SITE_HOST="languages.example.invalid",
        REDIRECT_OLD_HOSTS=["legacy-language.example.invalid", "www.legacy-language.example.invalid"],
        ALLOWED_HOSTS=["testserver", "languages.example.invalid", "legacy-language.example.invalid", "www.legacy-language.example.invalid"],
        LOGIN_REQUIRED=False,
    )
    def test_canonical_host_does_not_self_redirect(self):
        response = self.client.get(reverse("pages:home"), HTTP_HOST="languages.example.invalid")

        self.assertEqual(response.status_code, 200)


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class PublicAccessTests(TestCase):
    @override_settings(LOGIN_REQUIRED=False)
    def test_donation_routes_redirect_to_home_without_showing_the_page(self):
        for path in ("/spenden", "/spenden/"):
            with self.subTest(path=path):
                response = self.client.get(path, follow=True)
                self.assertEqual(response.redirect_chain, [(reverse("pages:home"), 302)])
                self.assertEqual(response.status_code, 200)
                self.assertNotContains(response, "Beispiel einer Spendenoberfläche")
                self.assertNotContains(response, 'href="/spenden/')

    @override_settings(LOGIN_REQUIRED=False)
    def test_home_is_public_for_anonymous_visitors(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Kontakt aufnehmen")

    @override_settings(LOGIN_REQUIRED=False)
    def test_home_uses_portfolio_functions_anchor_instead_of_interpreter_page_link(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, f'href="{reverse("pages:home")}#funktionen"')
        self.assertContains(response, 'id="funktionen"')
        self.assertNotContains(response, reverse("pages:interpreter_list"))

    @override_settings(LOGIN_REQUIRED=False)
    def test_service_catalog_redirects_to_home_services_section(self):
        response = self.client.get(reverse("pages:service_catalog"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}#leistungen")

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
        CONTACT_PHONE_WHATSAPP="+49 171 2345678",
        CONTACT_REGION="Geheime Adresse 7",
        CONTACT_AVAILABILITY="Nur nach Vereinbarung",
    )
    def test_public_pages_hide_sensitive_contact_details_for_anonymous_visitors(self):
        for page_name in ("pages:home", "pages:donate"):
            response = self.client.get(reverse(page_name), follow=True)

            self.assertEqual(response.status_code, 200)
            self.assertNotContains(response, "private@example.com")
            self.assertNotContains(response, "+49 171 2345678")
            self.assertNotContains(response, "Geheime Adresse 7")
            self.assertNotContains(response, "Nur nach Vereinbarung")
            self.assertNotContains(response, "https://wa.me/491712345678")

        home_response = self.client.get(reverse("pages:home"))
        self.assertContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "email"}),
        )
        self.assertContains(
            home_response,
            reverse("pages:contact_action", kwargs={"action": "whatsapp"}),
        )

    @override_settings(
        LOGIN_REQUIRED=False,
        CONTACT_EMAIL="private@example.com",
        CONTACT_PHONE_WHATSAPP="+49 150 2345678",
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
        self.assertContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "email"}),
        )
        self.assertContains(
            response,
            reverse("pages:contact_action", kwargs={"action": "whatsapp"}),
        )
        self.assertNotContains(response, "private@example.com")
        self.assertNotContains(response, "+49 150 2345678")
        self.assertNotContains(response, "https://wa.me/491502345678")

    @override_settings(LOGIN_REQUIRED=False, CONTACT_PHONE_WHATSAPP="+49 171 2345678")
    def test_contact_action_redirects_server_side_for_anonymous_visitors(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "whatsapp"})
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "https://wa.me/491712345678")

    @override_settings(LOGIN_REQUIRED=False, CONTACT_EMAIL="private@example.com")
    def test_contact_action_shows_email_provider_choice(self):
        response = self.client.get(
            reverse("pages:contact_action", kwargs={"action": "email"})
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "max.mustermann@example.com")
        self.assertContains(response, "Gmail")
        self.assertContains(response, "GMX")
        self.assertContains(response, "WEB.DE")
        self.assertNotContains(response, "mailto:")

    @override_settings(LOGIN_REQUIRED=False)
    def test_removed_contact_actions_return_404(self):
        for action in ("landline", "proton", "signal", "telegram", "chat-0"):
            with self.subTest(action=action):
                response = self.client.get(
                    reverse("pages:contact_action", kwargs={"action": action})
                )

                self.assertEqual(response.status_code, 404)

    @override_settings(LOGIN_REQUIRED=False)
    def test_legacy_contact_route_redirects_to_home_contact_section(self):
        response = self.client.get(reverse("pages:contact"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"{reverse('pages:home')}#kontakt")

    @override_settings(LOGIN_REQUIRED=False, CALENDAR_ENABLED=True)
    def test_portfolio_home_keeps_personal_feed_scoped_without_booking_calendar(self):
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
        self.assertContains(
            response,
            f'{reverse("pages:events_json")}?interpreter\\u003D{user.id}',
        )
        self.assertContains(response, "window.CALENDAR_HOVER = false;")
        self.assertEqual(
            response.context["events_json_url"],
            f'{reverse("pages:events_json")}?interpreter={user.id}',
        )
        self.assertNotContains(response, 'id="availabilityCalendar"')

    @override_settings(LOGIN_REQUIRED=False, CALENDAR_ENABLED=True)
    def test_portfolio_home_has_no_booking_calendar_for_guests(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["events_json_url"], reverse("pages:events_json"))
        self.assertFalse(response.context["is_interpreter"])
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
        self.assertContains(response, "Mein Konto")
        self.assertContains(response, f'href="{reverse("pages:profile")}"')
        self.assertContains(response, f'href="{reverse("pages:logout")}"')
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
    SITE_URL="https://languages.example.invalid",
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

    def test_login_without_remember_expires_at_browser_close(self):
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

    def test_login_with_remember_keeps_persistent_session(self):
        User.objects.create_user(
            username="dauerhaft@example.com",
            email="dauerhaft@example.com",
            password="starkespasswort123",
            is_active=True,
        )

        response = self.client.post(
            reverse("pages:login"),
            {
                "username": "dauerhaft@example.com",
                "password": "starkespasswort123",
                "remember": "on",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))
        self.assertFalse(self.client.session.get_expire_at_browser_close())

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
                "remember": "on",
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

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="smtp.example.test",
        EMAIL_HOST_USER="noreply@example.com",
        DEFAULT_FROM_EMAIL="noreply@example.com",
        CONTACT_EMAIL="team@example.com",
        APPOINTMENT_REQUEST_EMAIL="team@example.com",
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
    SITE_URL="https://languages.example.invalid",
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
