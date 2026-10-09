from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class FeedbackSystemTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_guest_can_submit_feedback_and_html_is_stripped(self):
        response = self.client.post(
            "/api/feedback/",
            data={
                "category": "bug",
                "message": "<script>alert(1)</script> In der Bäckerei fehlt ein Hinweis.",
                "contactEmail": "test@example.com",
                "pagePath": "/manual",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        feedback = Feedback.objects.get()
        self.assertEqual(feedback.category, "bug")
        self.assertNotIn("<script>", feedback.message)
        self.assertEqual(feedback.status, "new")
        self.assertIsNone(feedback.user)

    def test_logged_in_feedback_is_assigned_to_user(self):
        user = get_user_model().objects.create_user(username="feedbackuser", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/feedback/",
            data={"category": "suggestion", "message": "Bitte mehr Übungen für Dialoge einbauen."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Feedback.objects.get().user, user)

    def test_feedback_rate_limit_blocks_spam(self):
        for index in range(3):
            response = self.client.post(
                "/api/feedback/",
                data={"category": "other", "message": f"Feedback Nachricht Nummer {index} ist lang genug."},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 201)

        blocked = self.client.post(
            "/api/feedback/",
            data={"category": "other", "message": "Diese vierte Nachricht soll blockiert werden."},
            content_type="application/json",
        )

        self.assertEqual(blocked.status_code, 429)
