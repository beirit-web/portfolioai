"""Render a project report from the build catalog and current published record."""

import re
from urllib.parse import quote, urlsplit

from .projects_overview import (
    _technologies, _technology_key, _text, build_projects_overview,
    projects_presentation_catalog,
)


def _paragraphs(value):
    if isinstance(value, list):
        return [entry for entry in value if entry]
    return [paragraph.strip() for paragraph in re.split(r"\n{2,}", _text(value)) if paragraph.strip()]


def _public_href(href, config):
    base = config.get("publicPageBaseUrl") or ""
    path = urlsplit(href).path.rstrip("/") or "/"
    app = path in {"/", "/projekte", "/kompetenzen", "/ueber-mich", "/kontakt", "/wetter"} or path.startswith(("/projekte/", "/referenzen/"))
    return f"{base}{href}" if base and href.startswith("/") and not app else href


def _icon_nodes(name, catalog):
    tags = {"path", "circle", "ellipse", "rect", "line", "polyline", "polygon"}
    attributes = {"d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points", "transform"}
    return [{"tag": tag, "attributes": [(key, value) for key, value in attrs.items() if key in attributes]}
            for tag, attrs in catalog.get("featureIconNodes", {}).get(name, []) if tag in tags]


def _features(entries, catalog):
    definitions = catalog["technologies"]
    aliases = {_technology_key(alias): definition for definition in definitions
               for alias in [definition["name"], *definition.get("aliases", [])]}
    result = []
    for entry in entries:
        label = _text(entry.get("title") or entry.get("label")) if isinstance(entry, dict) else _text(entry)
        description = _text(entry.get("text") or entry.get("description")) if isinstance(entry, dict) else ""
        icon = "Star"
        for rule in catalog.get("featureRules", []):
            if any(re.search(pattern["pattern"], label.lower(), re.IGNORECASE if "i" in pattern["flags"] else 0)
                   for pattern in rule["patterns"]):
                icon = rule["icon"]
                break
        technology = aliases.get(_technology_key(label))
        # The client first tests an exact logo, then finds a technology name
        # inside the label in canonical order.
        if not technology or not technology.get("logo"):
            technology = next((definition for definition in definitions
                               if re.search(r"\b" + re.escape(definition["name"]) + r"\b", label, re.IGNORECASE)), None)
        src = f"/static/images/{technology['logo']}" if technology and technology.get("logo") else ""
        if technology is None:
            src = catalog.get("featureIllustrations", {}).get(icon) or "/static/images/service-fullstack.svg"
        result.append({"label": label, "description": description, "src": src, "iconNodes": _icon_nodes(icon, catalog)})
    return result


def build_project_detail(source, language="de", config=None, catalog=None):
    catalog = catalog if catalog is not None else projects_presentation_catalog()
    if not catalog or not source or "detailImages" not in catalog:
        return None
    language = language if language in catalog["locales"] else "de"
    locale = catalog["locales"][language]
    detail = locale.get("detail")
    if not detail:
        return None
    config = config or {}
    # Reuse current-record normalization, technology ordering and the page shell.
    detail_catalog = {**catalog, "locales": {**catalog["locales"], language: {**locale, "items": detail["items"]}}}
    shell = build_projects_overview([source], language, config, catalog=detail_catalog)
    if not shell["cards"]:
        return None
    project = shell.pop("cards")[0]
    slug = project["slug"]
    localized = next((item for item in detail["items"] if item["slug"] == slug), {})
    use_localized = language != "de" and bool(localized)
    for field in ("situation", "implementation", "result"):
        project[field] = localized.get(field) if use_localized else source.get(field) or localized.get(field)
    project["technicalDecision"] = source.get("technicalDecision") or localized.get("technicalDecision")
    project["features"] = localized.get("features", []) if use_localized else source.get("features") or localized.get("features") or source.get("technologies") or source.get("tags") or []
    copy = detail["copy"]
    is_case = project.get("category", "demo") == "case"
    fallback_label = copy["caseStudyCta" if is_case else "referenceCta"]
    contact_href = "/kontakt?project=" + quote(project["title"], safe="~!*'()") + ("&topic=feature" if is_case else "")
    primary_href = project.get("localHref") if config.get("useLocalPortfolioLinks") else project.get("href")
    primary_href = _public_href(primary_href or "", config) or contact_href
    images = catalog["detailImages"].get(slug)
    hero = dict(images["hero"] if images else project["image"]) if images or project["image"] else None
    if hero and not images:
        original = next(iter(source.get("images") or []), {})
        hero["width"] = original.get("width") or 1440
        hero["height"] = original.get("height") or 1000
    if hero:
        hero["alt"] = f"{project['title']} - {hero.get('label', 'Vorschau')}"
    screenshots = images["screenshots"] if images else [image for image in project.get("images", []) if image.get("variant") != "cover"]
    modules = [
        {**module, "href": _public_href(module["href"], config) if module.get("publicPage") else module["href"]}
        for module in detail.get("modules", {}).get(slug, [])
    ]
    return {
        "shell": shell, "project": project, "copy": copy,
        "backLabel": "Назад к проектам" if language == "ru" else "Zurück zu Projekten",
        "hero": hero, "screenshots": screenshots, "modules": modules,
        "primaryHref": primary_href, "primaryExternal": bool(re.match(r"^https?://", primary_href, re.IGNORECASE)),
        "primaryLabel": (project.get("cta") or fallback_label) if primary_href == contact_href else copy["projectCta"],
        "showPrimaryAction": project.get("showPrimaryAction") is not False,
        "showContactCta": project.get("showContactCta") is not False,
        "contactHref": contact_href, "closingLabel": project.get("contactCta") or fallback_label,
        "situation": _paragraphs(project["situation"]),
        "implementation": _paragraphs(project["implementation"] or project["text"]),
        "result": _paragraphs(project["result"]), "decision": _paragraphs(project["technicalDecision"]),
        "features": _features(project["features"], catalog),
        "technologies": _technologies(project, catalog),
        "checkIcon": _icon_nodes("CheckCircle2", catalog), "codeIcon": _icon_nodes("Code2", catalog),
    }
