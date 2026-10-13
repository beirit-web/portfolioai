"""Presentation data for the progressively enhanced project listing.

The frontend build exports its canonical copy and presentation constants. Django
uses that catalog to render the listing without needing a JavaScript runtime.
"""

from functools import lru_cache
import json
import math
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlsplit

from django.conf import settings

from .seo import INTEGRATED_PROJECT_SLUGS


@lru_cache(maxsize=4)
def _read_catalog(path, modified_ns, size):
    # File metadata forms part of the cache key so rebuilding the frontend also
    # updates a running development server's copy and presentation constants.
    catalog = json.loads(Path(path).read_text(encoding="utf-8"))
    if catalog.get("schemaVersion") != 1:
        raise ValueError("Unsupported projects presentation catalog")
    return catalog


def projects_presentation_catalog():
    path = Path(settings.SERVER_DIR) / "assets/portfolio-dist/.vite/projects-presentation.json"
    try:
        metadata = path.stat()
        return _read_catalog(str(path), metadata.st_mtime_ns, metadata.st_size)
    except (OSError, json.JSONDecodeError, ValueError):
        # An absent or outdated build still allows the client-rendered route to
        # load. The new entry only enhances HTML carrying the rendered marker.
        return None


def _number(value, default):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else default


def _text(value):
    return str(value or "").strip()


def _technology_key(value):
    return re.sub(r"[^a-z0-9]", "", _text(value).lower())


def _sort_text(value):
    # Canonical technologies have an explicit rank. A normalized key makes
    # unfamiliar labels readable in the same alphabetical grouping.
    return unicodedata.normalize("NFKD", value).casefold()


def _technologies(project, catalog):
    entries = project.get("technologies")
    if entries is None:
        entries = project.get("tags") or []
    if not isinstance(entries, list):
        entries = re.split(r"[,;\n]", str(entries))
    definitions = catalog["technologies"]
    aliases = {
        _technology_key(alias): definition
        for definition in definitions
        for alias in [definition["name"], *definition.get("aliases", [])]
    }
    labels = {}
    for entry in entries:
        value = entry.get("title") or entry.get("label") or "" if isinstance(entry, dict) else entry
        for part in _text(value).split("/"):
            label = part.strip()
            if not label:
                continue
            definition = aliases.get(_technology_key(label))
            name = definition["name"] if definition else label
            labels[name] = {
                "label": name,
                "rank": definition["rank"] if definition else len(definitions),
                "logo": f"/static/images/{definition['logo']}" if definition and definition.get("logo") else "",
            }
    return sorted(labels.values(), key=lambda item: (item["rank"], _sort_text(item["label"])))


def _tooltip(title, language, catalog):
    glossary = catalog.get("glossary", {})
    for entry in glossary.get(language, glossary.get("de", [])):
        flags = re.IGNORECASE if "i" in entry.get("flags", "") else 0
        if re.search(entry["pattern"], title, flags):
            return {
                "text": entry["text"],
                "label": f'Объяснение термина "{title}"' if language == "ru" else f'Erklärung zu "{title}"',
            }
    return None


def _image(project, catalog):
    cover = catalog.get("covers", {}).get(project["slug"])
    if cover:
        image = dict(cover)
    else:
        image = next(iter(project.get("images") or []), None)
        if not image:
            source = project.get("image")
            image = {"src": source, "label": project.get("imageAlt") or "Vorschau"} if source else None
        if not image:
            return None
        image = dict(image)
    image.setdefault("width", 960)
    image.setdefault("height", 600)
    image["alt"] = f"{project['title']} - {image.get('label', 'Vorschau')}"
    image["sizes"] = catalog["imageSizes"] if image.get("srcSet") else ""
    return image


def build_projects_overview(projects, language="de", config=None, catalog=None):
    """Match the overview's project normalization using current published data."""
    catalog = catalog if catalog is not None else projects_presentation_catalog()
    if catalog is None:
        return None
    language = language if language in catalog["locales"] else "de"
    locale = catalog["locales"][language]
    fallback = {item["slug"]: item for item in locale["items"] if item.get("slug")}
    config = config or {}
    cards = []
    for source in projects:
        slug = _text(source.get("slug"))
        if source.get("published") is False or slug in INTEGRATED_PROJECT_SLUGS:
            continue
        title = _text(source.get("title"))
        if not title:
            continue
        localized = fallback.get(slug, {})
        use_localized = language != "de" and bool(localized)
        project = {
            **localized,
            **source,
            "slug": slug,
            "title": localized["title"] if use_localized else title,
            "text": localized.get("text", "") if use_localized else source.get("text") or source.get("shortDescription") or source.get("description") or "",
            "overviewText": localized.get("overviewText", "") if use_localized else source.get("overviewText") or localized.get("overviewText") or "",
            "type": localized.get("type") or source.get("type") or source.get("category") or "Portfolio-Projekt",
            "category": source.get("category") or "Weitere",
            "status": localized.get("status", "") if use_localized else source.get("status") or source.get("statusLabel") or "",
            "liveUrl": source.get("liveUrl") or source.get("href") or "",
            "href": source.get("href") or source.get("liveUrl") or "",
            "sortOrder": _number(source.get("sortOrder"), 100),
        }
        project.update(catalog.get("projectOverrides", {}).get(slug, {}).get(language, {}))
        live_href = project.get("liveUrl") or project.get("href") or project.get("localHref") or ""
        if project["category"] == "case":
            live_href = ""
        public_base = config.get("publicPageBaseUrl") or ""
        if public_base and live_href.startswith("/"):
            path = urlsplit(live_href).path.rstrip("/") or "/"
            app_path = path in {"/", "/projekte", "/kompetenzen", "/ueber-mich", "/kontakt", "/wetter"} or path.startswith(("/projekte/", "/referenzen/"))
            if not app_path:
                live_href = f"{public_base}{live_href}"
        project.update({
            "detailHref": f"/projekte/{slug}",
            "liveHref": live_href,
            "liveExternal": bool(re.match(r"^https?://", live_href, re.IGNORECASE)),
            "technologyTags": _technologies(project, catalog),
            "tooltip": _tooltip(project["title"], language, catalog),
        })
        project["image"] = _image(project, catalog)
        cards.append(project)
    cards.sort(key=lambda project: (
        project["sortOrder"], _number(project.get("orderIndex"), 9007199254740991), _sort_text(project["title"]),
    ))
    first_image = next((project["image"] for project in cards if project["image"] and project["image"].get("src")), None)
    if first_image:
        first_image["eager"] = True
    logo = config.get("logoUrl") or "/static/images/beirit-digital-logo-160.webp"
    small_logo = config.get("logoSmallUrl") or logo
    large_logo = config.get("logoLargeUrl") or small_logo
    public_base = config.get("publicPageBaseUrl") or ""
    return {
        "language": language,
        "cards": cards,
        "copy": locale["copy"],
        "nav": [
            {"href": href, "label": locale["nav"][label], "active": href == "/projekte"}
            for href, label in [("/", "home"), ("/projekte", "portfolio"), ("/kompetenzen", "skills"), ("/ueber-mich", "aboutLink"), ("/kontakt", "contact")]
        ],
        "menu": locale["nav"],
        "footer": locale["footer"],
        "footerLinks": [
            {"href": "/kompetenzen", "label": locale["nav"]["skills"]},
            {"href": "/kontakt", "label": locale["footer"]["links"]["contact"]},
            {"href": f"{public_base}/impressum", "label": locale["footer"]["links"]["imprint"]},
            {"href": f"{public_base}/datenschutz/", "label": locale["footer"]["links"]["privacy"]},
        ],
        "brand": locale["brand"],
        "logo": {"src": logo, "srcSet": f"{small_logo} 160w, {large_logo} 320w" if small_logo != large_logo else ""},
    }
