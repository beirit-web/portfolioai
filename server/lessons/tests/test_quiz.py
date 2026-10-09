from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class QuizSystemTests(TestCase):
    def test_seeded_quiz_questions_have_structured_answers(self):
        question = QuizQuestion.objects.filter(topic_id="baeckerei", is_active=True).prefetch_related("answers").first()

        self.assertIsNotNone(question)
        self.assertGreaterEqual(question.answers.count(), 3)
        self.assertEqual(question.answers.filter(is_correct=True).count(), 1)

    def test_db_quiz_serializes_correct_answer_index(self):
        category = Category.objects.get(slug="baeckerei")
        scene = Scene.objects.filter(category=category).first()
        question = QuizQuestion.objects.create(
            scene=scene,
            topic_id="baeckerei",
            question_type="choice",
            prompt_ru="Тестовый вопрос?",
            correct_answer="richtig",
            explanation_ru="Пояснение.",
        )
        QuizAnswer.objects.create(question=question, text="falsch", is_correct=False, order=0)
        QuizAnswer.objects.create(question=question, text="richtig", is_correct=True, order=1)

        response = self.client.get("/deutschlive/api/topics/baeckerei/")
        quiz_item = next(item for item in response.json()["quiz"] if item["question"] == "Тестовый вопрос?")

        self.assertEqual(quiz_item["options"], ["falsch", "richtig"])
        self.assertEqual(quiz_item["answer"], 1)
        self.assertEqual(quiz_item["explain"], "Пояснение.")

    def test_quiz_attempt_can_be_saved_for_db_topic(self):
        user = get_user_model().objects.create_user(username="quizuser", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/deutschlive/api/quiz-attempts/",
            data={"topicId": "baeckerei", "score": 4, "total": 7, "durationSeconds": 180, "difficulty": "medium"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["attempt"]
        self.assertEqual(payload["topicLabel"], "Пекарня")
        self.assertEqual(payload["percentage"], 57)
