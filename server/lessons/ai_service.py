from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class AIWritingFeedback:
    correction: str
    explanation: str
    answer: str
    source: str


class GPTService:
    def __init__(self, api_key=None, model=None, enabled=None):
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.enabled = settings.AI_FEATURES_ENABLED if enabled is None else enabled

    @property
    def is_configured(self):
        return bool(self.enabled and self.api_key and self.model)

    def writing_feedback(self, text, prompt, profile):
        # Later this method will call OpenAI. The fallback keeps the product usable
        # and defines the response contract now: correction, explanation, answer.
        fallback = build_rule_based_writing_feedback(text, prompt, profile)
        if not self.is_configured:
            return fallback
        return fallback

    def adaptive_scene(self, topic_id, level, goal=""):
        level_label = (level or "a1").upper()
        goal_text = goal or "Alltag sicher bewältigen"
        return {
            "topicId": topic_id,
            "level": level,
            "title": f"Adaptive Szene {level_label}",
            "goal": goal_text,
            "steps": [
                "Kurzen Dialog lesen",
                "Eine höfliche Antwort schreiben",
                "Eine Rückfrage formulieren",
            ],
            "promptPreview": (
                f"Erstelle eine einfache deutsche Szene zum Thema {topic_id} "
                f"für Niveau {level_label}. Ziel: {goal_text}."
            ),
            "source": "fallback",
        }

    def streaming_status(self):
        return {
            "enabled": False,
            "prepared": settings.AI_STREAMING_PREPARED,
            "transport": "websocket-later",
            "model": self.model,
        }


def build_rule_based_writing_feedback(text, prompt, profile):
    correction = build_correction(text)
    explanation = build_simple_explanation(text, prompt, profile)
    topic = profile.preferred_topic or "повседневная жизнь"
    level = profile.get_level_display()
    answer = (
        f"Я прочитал ваш ответ для уровня {level} и темы «{topic}». "
        f"Коррекция: {correction} Объяснение: {explanation}"
    )
    return AIWritingFeedback(correction=correction, explanation=explanation, answer=answer, source="fallback")


def build_correction(text):
    value = text.strip()
    lower = value.lower()
    suggestions = []
    if "ich will" in lower:
        suggestions.append("Вежливее: Ich hätte gern ... / Ich möchte bitte ...")
    if "brotchen" in lower:
        suggestions.append("Пишите с умлаутом: Brötchen.")
    if value and value[0].islower():
        suggestions.append("Начинайте немецкое предложение с большой буквы.")
    if value and not value.endswith((".", "!", "?")):
        suggestions.append("В конце поставьте точку или вопросительный знак.")
    if not suggestions:
        suggestions.append("Структура понятная. Можно сделать ответ ещё вежливее и точнее.")
    return " ".join(suggestions)


def build_simple_explanation(text, prompt, profile):
    word_count = len(text.split())
    detail = "короткий ответ" if word_count < 6 else "хорошая длина для тренировки"
    level = profile.get_level_display()
    return (
        f"Задание: {prompt} Ответ выглядит как {detail} для уровня {level}. "
        "Проверьте порядок слов: сначала подлежащее, затем глагол. "
        "Объяснение простыми словами: пишите одну главную мысль, затем уточнение или вопрос. "
        "Для Bäckerei особенно полезны формы: Ich hätte gern ..., Haben Sie ...?, Was kostet ...?"
    )


def get_gpt_service():
    return GPTService()
