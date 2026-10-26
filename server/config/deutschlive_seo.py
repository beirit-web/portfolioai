"""Shared route metadata for the DeutschLive HTML response and browser app."""

import html
import json
from pathlib import Path
import re
from urllib.parse import quote

from django.conf import settings


# Resolve against the source tree, not BASE_DIR: test fixtures may replace the
# directory containing the built HTML without replacing the route catalogue.
ROUTE_DATA_PATH = Path(__file__).resolve().parents[2] / "apps/deutsch-live/src/seo/routes.json"
ROUTE_DATA = json.loads(ROUTE_DATA_PATH.read_text(encoding="utf-8"))
ROUTES = ROUTE_DATA["routes"]
ALIASES = ROUTE_DATA["aliases"]
LOCALE_COOKIE = "deutschlive_locale"


def app_path(path):
    return "/deutschlive/" if path == "/" else f"/deutschlive{path}"


def page_metadata(path, locale):
    route = ROUTES.get(ALIASES.get(path, path))
    origin = settings.SITE_URL.rstrip("/")
    return {
        **(route[locale] if route else ROUTE_DATA["notFound"][locale]),
        "locale": locale,
        "origin": origin,
        "canonical": origin + quote(route.get("canonical", app_path(ALIASES.get(path, path))) if route else app_path(path), safe="/"),
        "robots": "index, follow" if route and route["index"] else "noindex, follow",
    }


def _head_metadata(metadata):
    escape = html.escape
    title, description, canonical = (metadata[key] for key in ("title", "description", "canonical"))
    entries = [
        ("name", "description", description),
        ("name", "robots", metadata["robots"]),
        ("name", "deutschlive:site-origin", metadata["origin"]),
        ("property", "og:title", title),
        ("property", "og:description", description),
        ("property", "og:url", canonical),
        ("property", "og:locale", {"ru": "ru_RU", "de": "de_DE", "uk": "uk_UA"}[metadata["locale"]]),
        ("name", "twitter:title", title),
        ("name", "twitter:description", description),
        ("name", "twitter:url", canonical),
    ]
    return "\n".join([
        f"<title>{escape(title)}</title>",
        f'<link rel="canonical" href="{escape(canonical, quote=True)}" />',
        *[
            f'<meta {attribute}="{name}" content="{escape(value, quote=True)}" />'
            for attribute, name, value in entries
        ],
    ])


_MANAGED_META = (
    r"description|robots|deutschlive:site-origin|og:title|og:description|og:url|"
    r"og:locale|twitter:title|twitter:description|twitter:url"
)
_META_PATTERN = re.compile(
    rf'''<meta\b(?=[^>]*\b(?:name|property)\s*=\s*["'](?:{_MANAGED_META})["'])[^>]*>''',
    re.IGNORECASE,
)
_CANONICAL_PATTERN = re.compile(
    r'''<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>''', re.IGNORECASE,
)


def _no_script_content(metadata):
    locale = metadata["locale"]
    copy = ROUTE_DATA["noScript"][locale]
    links = "\n".join(
        f'<li><a href="{app_path(path)}">{html.escape(route[locale]["heading"])}</a></li>'
        for path, route in ROUTES.items() if route["index"]
    )
    return (
        '<noscript><main style="max-width:65rem;margin:16px auto;padding:24px;'
        'font-family:system-ui,sans-serif;background:#020617;color:#f8fafc;line-height:1.6">'
        f'<h1>{html.escape(metadata["heading"])}</h1>'
        f'<p>{html.escape(metadata["description"])}</p>'
        f'<h2>{html.escape(copy["heading"])}</h2><p>{html.escape(copy["description"])}</p>'
        f'<nav aria-label="{html.escape(copy["navigation"], quote=True)}"><ul>{links}</ul></nav>'
        '</main></noscript>'
    )


def render_app_html(source, metadata):
    """Replace only managed metadata; retain Vite scripts, CSS and theme tags."""
    def replace_head(match):
        content = re.sub(r"<title\b[^>]*>.*?</title\s*>", "", match[2], flags=re.IGNORECASE | re.DOTALL)
        content = _CANONICAL_PATTERN.sub("", _META_PATTERN.sub("", content))
        return f"{match[1]}\n{_head_metadata(metadata)}{content}{match[3]}"

    source = re.sub(
        r"(<head\b[^>]*>)(.*?)(</head\s*>)", replace_head, source,
        count=1, flags=re.IGNORECASE | re.DOTALL,
    )
    source = re.sub(
        r'''(<html\b[^>]*\blang\s*=\s*)["'][^"']*["']''',
        lambda match: f'{match[1]}"{metadata["locale"]}"', source, count=1, flags=re.IGNORECASE,
    )
    return re.sub(
        r"<noscript\b[^>]*>.*?</noscript\s*>", lambda _match: _no_script_content(metadata),
        source, count=1, flags=re.IGNORECASE | re.DOTALL,
    )
