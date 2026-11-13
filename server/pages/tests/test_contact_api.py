from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from pages.models import ChatMessage


@override_settings(
    LOGIN_REQUIRED=False,
    CONTACT_RATE_LIMIT_COUNT=5,
    CONTACT_RATE_LIMIT_SECONDS=60,
    CONTACT_DUPLICATE_WINDOW_SECONDS=60,
)
class ContactApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        notification = patch("pages.views.send_notification_email")
        self.send_notification = notification.start()
        self.addCleanup(notification.stop)
        self.url = reverse("pages:contact_request_api")
        self.payload = {
            "name": "Erika Beispiel",
            "email": "erika@example.com",
            "subject": "Frage zum Projekt",
            "message": "Wie wurde die Anwendung aufgebaut?",
            "privacy_consent": "on",
            "company": "",
        }

    def test_only_post_can_submit_a_contact_request(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 405)
        self.assertEqual(response["Allow"], "POST")
        self.assertFalse(ChatMessage.objects.exists())
        self.send_notification.assert_not_called()

    def test_invalid_fields_return_field_errors_without_saving_or_notifying(self):
        for field, value in (
            ("email", "invalid-email"),
            ("subject", ""),
            ("subject", "x" * 161),
            ("message", "x" * 4001),
            ("privacy_consent", ""),
            ("company", "Automated submission"),
        ):
            with self.subTest(field=field, value_length=len(value)):
                cache.clear()
                response = self.client.post(self.url, {**self.payload, field: value})

                self.assertEqual(response.status_code, 400)
                payload = response.json()
                self.assertIs(payload["ok"], False)
                self.assertIn(field, payload["errors"])
                self.assertTrue(payload["errors"][field][0]["message"])
                self.assertFalse(ChatMessage.objects.exists())
                self.send_notification.assert_not_called()

    def test_repeated_submission_is_saved_and_notified_only_once(self):
        first = self.client.post(self.url, self.payload)
        repeated = self.client.post(self.url, self.payload)

        self.assertEqual(first.status_code, 200)
        self.assertIs(first.json()["ok"], True)
        self.assertEqual(repeated.status_code, 429)
        self.assertIs(repeated.json()["ok"], False)
        self.assertEqual(ChatMessage.objects.count(), 1)
        self.send_notification.assert_called_once()

    @override_settings(CONTACT_RATE_LIMIT_COUNT=2)
    def test_rate_limit_rejects_additional_distinct_submissions(self):
        for index in range(2):
            response = self.client.post(self.url, {
                **self.payload, "message": f"Nachricht {index}",
            })
            self.assertEqual(response.status_code, 200)

        response = self.client.post(self.url, {**self.payload, "message": "Weitere Nachricht"})

        self.assertEqual(response.status_code, 429)
        self.assertIs(response.json()["ok"], False)
        self.assertEqual(ChatMessage.objects.count(), 2)
        self.assertEqual(self.send_notification.call_count, 2)

    def test_csrf_protection_rejects_submission_without_token(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(self.url, self.payload)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(ChatMessage.objects.exists())
        self.send_notification.assert_not_called()

    def test_home_cookie_allows_contact_submission_with_csrf_header(self):
        client = Client(enforce_csrf_checks=True)
        client.get(reverse("pages:home"))
        response = client.post(
            self.url,
            self.payload,
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["ok"], True)
        message = ChatMessage.objects.get()
        self.assertEqual(message.contact_email, self.payload["email"])
        self.assertIsNotNone(message.privacy_consent_at)
        self.send_notification.assert_called_once()
