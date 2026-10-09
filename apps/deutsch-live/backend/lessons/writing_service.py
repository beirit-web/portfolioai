from django.conf import settings

from .models import BotExchange, ChatHistory, WritingExercise
from .realtime import send_user_notification


def create_bot_reply_exercise(user, question, prompt, topic_id, topic_label, feedback):
    exchange = BotExchange.objects.create(user=user, question=question, answer=feedback.answer)
    ChatHistory.objects.create(
        user=user,
        mode="writing",
        user_message=question,
        bot_response=feedback.answer,
        correction=feedback.correction,
    )
    exercise = WritingExercise.objects.create(
        user=user,
        topic_id=topic_id,
        topic_label=topic_label,
        prompt=prompt,
        user_text=question,
        correction=feedback.correction,
        explanation=feedback.explanation,
    )
    send_user_notification(
        user.id,
        "bot_reply",
        {"exerciseId": exercise.id, "message": "Новая KI-коррекция готова."},
    )
    stream_writing_correction(user.id, exercise)
    return exchange, exercise


def create_writing_exercise(user, user_text, prompt, topic_id, topic_label, feedback):
    exercise = WritingExercise.objects.create(
        user=user,
        topic_id=topic_id,
        topic_label=topic_label,
        prompt=prompt,
        user_text=user_text,
        correction=feedback.correction,
        explanation=feedback.explanation,
    )
    ChatHistory.objects.create(
        user=user,
        mode="writing",
        user_message=user_text,
        bot_response=feedback.explanation,
        correction=feedback.correction,
    )
    send_user_notification(
        user.id,
        "writing_correction",
        {"exerciseId": exercise.id, "message": "Новая Korrektur ist bereit."},
    )
    stream_writing_correction(user.id, exercise)
    return exercise


def stream_writing_correction(user_id, exercise):
    if not settings.AI_STREAMING_CORRECTIONS_ENABLED:
        return False

    chunks = _correction_chunks(exercise)
    send_user_notification(
        user_id,
        "writing_correction_stream_start",
        {"exerciseId": exercise.id, "chunkCount": len(chunks)},
    )
    for index, chunk in enumerate(chunks, start=1):
        send_user_notification(
            user_id,
            "writing_correction_stream_chunk",
            {"exerciseId": exercise.id, "index": index, "chunk": chunk},
        )
    send_user_notification(
        user_id,
        "writing_correction_stream_done",
        {"exerciseId": exercise.id},
    )
    return True


def _correction_chunks(exercise):
    text = f"{exercise.correction}\n\n{exercise.explanation}".strip()
    if not text:
        return []
    return [text[index:index + 180] for index in range(0, len(text), 180)]
