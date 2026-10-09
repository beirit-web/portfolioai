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

    def test_arzt_module_structure_is_prepared(self):
        category = Category.objects.get(slug="arzt")

        self.assertEqual(category.title_ru, "Врач")
        self.assertIn("Arzttermin", category.description_de)
        self.assertIn("симптомы", category.description_ru)
        self.assertTrue(category.is_published)

    def test_jobcenter_terms_are_separated_for_russian_target_group(self):
        category = Category.objects.get(slug="jobcenter")

        self.assertEqual(category.title_de, "Jobcenter und Agentur für Arbeit")
        self.assertEqual(category.title_ru, "Jobcenter и Agentur für Arbeit")
        self.assertIn("Bürgergeld", category.description_ru)
        self.assertIn("ALG I", category.description_ru)
        self.assertIn("Unterlagen", category.description_de)

    def test_jobcenter_scenes_and_dialogues_are_seeded(self):
        response = self.client.get("/api/topics/jobcenter/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "jobcenter")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 15)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("jobcenter-termin-klaeren", scene_ids)
        self.assertIn("jobcenter-unterlagen-abgeben", scene_ids)
        self.assertIn("jobcenter-rueckfrage-verstehen", scene_ids)
        self.assertIn("arbeitsagentur-arbeitssuche", scene_ids)
        first_dialogue = payload["scenes"][0]["dialogue"][0]
        self.assertTrue(first_dialogue["de"])
        self.assertTrue(first_dialogue["ru"])
        self.assertTrue(any("wiederholen" in item["de"] for item in payload["phrases"]))
        self.assertTrue(any("langsam" in item["de"] for item in payload["phrases"]))

    def test_jobcenter_vocabulary_exercises_and_pronunciation_are_seeded(self):
        response = self.client.get("/api/topics/jobcenter/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["vocabulary"]), 20)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        vocabulary = {item["de"]: item for item in payload["vocabulary"]}
        self.assertIn("das Bürgergeld", vocabulary)
        self.assertIn("die Agentur für Arbeit", vocabulary)
        self.assertIn("die Unterlagen", vocabulary)
        self.assertIn("Jobcenter", vocabulary["das Bürgergeld"]["note"])
        self.assertTrue(any(exercise["type"] == "translation" for exercise in payload["exercises"]))
        self.assertTrue(any("Unterlagen" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_jobcenter_quiz_and_free_answer_are_seeded(self):
        response = self.client.get("/api/topics/jobcenter/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["quiz"]), 6)
        self.assertIsNotNone(payload["free_answer"])
        self.assertIn("Jobcenter", payload["free_answer"]["prompt"])
        self.assertIn("Agentur für Arbeit", payload["free_answer"]["prompt"])
        first_question = payload["quiz"][0]
        self.assertTrue(first_question["question"])
        self.assertGreaterEqual(len(first_question["options"]), 3)
        self.assertTrue(first_question["explain"])
        self.assertTrue(any("Bürgergeld" in item["explain"] for item in payload["quiz"]))
        self.assertTrue(any("ALG I" in item["explain"] for item in payload["quiz"]))

    def test_wohnung_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/wohnung/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "wohnung")
        self.assertEqual(payload["label"], "Wohnung")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("wohnung-besichtigung", scene_ids)
        self.assertIn("wohnung-unterlagen", scene_ids)
        self.assertIn("wohnung-reparatur", scene_ids)
        self.assertTrue(any(item["de"] == "die Warmmiete" for item in payload["vocabulary"]))
        self.assertTrue(any("Warmmiete" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_wohnung_static_topic(self):
        user = get_user_model().objects.create_user(username="wohnungprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "wohnung", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "wohnung")

    def test_telefonate_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/telefonate/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "telefonate")
        self.assertEqual(payload["label"], "Telefonate")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("telefonate-anrufen", scene_ids)
        self.assertIn("telefonate-termin-verschieben", scene_ids)
        self.assertIn("telefonate-nachricht-hinterlassen", scene_ids)
        self.assertTrue(any(item["de"] == "anrufen" for item in payload["vocabulary"]))
        self.assertTrue(any("langsam" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_telefonate_static_topic(self):
        user = get_user_model().objects.create_user(username="telefonprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "telefonate", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "telefonate")

    def test_arbeit_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/arbeit/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "arbeit")
        self.assertEqual(payload["label"], "Arbeit")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("arbeit-bewerbung", scene_ids)
        self.assertIn("arbeit-vorstellungsgespraech", scene_ids)
        self.assertIn("arbeit-arbeitsalltag", scene_ids)
        self.assertTrue(any(item["de"] == "der Lebenslauf" for item in payload["vocabulary"]))
        self.assertTrue(any("zuerst" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_arbeit_static_topic(self):
        user = get_user_model().objects.create_user(username="arbeitprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "arbeit", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "arbeit")

    def test_supermarkt_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/supermarkt/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "supermarkt")
        self.assertEqual(payload["label"], "Supermarkt")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("supermarkt-produkte-finden", scene_ids)
        self.assertIn("supermarkt-kasse", scene_ids)
        self.assertIn("supermarkt-reklamation", scene_ids)
        self.assertTrue(any(item["de"] == "der Kassenbon" for item in payload["vocabulary"]))
        self.assertTrue(any("umtauschen" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_supermarkt_static_topic(self):
        user = get_user_model().objects.create_user(username="supermarktprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "supermarkt", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "supermarkt")

    def test_apotheke_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/apotheke/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "apotheke")
        self.assertEqual(payload["label"], "Apotheke")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("apotheke-medikament-suchen", scene_ids)
        self.assertIn("apotheke-dosierung", scene_ids)
        self.assertIn("apotheke-rezept", scene_ids)
        self.assertTrue(any(item["de"] == "die Packungsbeilage" for item in payload["vocabulary"]))
        self.assertTrue(any("Medikament" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_apotheke_static_topic(self):
        user = get_user_model().objects.create_user(username="apothekeprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "apotheke", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "apotheke")

    def test_schule_kindergarten_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/schule-kindergarten/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "schule-kindergarten")
        self.assertEqual(payload["label"], "Schule und Kindergarten")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("schule-kindergarten-krankmelden", scene_ids)
        self.assertIn("schule-kindergarten-elterngespraech", scene_ids)
        self.assertIn("schule-kindergarten-abholen", scene_ids)
        self.assertTrue(any(item["de"] == "die Entschuldigung" for item in payload["vocabulary"]))
        self.assertTrue(any("14 Uhr" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_schule_kindergarten_static_topic(self):
        user = get_user_model().objects.create_user(username="schuleprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "schule-kindergarten", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "schule-kindergarten")

    def test_behoerden_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/behoerden/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "behoerden")
        self.assertEqual(payload["label"], "Behoerden")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("behoerden-termin-anmelden", scene_ids)
        self.assertIn("behoerden-formular-abgeben", scene_ids)
        self.assertIn("behoerden-bescheinigung", scene_ids)
        self.assertTrue(any(item["de"] == "die Meldebescheinigung" for item in payload["vocabulary"]))
        self.assertTrue(any("Meldebescheinigung" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_behoerden_static_topic(self):
        user = get_user_model().objects.create_user(username="behoerdenprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "behoerden", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "behoerden")

    def test_oeffentlicher_verkehr_module_is_seeded_with_content(self):
        response = self.client.get("/api/topics/oeffentlicher-verkehr/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "oeffentlicher-verkehr")
        self.assertEqual(payload["label"], "Oeffentlicher Verkehr")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 12)
        self.assertGreaterEqual(len(payload["vocabulary"]), 15)
        self.assertGreaterEqual(len(payload["quiz"]), 3)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("oeffentlicher-verkehr-ticket-kaufen", scene_ids)
        self.assertIn("oeffentlicher-verkehr-richtung", scene_ids)
        self.assertIn("oeffentlicher-verkehr-verspaetung", scene_ids)
        self.assertTrue(any(item["de"] == "die Verspaetung" for item in payload["vocabulary"]))
        self.assertTrue(any("umsteigen" in exercise.get("answer", "") for exercise in payload["exercises"]))

    def test_progress_accepts_oeffentlicher_verkehr_static_topic(self):
        user = get_user_model().objects.create_user(username="oepnvprogress", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/progress/",
            data={"topicId": "oeffentlicher-verkehr", "status": "started", "completedExercises": 1},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["progress"]["topicId"], "oeffentlicher-verkehr")

    def test_arzt_scenes_and_dialogues_are_seeded(self):
        response = self.client.get("/api/topics/arzt/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], "arzt")
        self.assertGreaterEqual(len(payload["scenes"]), 3)
        self.assertGreaterEqual(len(payload["phrases"]), 15)
        scene_ids = {scene["id"] for scene in payload["scenes"]}
        self.assertIn("arzt-termin-vereinbaren", scene_ids)
        self.assertIn("arzt-anmeldung", scene_ids)
        self.assertIn("arzt-symptome-beschreiben", scene_ids)
        first_dialogue = payload["scenes"][0]["dialogue"][0]
        self.assertIn("Guten Tag", first_dialogue["de"])
        self.assertTrue(first_dialogue["ru"])
        self.assertTrue(next(item for item in payload["phrases"] if item["scene"] == "arzt-nachfragen")["hint"])

    def test_arzt_vocabulary_exercises_and_pronunciation_are_seeded(self):
        response = self.client.get("/api/topics/arzt/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["vocabulary"]), 20)
        self.assertGreaterEqual(len(payload["exercises"]), 3)
        self.assertGreaterEqual(len(payload["pronunciation"]), 4)
        self.assertTrue(any(item["de"] == "die Gesundheitskarte" for item in payload["vocabulary"]))
        self.assertTrue(any(exercise["type"] == "translation" for exercise in payload["exercises"]))

    def test_arzt_quiz_and_free_answer_are_seeded(self):
        response = self.client.get("/api/topics/arzt/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["quiz"]), 6)
        self.assertIsNotNone(payload["free_answer"])
        self.assertIn("немецком", payload["free_answer"]["prompt"])
        first_question = payload["quiz"][0]
        self.assertTrue(first_question["question"])
        self.assertGreaterEqual(len(first_question["options"]), 3)
        self.assertTrue(first_question["explain"])

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

        response = self.client.get("/api/topics/baeckerei/")

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
        response = self.client.get("/api/topics/baeckerei/")

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
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        self.client.post(
            "/api/quiz-attempts/",
            data={"topicId": "baeckerei", "score": 2, "total": 6, "durationSeconds": 90, "difficulty": "easy"},
            content_type="application/json",
        )

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("learningPlan", payload)
        self.assertIsNotNone(payload["learningPlan"]["nextScene"])
        self.assertEqual(payload["learningPlan"]["reviewTopics"][0]["topicId"], "baeckerei")
        self.assertGreaterEqual(payload["progress"]["totalScenes"], 1)
        self.assertTrue(any(item["id"] == "premium-dashboard-test" for item in payload["premiumHints"]))
