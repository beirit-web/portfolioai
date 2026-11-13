import json

from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory, TestCase

from ..data import TOPICS
from ..learning_content import category_detail_from_db, category_summaries_from_db
from ..models import Category, QuizAnswer, QuizQuestion, Scene, SceneLine, Vocabulary
from ..views import topic_detail


class TopicSummaryPerformanceTests(TestCase):
    def setUp(self):
        # Keep migration examples available while isolating eligible categories.
        Category.objects.update(is_published=False)

    def make_category(self, index, *, is_published=True):
        return Category.objects.create(
            slug=f"summary-{index}", title_de=f"Topic {index}",
            title_ru=f"Example {index}", order=index, is_published=is_published,
        )

    def make_scene(self, category, suffix, *, is_published=True, lines=0):
        scene = Scene.objects.create(
            category=category, slug=f"{category.slug}-{suffix}", title=suffix,
            topic_id=category.slug, is_published=is_published,
        )
        SceneLine.objects.bulk_create([
            SceneLine(scene=scene, speaker="Example", text_de=f"Line {index}", text_ru=f"Example {index}")
            for index in range(lines)
        ])
        return scene

    def test_summary_counts_and_eligibility_stay_unchanged(self):
        category = self.make_category(1)
        self.make_scene(category, "first", lines=2)
        self.make_scene(category, "second", lines=3)
        # The existing summary counts all lines once a category is eligible.
        self.make_scene(category, "draft", is_published=False, lines=1)
        QuizQuestion.objects.bulk_create([
            QuizQuestion(topic_id=category.slug, prompt_ru="Example", correct_answer="Yes", is_active=active)
            for active in (True, True, False)
        ])
        empty = self.make_category(2)
        self.make_scene(empty, "empty")
        private = self.make_category(3, is_published=False)
        self.make_scene(private, "published", lines=7)
        draft_only = self.make_category(4)
        self.make_scene(draft_only, "draft", is_published=False, lines=9)
        self.make_category(5)

        with self.assertNumQueries(2):
            summaries = category_summaries_from_db()

        self.assertEqual([item["id"] for item in summaries], [category.slug, empty.slug])
        self.assertEqual([(item["phraseCount"], item["quizCount"]) for item in summaries], [(6, 2), (0, 0)])
        self.assertEqual(summaries[0]["label"], category.title_de)
        self.assertEqual(summaries[0]["ru"], category.title_ru)

    def test_more_categories_do_not_add_queries(self):
        category = self.make_category(1)
        self.make_scene(category, "published", lines=1)
        with self.assertNumQueries(2):
            initial = category_summaries_from_db()
        self.assertEqual(len(initial), 1)

        for index in range(2, 7):
            category = self.make_category(index)
            self.make_scene(category, "published", lines=index)
            QuizQuestion.objects.create(topic_id=category.slug, prompt_ru="Example", correct_answer="Yes")
        with self.assertNumQueries(2):
            expanded = category_summaries_from_db()
        self.assertEqual(len(expanded), 6)
        self.assertEqual([item["phraseCount"] for item in expanded], list(range(1, 7)))
        self.assertEqual([item["quizCount"] for item in expanded], [0, 1, 1, 1, 1, 1])

    def test_no_categories_only_needs_the_category_query(self):
        with self.assertNumQueries(1):
            self.assertEqual(category_summaries_from_db(), [])


class TopicDetailPerformanceTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            slug="detail-example", title_de="Beispiel", title_ru="Example",
            description_de="Published learning content.",
        )
        self.make_learning_content(1)
        draft = Scene.objects.create(
            category=self.category, slug="detail-draft", title="Draft",
            topic_id=self.category.slug, is_published=False,
        )
        SceneLine.objects.create(scene=draft, speaker="Example", text_de="Draft line", text_ru="Draft")
        Vocabulary.objects.create(
            category=self.category, scene=draft, word_de="Private vocabulary",
            translation_ru="Draft", is_published=False,
        )
        QuizQuestion.objects.create(
            topic_id=self.category.slug, prompt_ru="Inactive question",
            correct_answer="Yes", is_active=False,
        )

    def make_learning_content(self, index):
        scene = Scene.objects.create(
            category=self.category, slug=f"detail-scene-{index}", title=f"Scene {index}",
            topic_id=self.category.slug, level="a2", is_premium=True,
            description_ru=f"Explanation {index}",
        )
        SceneLine.objects.bulk_create([
            SceneLine(scene=scene, speaker="Example", text_de=f"Line {index}-{line}", text_ru=f"Translation {line}", order=line)
            for line in range(2)
        ])
        Vocabulary.objects.create(
            category=self.category, scene=scene, word_de=f"Example word {index}",
            translation_ru="Translation", example_de="Example sentence.",
        )
        question = QuizQuestion.objects.create(
            scene=scene, topic_id=self.category.slug, prompt_ru=f"Question {index}",
            correct_answer="Yes", explanation_ru="Explanation",
        )
        QuizAnswer.objects.bulk_create([
            QuizAnswer(question=question, text="No", order=0),
            QuizAnswer(question=question, text="Yes", order=1, is_correct=True),
        ])

    def assert_learning_content_matches(self, full, learning):
        self.assertEqual(learning["quiz"], [])
        self.assertNotIn("free_answer", learning)
        self.assertEqual(
            {key: value for key, value in full.items() if key not in ("quiz", "free_answer", "quizToken")},
            {key: value for key, value in learning.items() if key != "quiz"},
        )

    def test_detail_queries_stay_bounded_and_learning_content_is_preserved(self):
        for expected_scenes in (1, 4):
            if expected_scenes == 4:
                for index in range(2, 5):
                    self.make_learning_content(index)

            with self.assertNumQueries(6):
                full = category_detail_from_db(self.category.slug)
            with self.assertNumQueries(4):
                learning = category_detail_from_db(self.category.slug, include_quiz=False)

            self.assert_learning_content_matches(full, learning)
            self.assertEqual(len(full["scenes"]), expected_scenes)
            self.assertEqual(len(full["phrases"]), expected_scenes * 2)
            self.assertEqual(len(full["vocabulary"]), expected_scenes)
            self.assertEqual(len(full["quiz"]), expected_scenes)
            self.assertIsNone(full["free_answer"])
            self.assertEqual(full["quiz"][0]["options"], ["No", "Yes"])
            self.assertEqual(full["quiz"][0]["answer"], 1)
            self.assertTrue(full["scenes"][0]["isPremium"])
            self.assertEqual(full["scenes"][0]["level"], "a2")

    def test_missing_private_and_empty_categories_keep_their_fallback_behavior(self):
        private = Category.objects.create(slug="detail-private", title_de="Private", title_ru="Private", is_published=False)
        empty = Category.objects.create(slug="detail-empty", title_de="Empty", title_ru="Empty")
        draft_only = Category.objects.create(slug="detail-drafts", title_de="Drafts", title_ru="Drafts")
        Scene.objects.create(category=draft_only, slug="detail-only-draft", title="Draft", topic_id=draft_only.slug, is_published=False)
        for include_quiz, include_learning in ((True, True), (False, True), (True, False)):
            for slug, query_count in (("detail-missing", 1), (private.slug, 1), (empty.slug, 2), (draft_only.slug, 2)):
                with self.subTest(slug=slug, include_quiz=include_quiz, include_learning=include_learning):
                    with self.assertNumQueries(query_count):
                        self.assertIsNone(category_detail_from_db(slug, include_quiz=include_quiz, include_learning=include_learning))

    def response(self, topic_id, query=None):
        request = RequestFactory().get(f"/deutschlive/api/topics/{topic_id}/", query or {})
        request.user = AnonymousUser()
        SessionMiddleware(lambda request: None).process_request(request)
        return topic_detail(request, topic_id)

    def assert_public_topic_matches(self, actual, expected):
        self.assertTrue(actual["quizToken"])
        self.assertEqual(
            {key: value for key, value in actual.items() if key != "quizToken"},
            {key: value for key, value in expected.items() if key != "quizToken"},
        )

    def test_learning_read_mode_keeps_default_quiz_response_unchanged(self):
        full = json.loads(self.response(self.category.slug).content)
        with self.assertNumQueries(4):
            learning = json.loads(self.response(self.category.slug, {"view": "learn"}).content)
        self.assert_learning_content_matches(full, learning)
        self.assert_public_topic_matches(json.loads(self.response(self.category.slug, {"view": "unknown"}).content), full)
        self.assertTrue(full["quiz"])

    def test_static_fallback_supports_the_same_learning_read_mode(self):
        topic_id = "baeckerei"
        Scene.objects.filter(category__slug=topic_id).update(is_published=False)
        full = json.loads(self.response(topic_id).content)
        learning = json.loads(self.response(topic_id, {"view": "learn"}).content)
        self.assertEqual(
            {key: value for key, value in full.items() if key not in ("quiz", "quizToken")},
            {"id": topic_id, **{key: value for key, value in TOPICS[topic_id].items() if key != "quiz"}},
        )
        self.assertEqual(len(full["quiz"]), len(TOPICS[topic_id]["quiz"]))
        for public, source in zip(full["quiz"], TOPICS[topic_id]["quiz"]):
            self.assertEqual(public["question"], source["question"])
            self.assertEqual(public["options"], source["options"])
            self.assertNotIn("answer", public)
            self.assertNotIn("explain", public)
        self.assert_learning_content_matches(full, learning)
        self.assertTrue(full["quiz"])
        self.assertIsNotNone(full["free_answer"])
        # A learning response must not mutate the shared static topic.
        self.assert_public_topic_matches(json.loads(self.response(topic_id).content), full)

    def test_quiz_read_mode_avoids_learning_queries_and_preserves_questions(self):
        for expected_questions in (1, 4):
            if expected_questions == 4:
                for index in range(2, 5):
                    self.make_learning_content(index)

            full_response = self.response(self.category.slug)
            full = json.loads(full_response.content)
            with self.assertNumQueries(4):
                quiz_response = self.response(self.category.slug, {"view": "quiz"})
            quiz = json.loads(quiz_response.content)

            self.assert_public_topic_matches(quiz, {
                key: full[key] for key in ("id", "label", "icon", "ru", "quiz", "free_answer")
            })
            self.assertEqual(len(quiz["quiz"]), expected_questions)
            self.assertIn("no-store", quiz_response["Cache-Control"])
            for item in quiz["quiz"]:
                self.assertNotIn("answer", item)
                self.assertNotIn("explain", item)
            self.assertLess(len(quiz_response.content), len(full_response.content))
            # Public quiz reads must not serialize premium scene dialogue or vocabulary.
            for field in ("scenes", "phrases", "vocabulary", "exercises", "description", "pronunciation"):
                self.assertNotIn(field, quiz)
            self.assertNotIn(b"Line 1-0", quiz_response.content)
            self.assertNotIn(b"Example word 1", quiz_response.content)

    def test_quiz_read_mode_keeps_an_empty_quiz_empty(self):
        QuizQuestion.objects.filter(topic_id=self.category.slug).update(is_active=False)
        with self.assertNumQueries(3):
            payload = json.loads(self.response(self.category.slug, {"view": "quiz"}).content)
        self.assertEqual(payload["quiz"], [])
        self.assertIsNone(payload["free_answer"])

    def test_static_fallback_supports_the_same_quiz_read_mode(self):
        topic_id = "baeckerei"
        Scene.objects.filter(category__slug=topic_id).update(is_published=False)
        full = json.loads(self.response(topic_id).content)
        quiz = json.loads(self.response(topic_id, {"view": "quiz"}).content)
        self.assert_public_topic_matches(quiz, {
            key: full.get(key) for key in ("id", "label", "icon", "ru", "quiz", "free_answer")
        })
        self.assertTrue(quiz["quiz"])
        self.assertIsNotNone(quiz["free_answer"])
        self.assert_public_topic_matches(json.loads(self.response(topic_id).content), full)

    def test_missing_and_private_topics_remain_not_found_in_all_read_modes(self):
        private = Category.objects.create(slug="private-api-example", title_de="Private", title_ru="Private", is_published=False)
        for slug in ("missing-api-example", private.slug):
            for query in (None, {"view": "learn"}, {"view": "quiz"}):
                with self.subTest(slug=slug, query=query):
                    self.assertEqual(self.response(slug, query).status_code, 404)
