from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from urllib import error
from unittest.mock import patch

from ..ai_service import AIWritingFeedback, GPTService, OpenAIProvider, RuleBasedProvider, build_rule_based_writing_feedback, get_ai_provider
from ..models import UserProfile, WritingExercise


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class AIFunctionTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_gpt_service_reports_configuration_state(self):
        service = GPTService(api_key="", model="gpt-test", enabled=True)
        self.assertFalse(service.is_configured)

        configured = GPTService(api_key="test-key", model="gpt-test", enabled=True, provider_name="openai")
        self.assertTrue(configured.is_configured)

    def test_ai_provider_resolver_keeps_rule_based_fallback_without_openai_config(self):
        provider = get_ai_provider(api_key="", model="gpt-test", enabled=True, provider_name="openai")

        self.assertIsInstance(provider, RuleBasedProvider)
        self.assertEqual(provider.name, "fallback")

    def test_ai_provider_resolver_returns_openai_when_configured(self):
        provider = get_ai_provider(api_key="test-key", model="gpt-test", enabled=True, provider_name="openai")

        self.assertIsInstance(provider, OpenAIProvider)
        self.assertEqual(provider.name, "openai")

    def test_openai_provider_parses_writing_feedback_response(self):
        user = get_user_model().objects.create_user(username="openaiwriter", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user, level="a2", preferred_topic="Jobcenter")
        provider = OpenAIProvider(api_key="test-key", model="gpt-test", enabled=True)
        provider._request_response = lambda payload: {
            "output_text": (
                "{\"correction\":\"Ich möchte bitte einen Termin.\","
                "\"explanation\":\"Простой порядок слов.\","
                "\"answer\":\"Готово.\"}"
            )
        }

        feedback = provider.writing_feedback("ich will termin", "Termin schreiben", profile)

        self.assertEqual(feedback.source, "openai")
        self.assertEqual(feedback.correction, "Ich möchte bitte einen Termin.")
        self.assertIn("Простой", feedback.explanation)

    def test_openai_provider_parses_adaptive_scene_response(self):
        provider = OpenAIProvider(api_key="test-key", model="gpt-test", enabled=True)
        provider._request_response = lambda payload: {
            "output": [
                {
                    "content": [
                        {
                            "text": (
                                "{\"title\":\"Termin im Jobcenter\","
                                "\"goal\":\"Unterlagen klaeren\","
                                "\"steps\":[\"Dialog lesen\",\"Antwort schreiben\",\"Nachfragen\"],"
                                "\"promptPreview\":\"Erstelle eine Szene.\"}"
                            )
                        }
                    ]
                }
            ]
        }

        scene = provider.adaptive_scene("jobcenter", "a2", "Unterlagen")

        self.assertEqual(scene["source"], "openai")
        self.assertEqual(scene["title"], "Termin im Jobcenter")
        self.assertEqual(len(scene["steps"]), 3)

    def test_openai_provider_retries_transient_errors(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self):
                return b'{"output_text":"{\\"correction\\":\\"Gut.\\",\\"explanation\\":\\"OK\\",\\"answer\\":\\"OK\\"}"}'

        calls = {"count": 0}

        def flaky_urlopen(_request, timeout):
            calls["count"] += 1
            if calls["count"] == 1:
                raise TimeoutError("timeout")
            return FakeResponse()

        user = get_user_model().objects.create_user(username="retry", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user, level="a1")
        provider = OpenAIProvider(api_key="test-key", model="gpt-test", enabled=True, max_retries=1)

        with patch("lessons.ai_service.request.urlopen", side_effect=flaky_urlopen):
            feedback = provider.writing_feedback("Hallo.", "Kurz schreiben", profile)

        self.assertEqual(calls["count"], 2)
        self.assertEqual(feedback.source, "openai")

    def test_openai_provider_does_not_retry_non_rate_limit_client_errors(self):
        request_error = error.HTTPError("https://api.openai.test", 401, "Unauthorized", hdrs=None, fp=None)
        provider = OpenAIProvider(api_key="bad-key", model="gpt-test", enabled=True, max_retries=2)

        with patch("lessons.ai_service.request.urlopen", side_effect=request_error) as urlopen:
            with self.assertRaises(Exception):
                provider._request_response({"model": "gpt-test", "input": "Hallo"})

        self.assertEqual(urlopen.call_count, 1)

    def test_gpt_service_falls_back_when_provider_fails(self):
        class FailingProvider:
            name = "test-provider"
            is_configured = True

            def writing_feedback(self, text, prompt, profile):
                raise RuntimeError("provider unavailable")

            def adaptive_scene(self, topic_id, level, goal=""):
                raise RuntimeError("provider unavailable")

        user = get_user_model().objects.create_user(username="fallback", password="strong-pass-123")
        profile = UserProfile.objects.create(user=user, level="a1", preferred_topic="Bäckerei")
        service = GPTService(provider=FailingProvider())

        feedback = service.writing_feedback("ich will Brotchen", "Bestellung schreiben", profile)
        scene = service.adaptive_scene("baeckerei", "a1")

        self.assertIsInstance(feedback, AIWritingFeedback)
        self.assertEqual(feedback.source, "fallback")
        self.assertEqual(scene["source"], "fallback")

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
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "ich will zwei Brotchen"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        exercise = WritingExercise.objects.get(user=user)
        self.assertIn("Ich hätte gern", exercise.correction)
        self.assertIn("простыми словами", exercise.explanation)

    @override_settings(AI_MAX_INPUT_TOKENS=2)
    def test_writing_api_rejects_too_large_ai_input(self):
        user = get_user_model().objects.create_user(username="toolong", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Das ist ein langer Text."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "ai_input_too_long")

    @override_settings(AI_DAILY_FREE_LIMIT=1)
    def test_writing_api_enforces_daily_ai_limit_for_free_user(self):
        user = get_user_model().objects.create_user(username="dailyfree", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        first = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Hallo."},
            content_type="application/json",
        )
        second = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Hallo nochmal."},
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 429)
        self.assertEqual(second.json()["code"], "ai_daily_limit_reached")

    @override_settings(AI_PREMIUM_REQUIRED=True)
    def test_writing_api_can_require_premium_for_ai_usage(self):
        user = get_user_model().objects.create_user(username="aifree", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Hallo."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()["code"], "premium_required")

    def test_adaptive_scene_preview_uses_profile_context(self):
        user = get_user_model().objects.create_user(username="adaptive", password="strong-pass-123")
        UserProfile.objects.create(user=user, level="a2", main_goal="Arbeit finden", preferred_topic="jobcenter")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post("/api/ai/adaptive-scene/", data={}, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["adaptiveScene"]
        self.assertEqual(payload["topicId"], "jobcenter")
        self.assertEqual(payload["level"], "a2")
        self.assertIn("Arbeit finden", payload["promptPreview"])

    def test_streaming_status_is_prepared_without_enabling_websockets_yet(self):
        user = get_user_model().objects.create_user(username="streamer", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.get("/api/ai/streaming/status/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["streaming"]
        self.assertFalse(payload["enabled"])
        self.assertEqual(payload["transport"], "websocket-later")
