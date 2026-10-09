import json
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from pages.models import Profile
from .models import QuizAttempt, UserProfile


@override_settings(LOGIN_REQUIRED=False, STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class IntegratedLearningTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("lernen@example.test", password="Lernen-Test-2026!")

    def test_public_learning_and_spa_deep_links(self):
        for path in ("/deutschlive/", "/deutschlive/learn", "/deutschlive/quiz", "/deutschlive/grades", "/deutschlive/grades/", "/deutschlive/recordings"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertIn(b"/static/deutschlive-dist/", b"".join(response.streaming_content))
        self.assertTrue(self.client.get("/deutschlive/api/topics/").json()["topics"])
        self.assertTrue(self.client.get("/deutschlive/api/scenes/").json()["scenes"])
        for path in ("/deutschlive/api/missing/", "/deutschlive/api/auth/register/", "/deutschlive/api/audio/upload/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response["Content-Type"], "application/json")

    @override_settings(DEBUG=False)
    def test_platform_session_is_sufficient_without_a_learning_cookie(self):
        self.client.force_login(self.user)
        response = self.client.get("/deutschlive/api/auth/me/")
        self.assertEqual(response.json()["user"]["id"], self.user.id)
        self.assertNotIn("learning_auth_token", self.client.cookies)
        self.assertEqual(User.objects.count(), 1)
        self.assertTrue(UserProfile.objects.get(user=self.user).email_verified)
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/api/session/status/").status_code, 200)

    def test_learning_progress_belongs_to_the_platform_user(self):
        self.client.force_login(self.user)
        response = self.client.post("/deutschlive/api/quiz-attempts/", json.dumps({
            "topicId": "baeckerei", "score": 2, "total": 3,
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(QuizAttempt.objects.get().user_id, self.user.id)
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").json()["summary"]["attemptCount"], 1)
        other = User.objects.create_user("other@example.test")
        self.client.force_login(other)
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").json()["summary"]["attemptCount"], 0)

    def test_authenticated_writes_still_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        url = "/deutschlive/api/settings/"
        self.assertEqual(client.patch(url, "{}", content_type="application/json").status_code, 403)
        token = client.get("/deutschlive/api/auth/csrf/").json()["csrfToken"]
        self.assertEqual(client.patch(url, "{}", content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, 200)

    def test_platform_session_revocation_also_revokes_learning_access(self):
        self.client.force_login(self.user)
        self.client.get("/deutschlive/api/auth/me/")
        Profile.objects.filter(user=self.user).update(last_activity_at=timezone.now() - timedelta(hours=1))
        response = self.client.get("/deutschlive/api/dashboard/", HTTP_ACCEPT="application/json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.client.get("/deutschlive/api/auth/me/").json()["user"], None)

    def test_platform_logout_and_account_deletion_cover_learning_data(self):
        self.client.force_login(self.user)
        QuizAttempt.objects.create(user=self.user, topic_id="baeckerei", topic_label="Bäckerei", score=1, total=1)
        self.assertEqual(self.client.post("/deutschlive/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/session/status/").status_code, 401)
        self.client.force_login(self.user)
        self.client.post("/account/delete/")
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_navigation_and_recording_legal_notices(self):
        self.assertContains(self.client.get("/"), 'href="/deutschlive/"')
        self.assertContains(self.client.get("/sitemap.xml"), "/deutschlive/")
        for lang, heading in (("de", "lokal gespeicherte Audioaufnahmen"), ("ru", "локальные аудиозаписи")):
            self.assertContains(self.client.get("/datenschutz/", HTTP_ACCEPT_LANGUAGE=lang), heading)
            self.assertContains(self.client.get("/rechtliches/", HTTP_ACCEPT_LANGUAGE=lang), "/deutschlive/nutzungsbedingungen")

    @override_settings(LOGIN_REQUIRED=True)
    def test_public_module_does_not_bypass_private_learning_permissions(self):
        self.assertEqual(self.client.get("/deutschlive/").status_code, 200)
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").status_code, 401)
