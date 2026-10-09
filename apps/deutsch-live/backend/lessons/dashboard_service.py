from django.db.models import Sum

from .account_service import get_profile
from .models import QuizResult, Scene, UserProgress, UserVocabulary, WritingExercise
from .serializers import serialize_dashboard_scene, serialize_profile, serialize_writing_exercise


def build_dashboard_payload(user):
    attempts = QuizResult.objects.filter(user=user)
    total_score = attempts.aggregate(total=Sum("score"))["total"] or 0
    total_questions = attempts.aggregate(total=Sum("total"))["total"] or 0
    progress = UserProgress.objects.filter(user=user)
    vocabulary = UserVocabulary.objects.filter(user=user)

    by_topic = {}
    for attempt in attempts:
        item = by_topic.setdefault(
            attempt.topic_id,
            {"topicId": attempt.topic_id, "topicLabel": attempt.topic_label, "score": 0, "total": 0, "attempts": 0},
        )
        item["score"] += attempt.score
        item["total"] += attempt.total
        item["attempts"] += 1

    recent_attempts = [
        {
            "id": attempt.id,
            "topicId": attempt.topic_id,
            "topicLabel": attempt.topic_label,
            "score": attempt.score,
            "total": attempt.total,
            "percentage": attempt.percentage,
            "durationSeconds": attempt.duration_seconds,
            "difficulty": attempt.difficulty,
            "createdAt": attempt.created_at.isoformat(),
        }
        for attempt in attempts[:8]
    ]
    attempts_with_time = [attempt for attempt in attempts if attempt.duration_seconds > 0]
    average_duration = (
        round(sum(attempt.duration_seconds for attempt in attempts_with_time) / len(attempts_with_time))
        if attempts_with_time
        else 0
    )

    return {
        "summary": {
            "totalScore": total_score,
            "totalQuestions": total_questions,
            "attemptCount": attempts.count(),
            "average": round((total_score / total_questions) * 100) if total_questions else 0,
            "averageDurationSeconds": average_duration,
        },
        "byTopic": list(by_topic.values()),
        "recentAttempts": recent_attempts,
        "botHistory": [
            serialize_writing_exercise(item)
            for item in WritingExercise.objects.filter(user=user)[:5]
        ],
        "progress": {
            "completedScenes": progress.filter(status="completed").count(),
            "startedScenes": progress.count(),
            "totalScenes": Scene.objects.filter(is_published=True).count(),
        },
        "learningPlan": _dashboard_learning_plan(user, by_topic),
        "premiumHints": _premium_hints_for_user(user),
        "vocabulary": [
            {"id": item.id, "wordDe": item.word_de, "translationRu": item.translation_ru}
            for item in vocabulary[:8]
        ],
        "recommendations": _recommendations_for_user(user, total_score, total_questions),
        "goals": {"dailyMinutes": 10, "dailyScenes": 1},
        "badges": list(user.achievements.values("code", "title")),
        "settings": serialize_profile(get_profile(user)),
    }


def _dashboard_learning_plan(user, by_topic):
    profile = get_profile(user)
    completed_topics = set(
        UserProgress.objects.filter(user=user, status="completed").values_list("topic_id", flat=True)
    )
    scene_query = Scene.objects.filter(is_published=True).select_related("category")
    if not profile.has_premium_access:
        scene_query = scene_query.filter(is_premium=False)
    next_scene = scene_query.exclude(topic_id__in=completed_topics).order_by("category__order", "topic_id", "title").first()
    if next_scene is None:
        next_scene = scene_query.order_by("category__order", "topic_id", "title").first()

    review_topics = []
    for item in by_topic.values():
        percentage = round((item["score"] / item["total"]) * 100) if item["total"] else 0
        if percentage < 75:
            review_topics.append({
                "topicId": item["topicId"],
                "topicLabel": item["topicLabel"],
                "percentage": percentage,
                "reason": "Повторите тему: результат ниже 75%.",
            })
    review_topics = sorted(review_topics, key=lambda item: item["percentage"])[:3]

    return {
        "nextScene": serialize_dashboard_scene(next_scene) if next_scene else None,
        "reviewTopics": review_topics,
    }


def _premium_hints_for_user(user):
    profile = get_profile(user)
    if profile.has_premium_access:
        return []
    scenes = Scene.objects.filter(is_published=True, is_premium=True).select_related("category").order_by("category__order", "topic_id", "title")[:3]
    return [
        {
            "id": scene.slug,
            "title": scene.title,
            "topicId": scene.topic_id,
                "reason": "Premium-Szene: später mit aktivem Premium-Zugang verfügbar.",
        }
        for scene in scenes
    ]


def _recommendations_for_user(user, total_score, total_questions):
    profile = get_profile(user)
    if total_questions == 0:
        return ["Начните с короткой сцены и сохраните первый результат викторины."]
    average = total_score / total_questions
    if average < 0.7:
        return [f"Повторите тему «{profile.preferred_topic or 'Пекарня'}» в режиме сцен, затем попробуйте викторину ещё раз."]
    return ["Отлично. Теперь попробуйте письменную практику и потренируйте более длинные ответы."]
