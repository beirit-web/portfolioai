from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class WritingTrainingTests(TestCase):
    def test_writing_exercise_api_saves_correction_for_current_user(self):
        user = get_user_model().objects.create_user(username="writer", password="strong-pass-123")
        other = get_user_model().objects.create_user(username="otherwriter", password="strong-pass-123")
        WritingExercise.objects.create(
            user=other,
            topic_id="baeckerei",
            topic_label="Bäckerei",
            prompt="Nicht sichtbar",
            user_text="Ich hätte gern Brot.",
            correction="Andere Korrektur",
        )
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/deutschlive/api/writing/exercises/",
            data={
                "topicId": "baeckerei",
                "prompt": "Bestellung schreiben",
                "text": "ich will zwei Brotchen",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["exercise"]
        self.assertEqual(payload["topicId"], "baeckerei")
        self.assertIn("Ich hätte gern", payload["correction"])
        self.assertIn("Brötchen", payload["correction"])

        list_response = self.client.get("/deutschlive/api/writing/exercises/")
        exercises = list_response.json()["exercises"]
        self.assertEqual(len(exercises), 1)
        self.assertEqual(exercises[0]["userText"], "ich will zwei Brotchen")

    def test_bot_reply_also_creates_writing_exercise(self):
        user = get_user_model().objects.create_user(username="botwriter", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/deutschlive/api/bot/reply/",
            data={"question": "Ich hätte gern Kaffee.", "prompt": "Dialog schreiben", "topicId": "baeckerei"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(WritingExercise.objects.filter(user=user).count(), 1)
        self.assertIn("exercise", response.json())
