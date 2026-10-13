import copy
import json
import time
from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache
from django.db import DatabaseError
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from ..data import TOPICS
from ..models import Category, QuizAnswer, QuizQuestion, QuizResult, Scene, UserProfile


API_PREFIX = "/deutschlive/api"
PLATFORM_SESSION = False


@override_settings(AUTH_PASSWORD_VALIDATORS=[], LOGIN_REQUIRED=False, RATE_LIMIT_POLICIES={})
class QuizSystemTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_seeded_quiz_questions_have_structured_answers(self):
        question = QuizQuestion.objects.filter(topic_id="baeckerei", is_active=True).prefetch_related("answers").first()

        self.assertIsNotNone(question)
        self.assertGreaterEqual(question.answers.count(), 3)
        self.assertEqual(question.answers.filter(is_correct=True).count(), 1)

    def test_db_quiz_serializes_stable_ids_without_revealing_answers(self):
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

        issued = []
        for query in ({}, {"view": "quiz"}):
            response = self.client.get(f"{API_PREFIX}/topics/baeckerei/", query)
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertTrue(payload["quizToken"])
            quiz_item = next(item for item in payload["quiz"] if item["question"] == "Тестовый вопрос?")
            self.assertEqual(quiz_item["options"], ["falsch", "richtig"])
            self.assertIsInstance(quiz_item["id"], str)
            self.assertEqual(len(quiz_item["optionIds"]), 2)
            self.assertEqual(len(set(quiz_item["optionIds"])), 2)
            self.assertTrue(all(isinstance(option_id, str) for option_id in quiz_item["optionIds"]))
            for item in payload["quiz"]:
                self.assertNotIn("answer", item)
                self.assertNotIn("explain", item)
            issued.append(quiz_item)
        self.assertEqual(issued[0], issued[1])


@override_settings(AUTH_PASSWORD_VALIDATORS=[], LOGIN_REQUIRED=False, RATE_LIMIT_POLICIES={})
class QuizAssessmentContractTests(TestCase):
    def setUp(self):
        cache.clear()
        QuizQuestion.objects.filter(topic_id="baeckerei").delete()
        scene = Scene.objects.filter(category__slug="baeckerei", is_published=True).first()
        self.questions = []
        for number, correct_index in ((1, 1), (2, 0)):
            question = QuizQuestion.objects.create(
                scene=scene,
                topic_id="baeckerei",
                prompt_ru=f"Contract question {number}",
                correct_answer=f"Correct {number}",
                explanation_ru=f"Explanation {number}",
            )
            choices = [f"Wrong {number}", f"Correct {number}"]
            if correct_index == 0:
                choices.reverse()
            for index, text in enumerate(choices):
                QuizAnswer.objects.create(
                    question=question, text=text, is_correct=text == f"Correct {number}", order=index,
                )
            self.questions.append(question)

    def _login(self, username="quiz-contract-user"):
        user = get_user_model().objects.create_user(username=username, password="strong-pass-123")
        UserProfile.objects.get_or_create(user=user, defaults={"email_verified": True})
        self._authenticate(user)
        return user

    def _authenticate(self, user):
        if PLATFORM_SESSION:
            self.client.force_login(user)
        else:
            response = self.client.post(
                f"{API_PREFIX}/auth/login/",
                data={"username": user.username, "password": "strong-pass-123"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 200)

    def _quiz(self, topic_id="baeckerei"):
        response = self.client.get(f"{API_PREFIX}/topics/{topic_id}/", {"view": "quiz"})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def _payload(self, quiz=None, *, save=False):
        quiz = quiz or self._quiz()
        answers = []
        for item in quiz["quiz"]:
            number = item["question"].rsplit(" ", 1)[1]
            correct_index = item["options"].index(f"Correct {number}")
            answers.append({"questionId": item["id"], "optionId": item["optionIds"][correct_index]})
        return {
            "topicId": quiz["id"],
            "quizToken": quiz["quizToken"],
            "answers": answers,
            "freeAnswer": "Ich hätte gern ein Brot.",
            "freeAnswerExpired": False,
            "durationSeconds": 180,
            "difficulty": "medium",
            "save": save,
        }

    def _post(self, payload):
        return self.client.post(
            f"{API_PREFIX}/quiz-attempts/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def _assert_rejected(self, payload, status=400, code=None):
        before = QuizResult.objects.count()
        response = self._post(payload)
        self.assertEqual(response.status_code, status, response.content)
        if status == 401:
            self.assertTrue(response.json().get("error") or response.json().get("reason"))
        else:
            self.assertTrue(response.json().get("error"))
        self.assertFalse(response.json().get("saved", False))
        if code:
            self.assertEqual(response.json().get("code"), code)
        self.assertEqual(QuizResult.objects.count(), before)
        return response

    def test_guest_is_assessed_without_saving_and_client_scores_are_ignored(self):
        payload = self._payload()
        quiz = self._quiz()
        wrong = quiz["quiz"][0]
        right_id = payload["answers"][0]["optionId"]
        payload["answers"][0]["optionId"] = next(option_id for option_id in wrong["optionIds"] if option_id != right_id)
        payload.update({"score": 999999, "total": 1})

        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertFalse(result["saved"])
        self.assertIsNone(result["attempt"]["id"])
        self.assertEqual((result["attempt"]["score"], result["attempt"]["total"], result["attempt"]["percentage"]), (2, 3, 67))
        self.assertEqual((result["attempt"]["durationSeconds"], result["attempt"]["difficulty"]), (180, "medium"))
        self.assertEqual(len(result["feedback"]), 2)
        feedback = {item["questionId"]: item for item in result["feedback"]}
        first = feedback[wrong["id"]]
        self.assertFalse(first["correct"])
        self.assertEqual(first["selectedOptionId"], payload["answers"][0]["optionId"])
        self.assertEqual(first["correctOptionId"], right_id)
        self.assertEqual(first["explain"], "Explanation 1")
        self.assertTrue(result["writing"]["accepted"])
        self.assertTrue(result["writing"]["explain"])
        self.assertEqual(QuizResult.objects.count(), 0)

    def test_quiz_attempt_can_be_saved_for_db_topic(self):
        user = self._login()
        response = self._post(self._payload(save=True))

        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertTrue(result["saved"])
        payload = result["attempt"]
        self.assertEqual(payload["topicLabel"], "Пекарня")
        self.assertEqual((payload["score"], payload["total"], payload["percentage"]), (3, 3, 100))
        attempt = QuizResult.objects.get(pk=payload["id"])
        self.assertEqual(attempt.user, user)
        self.assertEqual((attempt.score, attempt.total, attempt.duration_seconds, attempt.difficulty), (3, 3, 180, "medium"))

    def test_authenticated_practice_is_assessed_without_saving(self):
        self._login()
        response = self._post(self._payload(save=False))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["saved"])
        self.assertIsNone(response.json()["attempt"]["id"])
        self.assertEqual(QuizResult.objects.count(), 0)

    def test_answer_order_does_not_determine_the_result(self):
        payload = self._payload()
        payload["answers"].reverse()
        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["attempt"]["score"], 3)
        self.assertTrue(all(item["correct"] for item in response.json()["feedback"]))

    def test_unanswered_choices_and_expired_writing_are_incorrect(self):
        payload = self._payload()
        payload["answers"] = [{"questionId": item["questionId"], "optionId": None} for item in payload["answers"]]
        payload["freeAnswerExpired"] = True
        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual((result["attempt"]["score"], result["attempt"]["total"]), (0, 3))
        self.assertFalse(result["writing"]["accepted"])
        for item in result["feedback"]:
            self.assertFalse(item["correct"])
            self.assertIsNone(item["selectedOptionId"])
            self.assertTrue(item["correctOptionId"])

    def test_writing_point_measures_completion_at_eight_trimmed_characters(self):
        for text, expired, accepted in (
            ("", False, False), ("1234567", False, False), (" 1234567 ", False, False),
            ("12345678", False, True), (" 12345678 ", False, True), ("12345678", True, False),
        ):
            with self.subTest(text=text, expired=expired):
                payload = self._payload()
                payload.update({"freeAnswer": text, "freeAnswerExpired": expired})
                response = self._post(payload)
                self.assertEqual(response.status_code, 200)
                result = response.json()
                self.assertEqual(result["writing"]["accepted"], accepted)
                self.assertEqual((result["attempt"]["score"], result["attempt"]["total"]), (2 + int(accepted), 3))

    def test_unknown_missing_duplicate_and_foreign_questions_are_rejected(self):
        valid = self._payload()
        category = Category.objects.create(slug="quiz-foreign-example", title_de="Example", title_ru="Example")
        scene = Scene.objects.create(
            category=category, slug="quiz-foreign-scene", title="Example", topic_id=category.slug,
        )
        question = QuizQuestion.objects.create(
            scene=scene, topic_id=category.slug, prompt_ru="Foreign question", correct_answer="Yes",
        )
        QuizAnswer.objects.create(question=question, text="Yes", is_correct=True)
        QuizAnswer.objects.create(question=question, text="No", is_correct=False, order=1)
        foreign_id = self._quiz(category.slug)["quiz"][0]["id"]
        for answers in (
            [],
            valid["answers"][:-1],
            valid["answers"] + [valid["answers"][0]],
            [valid["answers"][0], valid["answers"][0]],
            [{"questionId": "unknown-question", "optionId": None}, valid["answers"][1]],
            [{"questionId": foreign_id, "optionId": None}, valid["answers"][1]],
        ):
            with self.subTest(answers=answers):
                self._assert_rejected({**valid, "answers": answers})

    def test_unknown_and_other_questions_options_are_rejected(self):
        valid = self._payload()
        for option_id in ("unknown-option", valid["answers"][1]["optionId"], 0, True, [], {}):
            with self.subTest(option_id=option_id):
                payload = copy.deepcopy(valid)
                payload["answers"][0]["optionId"] = option_id
                self._assert_rejected(payload)

    def test_token_requires_the_original_topic_and_signature(self):
        valid = self._payload()
        for changes in (
            {"topicId": "arzt"}, {"topicId": "missing-topic"}, {"quizToken": "invalid-token"},
            {"quizToken": valid["quizToken"] + "tampered"},
        ):
            with self.subTest(changes=changes):
                self._assert_rejected({**valid, **changes})

    def test_modified_question_or_option_invalidates_the_issued_quiz(self):
        valid = self._payload()
        self.questions[0].prompt_ru = "Changed after issue"
        self.questions[0].save(update_fields=["prompt_ru"])
        self._assert_rejected(valid)
        self.questions[0].prompt_ru = "Contract question 1"
        self.questions[0].save(update_fields=["prompt_ru"])
        valid = self._payload()
        option = self.questions[0].answers.first()
        option.text = "Changed option after issue"
        option.save(update_fields=["text"])
        self._assert_rejected(valid)

    def test_modified_answer_key_invalidates_the_issued_quiz(self):
        valid = self._payload()
        correct = self.questions[0].answers.get(is_correct=True)
        correct.is_correct = False
        correct.save(update_fields=["is_correct"])
        self._assert_rejected(valid)

    def test_added_question_invalidates_the_issued_question_set(self):
        valid = self._payload()
        question = QuizQuestion.objects.create(
            topic_id="baeckerei", prompt_ru="Contract question 3", correct_answer="Correct 3",
        )
        QuizAnswer.objects.create(question=question, text="Correct 3", is_correct=True)
        QuizAnswer.objects.create(question=question, text="Wrong 3", is_correct=False, order=1)
        self._assert_rejected(valid)

    def test_malformed_json_and_request_shapes_are_rejected(self):
        before = QuizResult.objects.count()
        for body in ('{"topicId":', '{"score":' + "9" * 5000 + "}"):
            with self.subTest(body_kind="large integer" if "score" in body else "incomplete JSON"):
                response = self.client.post(
                    f"{API_PREFIX}/quiz-attempts/", data=body, content_type="application/json",
                )
                self.assertEqual(response.status_code, 400)
                self.assertTrue(response.json().get("error"))
                self.assertEqual(QuizResult.objects.count(), before)
        valid = self._payload()
        for payload in (None, [], {}, {**valid, "topicId": []}, {**valid, "answers": {}}, {**valid, "answers": [None]}):
            with self.subTest(payload=payload):
                self._assert_rejected(payload)
        for field in ("topicId", "quizToken", "answers"):
            with self.subTest(missing=field):
                payload = copy.deepcopy(valid)
                del payload[field]
                self._assert_rejected(payload)

    def test_duration_difficulty_and_writing_types_and_limits_are_validated(self):
        valid = self._payload()
        for field, values in (
            ("durationSeconds", (None, True, "180", 1.5, [], -1, 2147483648)),
            ("difficulty", (None, True, [], "unknown")),
            ("freeAnswer", (None, True, [], "x" * 10001)),
            ("freeAnswerExpired", (None, "false", 0, [])),
            ("save", (None, "false", 0, [])),
        ):
            for value in values:
                with self.subTest(field=field, value=value):
                    self._assert_rejected({**valid, field: value})

    def test_lone_surrogates_are_rejected_for_guest_and_saved_submissions(self):
        guest = self._payload(save=False)
        for text in ("1234567\ud800", "\udfff1234567"):
            with self.subTest(save=False, text=text):
                self._assert_rejected({**guest, "freeAnswer": text})
        self._login()
        saved = self._payload(save=True)
        for text in ("1234567\ud800", "\udfff1234567"):
            with self.subTest(save=True, text=text):
                self._assert_rejected({**saved, "freeAnswer": text})
        self.assertEqual(QuizResult.objects.count(), 0)

    def test_optional_duration_and_difficulty_defaults_are_preserved(self):
        payload = self._payload()
        del payload["durationSeconds"]
        del payload["difficulty"]
        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        attempt = response.json()["attempt"]
        self.assertEqual((attempt["durationSeconds"], attempt["difficulty"]), (0, "easy"))

    def test_guest_cannot_request_persistence(self):
        self._assert_rejected(self._payload(save=True), status=401)

    def test_save_progress_opt_out_is_enforced(self):
        user = self._login()
        UserProfile.objects.filter(user=user).update(save_progress=False)
        self._assert_rejected(self._payload(save=True), status=403, code="save_progress_disabled")
        response = self._post(self._payload(save=False))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["saved"])

    def test_token_cannot_be_reused_after_account_switch(self):
        self._login("first-quiz-user")
        payload = self._payload(save=True)
        self.client.post(f"{API_PREFIX}/auth/logout/")
        self._login("second-quiz-user")
        self._assert_rejected(payload, status=403)

    def test_token_cannot_be_reused_after_logout_even_without_saving(self):
        self._login()
        payload = self._payload(save=False)
        self.client.post(f"{API_PREFIX}/auth/logout/")
        self._assert_rejected(payload, status=401)

    def test_guest_token_cannot_be_reused_after_login(self):
        payload = self._payload()
        self._login()
        self._assert_rejected(payload, status=403)

    def test_expired_authentication_can_resume_the_original_submission_after_relogin(self):
        user = self._login()
        payload = self._payload(save=True)
        if PLATFORM_SESSION:
            from pages.models import Profile

            Profile.objects.filter(user=user).update(last_activity_at=timezone.now() - timedelta(days=1))
        else:
            with patch("django.core.signing.time.time", return_value=time.time() - 60 * 60 * 24 * 30):
                expired_token = signing.TimestampSigner(salt="learning-auth").sign(str(user.pk))
            self.client.cookies["learning_auth_token"] = expired_token
        self._assert_rejected(payload, status=401)
        self._authenticate(user)
        response = self._post(payload)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["saved"])
        self.assertEqual(QuizResult.objects.get().user_id, user.pk)

    def test_logout_and_same_user_relogin_can_retry_the_existing_receipt(self):
        user = self._login()
        payload = self._payload(save=True)
        first = self._post(payload)
        self.assertEqual(first.status_code, 201)
        self.client.post(f"{API_PREFIX}/auth/logout/")
        self._authenticate(user)
        retry = self._post(payload)

        self.assertIn(retry.status_code, (200, 201))
        self.assertTrue(retry.json()["saved"])
        self.assertEqual(retry.json()["attempt"]["id"], first.json()["attempt"]["id"])
        self.assertEqual(QuizResult.objects.count(), 1)

    def test_expired_quiz_token_is_rejected(self):
        payload = self._payload()
        with patch("django.core.signing.time.time", return_value=time.time() + 60 * 60 * 24 * 30):
            self._assert_rejected(payload, code="quiz_expired")

    def test_database_failure_has_no_false_save_success(self):
        self._login()
        payload = self._payload(save=True)
        with patch("lessons.models.QuizAttempt.save", side_effect=DatabaseError("test database unavailable")):
            self._assert_rejected(payload, status=503)

    def test_identical_save_retry_survives_a_new_client_without_duplicate_rows(self):
        self._login()
        payload = self._payload(save=True)
        first = self._post(payload)
        self.assertEqual(first.status_code, 201)
        retry_client = Client()
        retry_client.cookies = copy.deepcopy(self.client.cookies)
        retry = retry_client.post(
            f"{API_PREFIX}/quiz-attempts/", data=json.dumps(payload), content_type="application/json",
        )
        self.assertIn(retry.status_code, (200, 201))
        self.assertTrue(retry.json()["saved"])
        self.assertEqual(retry.json()["attempt"], first.json()["attempt"])
        self.assertEqual(QuizResult.objects.count(), 1)

    def test_retry_ignores_claimed_scores_and_answer_order(self):
        self._login()
        payload = self._payload(save=True)
        first = self._post(payload)
        self.assertEqual(first.status_code, 201)
        payload["answers"].reverse()
        payload.update({"score": 999999, "total": -1})
        retry = self._post(payload)
        self.assertIn(retry.status_code, (200, 201))
        self.assertEqual(retry.json()["attempt"]["id"], first.json()["attempt"]["id"])
        self.assertEqual(QuizResult.objects.count(), 1)

    def test_saved_token_cannot_be_reused_for_a_changed_submission(self):
        self._login()
        payload = self._payload(save=True)
        first = self._post(payload)
        self.assertEqual(first.status_code, 201)
        for changes in (
            {"answers": [{"questionId": item["questionId"], "optionId": None} for item in payload["answers"]]},
            {"freeAnswer": "Eine andere schriftliche Antwort."}, {"freeAnswerExpired": True},
            {"durationSeconds": 181}, {"difficulty": "hard"},
        ):
            with self.subTest(changes=changes):
                self._assert_rejected({**payload, **changes}, code="quiz_already_submitted")
        self.assertEqual(QuizResult.objects.count(), 1)

    def test_each_new_quiz_token_can_create_its_own_attempt(self):
        self._login()
        first_payload = self._payload(save=True)
        second_payload = self._payload(save=True)
        self.assertNotEqual(first_payload["quizToken"], second_payload["quizToken"])
        first, second = self._post(first_payload), self._post(second_payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(first.json()["attempt"]["id"], second.json()["attempt"]["id"])
        self.assertEqual(QuizResult.objects.count(), 2)

    def test_guest_token_is_bound_to_the_issuing_browser_session(self):
        payload = self._payload()
        response = Client().post(
            f"{API_PREFIX}/quiz-attempts/", data=json.dumps(payload), content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json().get("error"))
        self.assertEqual(QuizResult.objects.count(), 0)

    def test_guest_account_refresh_preserves_the_issued_quiz_session(self):
        payload = self._payload()
        owner = self.client.session["quiz_anonymous_owner"]
        session_cookie = self.client.cookies[settings.SESSION_COOKIE_NAME].value
        for _ in range(3):
            response = self.client.get(f"{API_PREFIX}/auth/me/")
            self.assertEqual(response.status_code, 200)
            self.assertIsNone(response.json()["user"])
            self.assertEqual(self.client.session["quiz_anonymous_owner"], owner)
            self.assertEqual(self.client.cookies[settings.SESSION_COOKIE_NAME].value, session_cookie)
        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["saved"])
        self.assertIsNone(response.json()["attempt"]["id"])
        self.assertEqual(QuizResult.objects.count(), 0)

    def test_static_fallback_uses_the_same_answer_contract(self):
        topic_id = "baeckerei"
        Category.objects.filter(slug=topic_id).update(is_published=False)
        quiz = self._quiz(topic_id)
        source = TOPICS[topic_id]
        answers = [
            {"questionId": item["id"], "optionId": item["optionIds"][source["quiz"][index]["answer"]]}
            for index, item in enumerate(quiz["quiz"])
        ]
        response = self._post({
            "topicId": topic_id, "quizToken": quiz["quizToken"], "answers": answers,
            "freeAnswer": "Ich hätte gern ein Brot.", "freeAnswerExpired": False,
            "durationSeconds": 30, "difficulty": "easy", "save": False,
        })

        self.assertEqual(response.status_code, 200)
        result = response.json()
        total = len(quiz["quiz"]) + int(bool(quiz.get("free_answer")))
        self.assertEqual((result["attempt"]["score"], result["attempt"]["total"], result["attempt"]["percentage"]), (total, total, 100))
        self.assertFalse(result["saved"])
        self.assertTrue(all(item["correct"] for item in result["feedback"]))
        self.assertEqual(QuizResult.objects.count(), 0)
