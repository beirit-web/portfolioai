"""Shared vocabulary data, readable HTML and localized discovery metadata."""

from functools import lru_cache
import json
import unicodedata
from urllib.parse import urlencode

from django.conf import settings
from django.urls import reverse

from .seo import structured_data_json


CONTENT_PATH = settings.SERVER_DIR / "assets" / "vokabelbox" / "content.json"
LANGUAGES = ("de", "ru", "uk")
VIEWS = ("words", "training", "favorites")


@lru_cache(maxsize=1)
def _content(mtime):
    return json.loads(CONTENT_PATH.read_text(encoding="utf-8"))


def content():
    return _content(CONTENT_PATH.stat().st_mtime_ns)


def normalize_search(value):
    return unicodedata.normalize("NFKC", value).lower().translate(
        str.maketrans({"’": "'", "‘": "'", "ʼ": "'", "`": "'", "ё": "е"})
    )


def language_path(language):
    return f"{reverse('pages:vokabelbox')}?{urlencode({'lang': language})}"


def page_context(request, fallback_language):
    data = content()
    language = request.GET.get("lang")
    if language not in LANGUAGES:
        language = request.COOKIES.get("vokabelbox_language", fallback_language)
    if language not in LANGUAGES:
        language = "de"
    copy = data["vocabulary"][language]
    view = request.GET.get("view", "words")
    if view not in VIEWS:
        view = "words"
    query = request.GET.get("q", "")[:200].strip()
    article = request.GET.get("article", "all")
    if article not in ("all", "der", "die", "das"):
        article = "all"
    words = sorted(data["words"], key=lambda item: item["word"])
    matches = []
    for word in words:
        search_text = " ".join([word["article"], word["word"], word["translation"], *word["meanings"].values()])
        if article != "all" and word["article"] != article:
            continue
        if normalize_search(query) not in normalize_search(search_text):
            continue
        matches.append({**word, "meaning": word["meanings"][language]})
    if view == "favorites":
        matches = []  # Personal favorites are restored only in the current browser.
    count = len(matches)
    plural = "other"
    if language in ("ru", "uk"):
        plural = "many"
        if count % 10 == 1 and count % 100 != 11:
            plural = "one"
        elif 2 <= count % 10 <= 4 and not 12 <= count % 100 <= 14:
            plural = "few"
    site = settings.SITE_URL.rstrip("/")
    canonical = f"{site}{language_path(language)}"
    structured = {
        "@context": "https://schema.org",
        "@type": ["WebApplication", "LearningResource"],
        "@id": f"{canonical}#app",
        "name": "Vokabelbox",
        "url": canonical,
        "description": copy["description"],
        "inLanguage": language,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Any",
        "isAccessibleForFree": True,
        "learningResourceType": "Quiz",
        "isPartOf": {"@type": "WebSite", "name": "Beirit Web", "url": f"{site}/"},
    }
    return {
        "initial_lang": language,
        "vocab_copy": copy,
        "vocab_data_json": structured_data_json(data),
        "vocab_words": matches,
        "vocab_view": view,
        "vocab_query": query,
        "vocab_article": article,
        "vocab_count": f"{count} {copy[f'matches_{plural}']}",
        "vocab_canonical": canonical,
        "vocab_alternates": [{"lang": lang, "url": f"{site}{language_path(lang)}"} for lang in LANGUAGES],
        "vocab_default_url": f"{site}{language_path('de')}",
        "vocab_schema": structured_data_json(structured),
        "vocab_og_locale": {"de": "de_DE", "ru": "ru_RU", "uk": "uk_UA"}[language],
    }
