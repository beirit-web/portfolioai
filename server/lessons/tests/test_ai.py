from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from ..ai_service import GPTService, build_rule_based_writing_feedback
from ..models import UserProfile, WritingExercise


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class AIFunctionTests(TestCase):
    def test_gpt_service_reports_configuration_state(self):
        service = GPTService(api_key="", model="gpt-test", enabled=True)
        self.assertFalse(service.is_configured)

        configured = GPTService(api_key="test-key", model="gpt-test", enabled=True)
        self.assertTrue(configured.is_configured)

    def test_rule_based_writing_feedback_contains_correction_and_simple_russian_explanation(self):
        user = get_user_model().objects.create_user(username="aiwriter", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user, level="a1", preferred_topic="Bäckerei")

        feedback = build_rule_based_writing_feedback("ich will zwei Brotchen", "Bestellung schreiben", profile)

        self.assertIn("Ich hätte gern", feedback.correction)
        self.assertIn("Brötchen", feedback.correction)
        self.assertIn("простыми словами", feedback.explanation)
        self.assertEqual(feedback.source, "fallback")

    def test_writing_api_uses_ai_service_contract(self):
        user = get_user_model().objects.create_user(username="aiapi", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/deutschlive/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "ich will zwei Brotchen"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        exercise = WritingExercise.objects.get(user=user)
        self.assertIn("Ich hätte gern", exercise.correction)
        self.assertIn("простыми словами", exercise.explanation)

    def test_adaptive_scene_preview_uses_profile_context(self):
        user = get_user_model().objects.create_user(username="adaptive", password="strong-pass-123")
        UserProfile.objects.create(user=user, level="a2", main_goal="Arbeit finden", preferred_topic="jobcenter")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post("/deutschlive/api/ai/adaptive-scene/", data={}, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["adaptiveScene"]
        self.assertEqual(payload["topicId"], "jobcenter")
        self.assertEqual(payload["level"], "a2")
        self.assertIn("Arbeit finden", payload["promptPreview"])

    def test_streaming_status_is_prepared_without_enabling_websockets_yet(self):
        user = get_user_model().objects.create_user(username="streamer", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.get("/deutschlive/api/ai/streaming/status/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["streaming"]
        self.assertFalse(payload["enabled"])
        self.assertEqual(payload["transport"], "websocket-later")
