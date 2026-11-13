"""Server-side quiz contracts; signed tokens contain no answer material."""

import json
import secrets

from django.core import signing
from django.db import transaction
from django.utils.crypto import constant_time_compare, salted_hmac

from .data import TOPICS
from .learning_content import category_detail_from_db
from .models import QuizResult

TOKEN_SALT = "lessons-quiz-v1"
TOKEN_MAX_AGE = 2 * 60 * 60
MAX_FREE_ANSWER = 10000


class QuizContractError(Exception):
    def __init__(self, message="Некорректный результат викторины.", *, status=400, code="invalid_quiz_attempt"):
        super().__init__(message)
        self.status = status
        self.code = code


def _owner(request):
    if request.user.is_authenticated:
        # Reauthentication may rotate the session key; a valid account can retry its own quiz.
        return {"user": str(request.user.pk)}
    anonymous_id = request.session.get("quiz_anonymous_owner")
    if not anonymous_id:
        anonymous_id = secrets.token_urlsafe(24)
        request.session["quiz_anonymous_owner"] = anonymous_id
    return {"user": None, "session": anonymous_id}


def _snapshot(payload):
    topic_id = payload["id"]
    questions = []
    for index, item in enumerate(payload.get("quiz", [])):
        options = item.get("options", [])
        answer = item.get("answer")
        question_id = item.get("id", f"fallback:{topic_id}:{index}")
        option_ids = item.get("optionIds", [f"{question_id}:option:{number}" for number in range(len(options))])
        if (not isinstance(options, list) or not options or any(not isinstance(option, str) for option in options)
                or type(answer) is not int or not 0 <= answer < len(options)
                or not isinstance(question_id, str) or len(option_ids) != len(options)
                or len(set(option_ids)) != len(option_ids)):
            raise QuizContractError("Quiz is temporarily unavailable.", status=503, code="quiz_unavailable")
        questions.append({"id": question_id, "question": item["question"], "options": options,
                          "optionIds": option_ids, "answer": answer, "explain": item.get("explain", "")})
    if len(questions) > 32766 or len({item["id"] for item in questions}) != len(questions):
        raise QuizContractError("Quiz is temporarily unavailable.", status=503, code="quiz_unavailable")
    return {"id": topic_id, "label": payload.get("label", ""), "ru": payload.get("ru", ""),
            "quiz": questions, "free_answer": payload.get("free_answer")}


def _digest(snapshot):
    # A keyed digest prevents guessing the small answer space from public questions.
    encoded = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return salted_hmac(TOKEN_SALT + ":content", encoded, algorithm="sha256").hexdigest()


def public_topic(request, payload):
    snapshot = _snapshot(payload)
    public = {**payload, "quiz": [{key: item[key] for key in ("id", "question", "options", "optionIds")}
                                  for item in snapshot["quiz"]]}
    public["quizToken"] = signing.dumps({"v": 1, "topic": snapshot["id"], "owner": _owner(request),
                                         "ids": [item["id"] for item in snapshot["quiz"]],
                                         "digest": _digest(snapshot), "nonce": secrets.token_urlsafe(18)},
                                        salt=TOKEN_SALT, compress=True)
    return public


def _current_snapshot(topic_id):
    payload = category_detail_from_db(topic_id, include_quiz=True, include_learning=False)
    if payload is None:
        topic = TOPICS.get(topic_id)
        if topic is None:
            raise QuizContractError()
        payload = {"id": topic_id, **topic}
    return _snapshot(payload)


def evaluate_quiz(request, data, get_profile):
    if not isinstance(data, dict):
        raise QuizContractError()
    topic_id, token, answers = data.get("topicId"), data.get("quizToken"), data.get("answers")
    free_answer, expired = data.get("freeAnswer"), data.get("freeAnswerExpired")
    duration, difficulty, save = data.get("durationSeconds", 0), data.get("difficulty", "easy"), data.get("save")
    if (not isinstance(topic_id, str) or not isinstance(token, str) or not token or len(token) > 100000
            or not isinstance(answers, list) or not isinstance(free_answer, str) or len(free_answer) > MAX_FREE_ANSWER
            or type(expired) is not bool or type(save) is not bool
            or type(duration) is not int or not 0 <= duration <= 2147483647
            or difficulty not in ("easy", "medium", "hard")):
        raise QuizContractError()
    try:
        free_answer.encode("utf-8")
    except UnicodeEncodeError:
        raise QuizContractError() from None
    try:
        contract = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.SignatureExpired:
        raise QuizContractError("Quiz expired. Please start again.", code="quiz_expired") from None
    except (signing.BadSignature, ValueError, TypeError):
        raise QuizContractError() from None
    if not isinstance(contract, dict) or contract.get("v") != 1 or contract.get("topic") != topic_id:
        raise QuizContractError()
    token_owner = contract.get("owner")
    if not isinstance(token_owner, dict):
        raise QuizContractError()
    if token_owner.get("user") and not request.user.is_authenticated:
        raise QuizContractError("Authentication required.", status=401, code="auth_required")
    if token_owner != _owner(request):
        raise QuizContractError("Quiz belongs to another session.", status=403, code="quiz_owner_mismatch")
    if save and not request.user.is_authenticated:
        raise QuizContractError("Authentication required.", status=401, code="auth_required")
    if save and not get_profile(request.user).save_progress:
        raise QuizContractError("Saving progress is disabled.", status=403, code="save_progress_disabled")
    try:
        snapshot = _current_snapshot(topic_id)
    except QuizContractError as error:
        if error.code == "quiz_unavailable":
            raise QuizContractError("Quiz content changed. Please start again.", code="quiz_changed") from None
        raise
    question_ids = [item["id"] for item in snapshot["quiz"]]
    token_digest = contract.get("digest")
    if (contract.get("ids") != question_ids or not isinstance(token_digest, str)
            or not constant_time_compare(token_digest, _digest(snapshot))):
        raise QuizContractError("Quiz content changed. Please start again.", code="quiz_changed")
    if len(answers) != len(question_ids):
        raise QuizContractError()
    selected = {}
    known_ids = set(question_ids)
    for answer in answers:
        if not isinstance(answer, dict):
            raise QuizContractError()
        question_id, option_id = answer.get("questionId"), answer.get("optionId")
        if (not isinstance(question_id, str) or question_id not in known_ids or question_id in selected
                or "optionId" not in answer or (option_id is not None and not isinstance(option_id, str))):
            raise QuizContractError()
        selected[question_id] = option_id
    feedback = []
    for item in snapshot["quiz"]:
        option_id = selected[item["id"]]
        if option_id is not None and option_id not in item["optionIds"]:
            raise QuizContractError()
        correct_id = item["optionIds"][item["answer"]]
        feedback.append({"questionId": item["id"], "selectedOptionId": option_id,
                         "correctOptionId": correct_id, "correct": option_id == correct_id,
                         "explain": item["explain"]})
    accepted = not expired and len(free_answer.strip()) >= 8
    score, total = sum(item["correct"] for item in feedback) + int(accepted), len(question_ids) + 1
    result = {"id": None, "topicLabel": snapshot["ru"] or snapshot["label"], "score": score,
              "total": total, "percentage": round(score / total * 100), "durationSeconds": duration,
              "difficulty": difficulty}
    newly_saved = False
    if save:
        token_hash = salted_hmac(TOKEN_SALT + ":submission-token", token, algorithm="sha256").hexdigest()
        submission = {"topicId": topic_id, "answers": selected, "freeAnswer": free_answer,
                      "freeAnswerExpired": expired, "durationSeconds": duration, "difficulty": difficulty}
        encoded = json.dumps(submission, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        submission_hash = salted_hmac(TOKEN_SALT + ":submission", encoded, algorithm="sha256").hexdigest()
        # The unique key survives response loss, concurrent retries and process restarts.
        with transaction.atomic():
            attempt, newly_saved = QuizResult.objects.get_or_create(
                quiz_token_hash=token_hash,
                defaults={"user": request.user, "topic_id": topic_id, "topic_label": result["topicLabel"],
                          "score": score, "total": total, "duration_seconds": duration, "difficulty": difficulty,
                          "submission_hash": submission_hash},
            )
            if not constant_time_compare(attempt.submission_hash, submission_hash):
                raise QuizContractError("Quiz was already submitted with different answers.", code="quiz_already_submitted")
        result["id"] = attempt.pk
    return ({"attempt": result, "saved": save, "feedback": feedback,
             "writing": {"accepted": accepted,
                         "explain": "Only completion is checked (at least 8 characters before timeout), not language correctness."}},
            newly_saved)
