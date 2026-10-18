from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from lessons.models import (
    BotExchange, ChatHistory, Feedback, Subscription, UserProfile,
    UserProgress, UserVocabulary, WritingExercise,
)


API = "/deutschlive/api"
PASSWORD = "fictional-input-password"
TEST_SETTINGS = {
    "DEBUG": True,
    "LOGIN_REQUIRED": False,
    "AUTH_PASSWORD_VALIDATORS": [],
    "PASSWORD_HASHERS": ["django.contrib.auth.hashers.MD5PasswordHasher"],
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}


@override_settings(**TEST_SETTINGS)
class StrictInputValidationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="input-example", email="input@example.test", password=PASSWORD,
        )
        response = self.client.post(API + "/auth/login/", {
            "username": self.user.username, "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(response.status_code, 200)

    def endpoint_cases(self):
        return (
            ("post", "/auth/register/", {"username": [], "email": "new-input@example.test", "password": PASSWORD}),
            ("post", "/auth/login/", {"username": self.user.username, "password": []}),
            ("post", "/auth/password-reset/", {"identifier": []}),
            ("post", "/auth/password-reset/confirm/", {"token": {}, "password": PASSWORD}),
            ("post", "/auth/email/confirm/", {"token": []}),
            ("post", "/auth/email/resend/", {"unexpected": True}),
            ("post", "/auth/delete-account/", {"password": {}}),
            ("post", "/auth/change-password/", {"currentPassword": PASSWORD, "newPassword": None}),
            ("post", "/progress/", {"topicId": "arzt", "completedExercises": True}),
            ("post", "/vocabulary/", {"wordDe": [], "translationRu": "Пример"}),
            ("post", "/bot/reply/", {"question": []}),
            ("post", "/writing/exercises/", {"text": {}, "prompt": "Beispieltext"}),
            ("post", "/feedback/", {"message": []}),
            ("post", "/billing/checkout/", {"provider": []}),
            ("post", "/ai/adaptive-scene/", {"level": {}}),
            ("patch", "/settings/", {"mainGoal": []}),
        )

    def state(self):
        return {
            "users": list(get_user_model().objects.order_by("pk").values("pk", "password", "email")),
            "profiles": list(UserProfile.objects.order_by("pk").values()),
            "history_counts": {
                model.__name__: model.objects.count()
                for model in (UserProgress, UserVocabulary, WritingExercise, BotExchange, ChatHistory, Feedback, Subscription)
            },
        }

    def assert_invalid(self, response, *, field=None):
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_input")
        if field:
            self.assertIn(field, response.json()["fields"])

    def test_array_and_null_bodies_are_rejected_without_mutation(self):
        before = self.state()
        for method, path, _payload in self.endpoint_cases():
            for body in ("[]", "null"):
                with self.subTest(path=path, body=body):
                    response = getattr(self.client, method)(API + path, body, content_type="application/json")
                    self.assert_invalid(response)
        self.assertEqual(self.state(), before)

    def test_incorrect_field_types_are_rejected_without_mutation(self):
        before = self.state()
        for method, path, payload in self.endpoint_cases():
            with self.subTest(path=path, payload=payload):
                response = getattr(self.client, method)(API + path, payload, content_type="application/json")
                self.assert_invalid(response)
        self.assertEqual(self.state(), before)

    def test_registration_checks_the_normalized_username_before_saving(self):
        before = self.state()
        for username in ("ｉｎｐｕｔ-example", "ﬃ" * 60):
            with self.subTest(username=username):
                response = self.client.post(API + "/auth/register/", {
                    "username": username, "email": "normalized-input@example.test", "password": PASSWORD,
                }, content_type="application/json")
                self.assertEqual(response.status_code, 400)
                self.assertEqual(self.state(), before)

        response = self.client.post(API + "/auth/register/", {
            "username": "ｎｅｗ-input-example", "email": "normalized-input@example.test", "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(get_user_model().objects.filter(username="new-input-example").exists())

    def test_registration_rejects_identifiers_that_make_shared_login_ambiguous(self):
        other = get_user_model().objects.create_user(
            username="identifier@example.test", email="different-input@example.test", password=PASSWORD,
        )
        before = self.state()
        for username, email in (
            (self.user.email.upper(), "new-input@example.test"),
            ("new-input-example", other.username.upper()),
        ):
            with self.subTest(username=username, email=email):
                response = self.client.post(API + "/auth/register/", {
                    "username": username, "email": email, "password": PASSWORD,
                }, content_type="application/json")
                self.assertEqual(response.status_code, 400)
                self.assertEqual(self.state(), before)

    def test_progress_requires_an_integer_count_and_valid_status(self):
        for field, invalid_values in (
            ("completedExercises", (True, False, "1", 1.5, -1, 32768)),
            ("status", ("unknown", 1)),
        ):
            for value in invalid_values:
                with self.subTest(field=field, value=value):
                    response = self.client.post(API + "/progress/", {
                        "topicId": "arzt", "status": "started", "completedExercises": 1,
                        field: value,
                    }, content_type="application/json")
                    self.assert_invalid(response, field=field)
        self.assertFalse(UserProgress.objects.filter(user=self.user).exists())
        accepted = self.client.post(API + "/progress/", {
            "topicId": "arzt", "status": "started", "completedExercises": 1,
        }, content_type="application/json")
        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(UserProgress.objects.get(user=self.user).completed_exercises, 1)

    def test_settings_rejects_string_false_and_integer_boolean_without_partial_update(self):
        profile = UserProfile.objects.get(user=self.user)
        original_goal = profile.main_goal
        for value in ("false", "true", 0, 1, None):
            with self.subTest(value=value):
                response = self.client.patch(API + "/settings/", {
                    "mainGoal": "Dieses Beispiel darf nicht gespeichert werden", "saveProgress": value,
                }, content_type="application/json")
                self.assert_invalid(response, field="saveProgress")
                profile.refresh_from_db()
                self.assertIs(profile.save_progress, True)
                self.assertEqual(profile.main_goal, original_goal)
        accepted = self.client.patch(API + "/settings/", {"saveProgress": False}, content_type="application/json")
        self.assertEqual(accepted.status_code, 200)
        profile.refresh_from_db()
        self.assertIs(profile.save_progress, False)


@override_settings(**TEST_SETTINGS)
class LocalDemoRecoveryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="recovery-example", email="recovery@example.test", password=PASSWORD,
        )
        UserProfile.objects.create(user=self.user, email_verified=False)
        self.client.force_login(self.user)

    def post(self, path, data, peer="127.0.0.1", **headers):
        return self.client.post(API + path, data, content_type="application/json", REMOTE_ADDR=peer, **headers)

    def test_debug_direct_ipv4_and_ipv6_loopback_can_issue_demo_tokens_without_email(self):
        for peer in ("127.0.0.1", "::1"):
            with self.subTest(peer=peer):
                reset = self.post("/auth/password-reset/", {"identifier": self.user.email}, peer)
                self.assertEqual(reset.status_code, 200)
                self.assertTrue(reset.json()["resetToken"])
                self.assertIs(reset.json()["demo"], True)
                resend = self.post("/auth/email/resend/", {}, peer)
                self.assertEqual(resend.status_code, 200)
                self.assertTrue(resend.json()["emailVerificationToken"])
        self.assertEqual(len(mail.outbox), 0)

    def test_recovery_requires_debug_and_direct_loopback_despite_forwarded_headers(self):
        issued = self.post("/auth/password-reset/", {"identifier": self.user.email})
        token = issued.json()["resetToken"]
        cases = ((False, "127.0.0.1"), (False, "::1"), (True, "192.0.2.50"), (True, ""), (True, "invalid"))
        for debug, peer in cases:
            with self.subTest(debug=debug, peer=peer), override_settings(DEBUG=debug):
                for path, data in (
                    ("/auth/password-reset/", {"identifier": self.user.email}),
                    ("/auth/password-reset/confirm/", {"token": token, "password": "fictional-new-password"}),
                    ("/auth/email/resend/", {}),
                ):
                    with self.subTest(path=path):
                        response = self.post(
                            path, data, peer,
                            HTTP_X_FORWARDED_FOR="127.0.0.1",
                            HTTP_X_REAL_IP="::1",
                            HTTP_FORWARDED="for=127.0.0.1;host=localhost",
                        )
                        self.assertEqual(response.status_code, 501)
                        self.assertEqual(response.json()["code"], "demo_recovery_disabled")
                        self.assertNotIn("resetToken", response.json())
                        self.assertNotIn("emailVerificationToken", response.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
        self.assertFalse(UserProfile.objects.get(user=self.user).email_verified)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_token_cannot_be_used_again_after_success(self):
        response = self.post("/auth/password-reset/", {"identifier": self.user.email})
        token = response.json()["resetToken"]
        first = self.post("/auth/password-reset/confirm/", {
            "token": token, "password": "fictional-first-password",
        })
        self.assertEqual(first.status_code, 200)
        replay = self.post("/auth/password-reset/confirm/", {
            "token": token, "password": "fictional-replayed-password",
        })
        self.assertEqual(replay.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("fictional-first-password"))
        self.assertFalse(self.user.check_password("fictional-replayed-password"))
