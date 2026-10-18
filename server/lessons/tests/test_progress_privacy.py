from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from ..models import (
    BotExchange,
    Category,
    ChatHistory,
    QuizAttempt,
    Scene,
    UserProfile,
    UserProgress,
    UserVocabulary,
    WritingExercise,
)


API = "/deutschlive/api"


@override_settings(DEBUG=True, AUTH_PASSWORD_VALIDATORS=[])
class ProgressPrivacyTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="progress-example", email="progress@example.test",
            password="sample-password-123",
        )
        response = self.post("/auth/login/", {
            "username": self.user.username, "password": "sample-password-123",
        })
        self.assertEqual(response.status_code, 200)
        self.profile = UserProfile.objects.get(user=self.user)
        self.scene = Scene.objects.filter(category__slug="baeckerei", is_published=True).first()
        self.assertIsNotNone(self.scene)
        UserProgress.objects.create(
            user=self.user, scene=self.scene, scene_key=self.scene.slug,
            topic_id="baeckerei", status="started", completed_exercises=1,
        )
        UserVocabulary.objects.create(
            user=self.user, word_de="Brot", translation_ru="Хлеб",
            source_topic_id="baeckerei",
        )
        WritingExercise.objects.create(
            user=self.user, prompt="Vorhandenes Beispiel", user_text="Ein Brot bitte.",
            correction="Vorhandene Korrektur",
        )
        BotExchange.objects.create(user=self.user, question="Vorhandene Frage", answer="Vorhandene Antwort")
        ChatHistory.objects.create(user=self.user, user_message="Vorhandener Text", bot_response="Vorhandene Antwort")

    def post(self, path, data):
        return self.client.post(API + path, data=data, content_type="application/json")

    def history(self):
        return {
            model.__name__: list(model.objects.filter(user=self.user).order_by("pk").values())
            for model in (UserProgress, UserVocabulary, WritingExercise, BotExchange, ChatHistory, QuizAttempt)
        }

    def disable_saving(self):
        response = self.client.patch(
            API + "/settings/", data={"saveProgress": False}, content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["settings"]["saveProgress"], False)

    def test_opt_out_preserves_existing_history_and_rejects_progress_and_vocabulary_writes(self):
        before = self.history()
        self.disable_saving()
        self.assertEqual(self.history(), before)

        for path, data in (
            ("/progress/", {
                "topicId": "baeckerei", "sceneId": self.scene.slug,
                "status": "completed", "completedExercises": 2,
            }),
            ("/vocabulary/", {"wordDe": "Brot", "translationRu": "Geaenderte Uebersetzung"}),
            ("/vocabulary/", {"wordDe": "Kaffee", "translationRu": "Кофе"}),
        ):
            with self.subTest(path=path, data=data):
                response = self.post(path, data)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()["code"], "save_progress_disabled")
                self.assertEqual(self.history(), before)

    def test_opt_out_keeps_writing_and_bot_feedback_ephemeral(self):
        self.disable_saving()
        before = self.history()
        for path, data in (
            ("/writing/exercises/", {
                "topicId": "baeckerei", "prompt": "Eine Bestellung schreiben", "text": "ich will zwei Brotchen",
            }),
            ("/bot/reply/", {
                "topicId": "baeckerei", "prompt": "Eine Bestellung schreiben", "question": "ich will zwei Brotchen",
            }),
        ):
            with self.subTest(path=path):
                response = self.post(path, data)
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertIs(payload["saved"], False)
                self.assertEqual(payload["source"], "fallback")
                self.assertIsNone(payload["exercise"]["id"])
                self.assertIn("Brötchen", payload["exercise"]["correction"])
                self.assertTrue(payload["exercise"]["createdAt"])
                if path == "/bot/reply/":
                    self.assertIsNone(payload["exchange"]["id"])
                    self.assertTrue(payload["exchange"]["answer"])
                self.assertEqual(self.history(), before)

        response = self.client.get(API + "/writing/exercises/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["userText"] for item in response.json()["exercises"]], ["Ein Brot bitte."])


@override_settings(DEBUG=True, AUTH_PASSWORD_VALIDATORS=[])
class SceneProgressTests(TestCase):
    def setUp(self):
        # Keep seeded examples, but isolate the next-scene recommendation.
        Scene.objects.update(is_published=False)
        self.category = Category.objects.create(
            slug="scene-example", title_de="Beispielthema", title_ru="Example",
        )
        self.first = self.make_scene("first", "A Example")
        self.second = self.make_scene("second", "B Example")
        self.user = get_user_model().objects.create_user(
            username="scene-example-user", email="scene@example.test", password="sample-password-123",
        )
        response = self.client.post(
            API + "/auth/login/",
            data={"username": self.user.username, "password": "sample-password-123"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def make_scene(self, suffix, title, **fields):
        return Scene.objects.create(
            category=self.category, slug=f"scene-example-{suffix}", title=title,
            topic_id=self.category.slug, **fields,
        )

    def save_scene(self, scene_id=None, **fields):
        data = {"topicId": self.category.slug, "status": "completed", "completedExercises": 1, **fields}
        if scene_id is not None:
            data["sceneId"] = scene_id
        return self.client.post(API + "/progress/", data=data, content_type="application/json")

    def test_each_scene_has_independent_progress_and_repeated_saves_update_one_scene(self):
        for scene in (self.first, self.second):
            response = self.save_scene(scene.slug)
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.json()["progress"]["sceneId"], scene.slug)

        response = self.save_scene(self.first.slug, status="started", completedExercises=2)
        self.assertEqual(response.status_code, 201)
        entries = UserProgress.objects.filter(user=self.user)
        self.assertEqual(entries.count(), 2)
        first = entries.get(scene=self.first)
        second = entries.get(scene=self.second)
        self.assertEqual((first.scene_key, first.status, first.completed_exercises), (self.first.slug, "started", 2))
        self.assertEqual((second.scene_key, second.status, second.completed_exercises), (self.second.slug, "completed", 1))

    def test_dashboard_recommends_the_next_unfinished_scene_within_the_same_topic(self):
        self.assertEqual(self.save_scene(self.first.slug).status_code, 201)
        response = self.client.get(API + "/dashboard/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["learningPlan"]["nextScene"]["id"], self.second.slug)
        self.assertEqual(payload["progress"], {"completedScenes": 1, "startedScenes": 1, "totalScenes": 2})

    def test_dashboard_excludes_scenes_from_unpublished_or_missing_categories(self):
        private = Category.objects.create(
            slug="aaa-private-example", title_de="Privates Beispiel", title_ru="Private example", is_published=False,
        )
        for premium in (False, True):
            Scene.objects.create(
                category=private, topic_id=private.slug, slug=f"aaa-private-example-{premium}",
                title="Private example", is_premium=premium,
            )
        Scene.objects.create(slug="aaa-orphan-example", topic_id="aaa-orphan-example", title="Orphan example")

        response = self.client.get(API + "/dashboard/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["learningPlan"]["nextScene"]["id"], self.first.slug)
        self.assertEqual(payload["progress"]["totalScenes"], 2)
        self.assertEqual(payload["premiumHints"], [])

    def test_legacy_topic_only_save_completes_only_the_first_scene(self):
        self.assertEqual(self.save_scene().status_code, 201)
        progress = UserProgress.objects.get(user=self.user)
        self.assertEqual((progress.scene_id, progress.scene_key), (self.first.pk, self.first.slug))
        self.assertEqual(self.client.get(API + "/dashboard/").json()["learningPlan"]["nextScene"]["id"], self.second.slug)

    def test_progress_rejects_scenes_from_another_topic_and_unpublished_content(self):
        draft = self.make_scene("draft", "Draft", is_published=False)
        other = Category.objects.create(slug="other-scene-example", title_de="Anderes Beispiel", title_ru="Other")
        unrelated = Scene.objects.create(category=other, slug="unrelated-scene-example", title="Other", topic_id=other.slug)
        private = Category.objects.create(slug="private-scene-example", title_de="Privat", title_ru="Private", is_published=False)
        private_scene = Scene.objects.create(category=private, slug="private-scene-example", title="Private", topic_id=private.slug)

        for topic_id, scene_id in (
            (self.category.slug, draft.slug),
            (self.category.slug, unrelated.slug),
            (private.slug, private_scene.slug),
            (self.category.slug, "missing-scene-example"),
        ):
            with self.subTest(topic_id=topic_id, scene_id=scene_id):
                response = self.save_scene(scene_id, topicId=topic_id)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["code"], "invalid_scene")
                self.assertFalse(UserProgress.objects.filter(user=self.user).exists())

    def test_static_topic_without_published_database_scenes_keeps_one_fallback_entry(self):
        for scene_id in ("fallback:arzt", None):
            response = self.save_scene(scene_id, topicId="arzt")
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.json()["progress"]["sceneId"], "fallback:arzt")
        progress = UserProgress.objects.get(user=self.user)
        self.assertEqual(progress.topic_id, "arzt")
        self.assertIsNone(progress.scene_id)

    def test_another_users_completion_does_not_skip_our_first_scene(self):
        other = get_user_model().objects.create_user(username="other-scene-user", password="sample-password-123")
        UserProgress.objects.create(
            user=other, scene=self.first, scene_key=self.first.slug,
            topic_id=self.category.slug, status="completed",
        )
        response = self.client.get(API + "/dashboard/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["learningPlan"]["nextScene"]["id"], self.first.slug)
        self.assertEqual(payload["progress"]["completedScenes"], 0)
