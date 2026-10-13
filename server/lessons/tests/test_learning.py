from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

class LearningAreaModelTests(TestCase):
    def test_base_categories_are_seeded_by_migration(self):
        slugs = set(Category.objects.values_list("slug", flat=True))
        self.assertTrue({"alltag", "arzt", "baeckerei", "jobcenter"}.issubset(slugs))

    def test_topic_detail_can_use_database_scene_dialogue_and_vocabulary(self):
        category = Category.objects.get(slug="baeckerei")
        scene = Scene.objects.create(
            category=category,
            slug="baeckerei-test-dialog",
            title="Testdialog Bäckerei",
            topic_id="baeckerei",
            icon="🥐",
            description_de="Eine kurze Bestellung.",
            description_ru="Короткий заказ.",
            level="a1",
            is_premium=True,
        )
        SceneLine.objects.create(
            scene=scene,
            speaker="Kunde",
            text_de="Ich hätte gern ein Brötchen.",
            text_ru="Я хотел бы одну булочку.",
            explanation="Вежливая Bestellung.",
            order=1,
        )
        Vocabulary.objects.create(
            category=category,
            scene=scene,
            word_de="das Testbrötchen",
            translation_ru="булочка",
            example_de="Ich hätte gern ein Brötchen.",
        )

        response = self.client.get("/deutschlive/api/topics/baeckerei/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "baeckerei")
        scene_payload = next(item for item in payload["scenes"] if item["id"] == "baeckerei-test-dialog")
        phrase_payload = next(item for item in payload["phrases"] if item["de"] == "Ich hätte gern ein Brötchen.")
        vocabulary_payload = next(item for item in payload["vocabulary"] if item["de"] == "das Testbrötchen")
        self.assertTrue(scene_payload["isPremium"])
        self.assertEqual(phrase_payload["ru"], "Я хотел бы одну булочку.")
        self.assertEqual(vocabulary_payload["ru"], "булочка")

    def test_bakery_mvp_content_is_seeded(self):
        response = self.client.get("/deutschlive/api/topics/baeckerei/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 20)
        self.assertGreaterEqual(len(payload["vocabulary"]), 20)
        self.assertGreaterEqual(len(payload["quiz"]), 6)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertIsNotNone(payload["free_answer"])

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class DashboardEpicTests(TestCase):
    def test_dashboard_returns_learning_plan_review_topics_and_premium_hints(self):
        user = get_user_model().objects.create_user(username="dashboarduser", password="strong-pass-123")
        category = Category.objects.get(slug="baeckerei")
        premium_scene = Scene.objects.create(
            category=category,
            slug="premium-dashboard-test",
            title="Premium Bäckerei Gespräch",
            topic_id="premium-baeckerei",
            level="a2",
            is_premium=True,
        )
        QuizQuestion.objects.create(
            scene=premium_scene,
            topic_id="premium-baeckerei",
            prompt_ru="Premium Frage",
            correct_answer="Ja",
        )
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        quiz = self.client.get("/deutschlive/api/topics/baeckerei/", {"view": "quiz"}).json()
        quiz_response = self.client.post(
            "/deutschlive/api/quiz-attempts/",
            data={
                "topicId": "baeckerei", "quizToken": quiz["quizToken"],
                "answers": [{"questionId": item["id"], "optionId": None} for item in quiz["quiz"]],
                "freeAnswer": "", "freeAnswerExpired": False,
                "durationSeconds": 90, "difficulty": "easy", "save": True,
            },
            content_type="application/json",
        )
        self.assertEqual(quiz_response.status_code, 201)

        response = self.client.get("/deutschlive/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("learningPlan", payload)
        self.assertIsNotNone(payload["learningPlan"]["nextScene"])
        self.assertEqual(payload["learningPlan"]["reviewTopics"][0]["topicId"], "baeckerei")
        self.assertGreaterEqual(payload["progress"]["totalScenes"], 1)
        self.assertTrue(any(item["id"] == "premium-dashboard-test" for item in payload["premiumHints"]))
