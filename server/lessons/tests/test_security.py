from datetime import timedelta
import json
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, RequestFactory, TestCase, override_settings
from django.utils import timezone

from ..security import validate_private_upload
from ..views import topic_detail
from ..models import Category, Feedback, Plan, QuizAnswer, QuizQuestion, Scene, SceneLine, Subscription, UserProfile, Vocabulary, WritingExercise

@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class SecurityEpicTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_csrf_protects_feedback_post(self):
        csrf_client = Client(enforce_csrf_checks=True)
        response = csrf_client.post(
            "/deutschlive/api/feedback/",
            data={"category": "bug", "message": "Dieser Text ist lang genug."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_xss_payload_is_stripped_from_feedback(self):
        response = self.client.post(
            "/deutschlive/api/feedback/",
            data={"category": "content", "message": "<b>Hallo</b> <script>alert(1)</script> sichere Nachricht"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("<", Feedback.objects.get().message)

    def test_staff_security_summary_requires_staff_user(self):
        user = get_user_model().objects.create_user(username="normal", password="strong-pass-123")
        staff = get_user_model().objects.create_user(username="staff", password="strong-pass-123", is_staff=True)

        self.client.post("/deutschlive/api/auth/login/", data={"username": user.username, "password": "strong-pass-123"}, content_type="application/json")
        denied = self.client.get("/deutschlive/api/security/admin-summary/")
        self.assertEqual(denied.status_code, 403)

        self.client.post("/deutschlive/api/auth/login/", data={"username": staff.username, "password": "strong-pass-123"}, content_type="application/json")
        allowed = self.client.get("/deutschlive/api/security/admin-summary/")
        self.assertEqual(allowed.status_code, 200)
        self.assertTrue(allowed.json()["security"]["csrfMiddleware"])

    def test_login_rate_limit_blocks_repeated_failures(self):
        for _index in range(5):
            response = self.client.post(
                "/deutschlive/api/auth/login/",
                data={"username": "missing", "password": "wrong"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)

        blocked = self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": "missing", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(blocked.status_code, 429)

    def test_upload_validation_rejects_unsafe_type_and_large_file(self):
        unsafe = SimpleUploadedFile("payload.html", b"<script>alert(1)</script>", content_type="text/html")
        is_valid, message = validate_private_upload(unsafe)
        self.assertFalse(is_valid)
        self.assertIn("Unsupported", message)

        oversized = SimpleUploadedFile("large.pdf", b"0" * (6 * 1024 * 1024), content_type="application/pdf")
        is_valid, message = validate_private_upload(oversized)
        self.assertFalse(is_valid)
        self.assertIn("too large", message)

    def test_unknown_api_paths_return_json_errors(self):
        payload = "safe-test' OR '1'='1"

        paths = (
            "/deutschlive/api",
            "/deutschlive/api/",
            "/deutschlive/api/missing/",
            f"/deutschlive/api/topics/{payload}/",
        )
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.headers["Content-Type"], "application/json")
                self.assertIn("error", response.json())

    def test_dashboard_serves_local_portfolio_demo(self):
        response = self.client.get("/deutschlive/dashboard?lang=de")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DeutschLive")

    def test_orm_lookup_treats_sql_injection_payload_as_plain_text(self):
        Category.objects.create(slug="safe-test", title_de="Sicher", title_ru="Безопасно")
        category_slugs = list(Category.objects.order_by("slug").values_list("slug", flat=True))
        payload = "safe-test' OR '1'='1"

        # The URL's slug converter rejects this payload before the ORM runs.
        request = RequestFactory().get("/deutschlive/api/topics/safe-test/")
        response = topic_detail(request, topic_id=payload)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(json.loads(response.content), {"error": "Тема не найдена."})
        self.assertEqual(
            list(Category.objects.order_by("slug").values_list("slug", flat=True)),
            category_slugs,
        )
