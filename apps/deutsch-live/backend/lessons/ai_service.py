import json
import logging
from dataclasses import dataclass
from typing import Protocol
from urllib import error, request

from django.conf import settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AIWritingFeedback:
    correction: str
    explanation: str
    answer: str
    source: str


class AIProvider(Protocol):
    name: str

    @property
    def is_configured(self):
        ...

    def writing_feedback(self, text, prompt, profile):
        ...

    def adaptive_scene(self, topic_id, level, goal=""):
        ...


class RuleBasedProvider:
    name = "fallback"

    @property
    def is_configured(self):
        return True

    def writing_feedback(self, text, prompt, profile):
        return build_rule_based_writing_feedback(text, prompt, profile)

    def adaptive_scene(self, topic_id, level, goal=""):
        return build_adaptive_scene_preview(topic_id, level, goal, source=self.name)


class OpenAIProviderError(RuntimeError):
    pass


class OpenAIProvider:
    name = "openai"

    def __init__(self, api_key=None, model=None, enabled=None, api_base=None, timeout=None, max_output_tokens=None, max_retries=None):
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.enabled = settings.AI_FEATURES_ENABLED if enabled is None else enabled
        self.api_base = (api_base or settings.OPENAI_API_BASE).rstrip("/")
        self.timeout = timeout or settings.OPENAI_TIMEOUT_SECONDS
        self.max_output_tokens = max_output_tokens or settings.OPENAI_MAX_OUTPUT_TOKENS
        self.max_retries = settings.OPENAI_MAX_RETRIES if max_retries is None else max_retries

    @property
    def is_configured(self):
        return bool(self.enabled and self.api_key and self.model)

    def writing_feedback(self, text, prompt, profile):
        payload = self._create_response_payload(
            instructions=(
                "You correct short German learner writing for Russian-speaking learners. "
                "Return only valid JSON with keys correction, explanation, answer. "
                "Keep Russian explanations simple and never include secrets."
            ),
            user_input=(
                f"Task: {prompt}\n"
                f"Learner level: {profile.get_level_display()}\n"
                f"Preferred topic: {profile.preferred_topic or 'general'}\n"
                f"Learner text: {text}"
            ),
        )
        result = self._request_response(payload)
        data = self._parse_json_output(result)
        return AIWritingFeedback(
            correction=str(data.get("correction", "")).strip() or build_correction(text),
            explanation=str(data.get("explanation", "")).strip() or build_simple_explanation(text, prompt, profile),
            answer=str(data.get("answer", "")).strip() or "Коррекция готова.",
            source=self.name,
        )

    def adaptive_scene(self, topic_id, level, goal=""):
        payload = self._create_response_payload(
            instructions=(
                "You create short German learning scene previews. "
                "Return only valid JSON with keys title, goal, steps, promptPreview. "
                "steps must be a list of 3 short German learning steps."
            ),
            user_input=f"Topic: {topic_id}\nLevel: {level or 'a1'}\nGoal: {goal or 'Alltag sicher bewältigen'}",
        )
        result = self._request_response(payload)
        data = self._parse_json_output(result)
        fallback = build_adaptive_scene_preview(topic_id, level, goal, source=self.name)
        return {
            "topicId": topic_id,
            "level": level,
            "title": str(data.get("title", "")).strip() or fallback["title"],
            "goal": str(data.get("goal", "")).strip() or fallback["goal"],
            "steps": data.get("steps") if isinstance(data.get("steps"), list) else fallback["steps"],
            "promptPreview": str(data.get("promptPreview", "")).strip() or fallback["promptPreview"],
            "source": self.name,
        }

    def _create_response_payload(self, instructions, user_input):
        return {
            "model": self.model,
            "instructions": instructions,
            "input": user_input,
            "max_output_tokens": self.max_output_tokens,
        }

    def _request_response(self, payload):
        if not self.is_configured:
            raise OpenAIProviderError("OpenAI provider is not configured.")
        body = json.dumps(payload).encode("utf-8")
        http_request = request.Request(
            f"{self.api_base}/responses",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        attempts = max(1, self.max_retries + 1)
        last_error = None
        for attempt in range(1, attempts + 1):
            try:
                with request.urlopen(http_request, timeout=self.timeout) as response:
                    return json.loads(response.read().decode("utf-8"))
            except error.HTTPError as exc:
                last_error = exc
                if exc.code and 400 <= exc.code < 500 and exc.code != 429:
                    break
                logger.warning("OpenAI provider HTTP attempt %s/%s failed: %s", attempt, attempts, exc)
            except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_error = exc
                logger.warning("OpenAI provider attempt %s/%s failed: %s", attempt, attempts, exc)
        raise OpenAIProviderError("OpenAI request failed.") from last_error

    def _parse_json_output(self, response_payload):
        output_text = response_payload.get("output_text", "")
        if not output_text:
            output_text = _extract_response_text(response_payload)
        try:
            parsed = json.loads(output_text)
        except (TypeError, json.JSONDecodeError) as exc:
            raise OpenAIProviderError("OpenAI response did not contain valid JSON.") from exc
        if not isinstance(parsed, dict):
            raise OpenAIProviderError("OpenAI response JSON must be an object.")
        return parsed


def get_ai_provider(api_key=None, model=None, enabled=None, provider_name=None):
    requested_provider = (provider_name or settings.AI_PROVIDER).strip().lower()
    if requested_provider == "openai":
        provider = OpenAIProvider(api_key=api_key, model=model, enabled=enabled)
        if provider.is_configured:
            return provider
    return RuleBasedProvider()


class GPTService:
    def __init__(self, api_key=None, model=None, enabled=None, provider=None, provider_name=None):
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.enabled = settings.AI_FEATURES_ENABLED if enabled is None else enabled
        self.provider = provider or get_ai_provider(
            api_key=self.api_key,
            model=self.model,
            enabled=self.enabled,
            provider_name=provider_name,
        )

    @property
    def is_configured(self):
        return self.provider.name != "fallback" and self.provider.is_configured

    def writing_feedback(self, text, prompt, profile):
        try:
            return self.provider.writing_feedback(text, prompt, profile)
        except Exception:
            return RuleBasedProvider().writing_feedback(text, prompt, profile)

    def adaptive_scene(self, topic_id, level, goal=""):
        try:
            return self.provider.adaptive_scene(topic_id, level, goal)
        except Exception:
            return RuleBasedProvider().adaptive_scene(topic_id, level, goal)

    def streaming_status(self):
        return {
            "enabled": settings.AI_STREAMING_CORRECTIONS_ENABLED,
            "prepared": settings.AI_STREAMING_PREPARED,
            "transport": "websocket-notifications" if settings.AI_STREAMING_CORRECTIONS_ENABLED else "websocket-later",
            "model": self.model,
            "provider": self.provider.name,
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


def _extract_response_text(response_payload):
    chunks = []
    for output_item in response_payload.get("output", []):
        for content_item in output_item.get("content", []):
            text = content_item.get("text")
            if text:
                chunks.append(text)
    return "\n".join(chunks)


def build_adaptive_scene_preview(topic_id, level, goal="", source="fallback"):
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
        "source": source,
    }


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
