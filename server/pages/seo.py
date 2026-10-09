"""Metadata for the public portfolio and its project case studies."""

import json


PORTFOLIO_KEYWORDS = (
    "Beirit Web, Portfolio, Webentwicklung, Softwareentwicklung, React, Django, "
    "Python, JavaScript, Fullstack"
)
INTEGRATED_PROJECT_SLUGS = ("vokabelbox", "wetter", "musikplayer", "deutschlive")
PORTFOLIO_ROUTES = {
    "/": {
        "title": "Beirit Web | Portfolio für Web- und Softwareentwicklung",
        "description": "Portfolio mit Webanwendungen, Softwareprojekten und technischen Fallstudien auf Basis von React, Django und Python.",
    },
    "/kompetenzen": {
        "title": "Technologien und Kompetenzen | Beirit Web",
        "description": "Technische Kompetenzen und Projekterfahrung mit React, Django, Python, APIs und responsiven Weboberflächen.",
    },
    "/projekte": {
        "title": "Web- und Softwareprojekte | Beirit Web",
        "description": "Webanwendungen, Django-Projekte und Python-Tools mit technischen Einblicken, Live-Demos und Quellcode.",
    },
    "/ueber-mich": {
        "title": "Über mich | Beirit Web",
        "description": "Informationen zu Eugen Beirit, Arbeitsweise, technischem Hintergrund und Webentwicklung mit React, JavaScript, Python und Django.",
    },
    "/kontakt": {
        "title": "Kontakt | Beirit Web",
        "description": "Kontakt für Fragen zu den Projekten, fachlichen Austausch und berufliche Kontakte.",
    },
}


def portfolio_page_metadata(path, absolute_url, project=None, project_slug=None):
    canonical_path = path.rstrip("/") or "/"
    if project_slug:
        canonical_path = f"/projekte/{project_slug}"
        route_meta = {
            "title": f"{project.title} | Projekte | Beirit Web" if project else "Projekt nicht gefunden | Beirit Web",
            "description": (project.short_description or "Portfolio-Projekt mit Ausgangslage, Umsetzung, Ergebnis und eingesetzten Technologien.") if project else "Dieses Portfolio-Projekt wurde nicht gefunden.",
        }
    else:
        route_meta = PORTFOLIO_ROUTES.get(canonical_path, PORTFOLIO_ROUTES["/"])
    return {
        **route_meta,
        "keywords": PORTFOLIO_KEYWORDS,
        "robots": "noindex, follow" if project_slug and project is None else "index, follow",
        "canonical_path": canonical_path,
        "canonical": absolute_url(canonical_path),
        "ogType": "website",
    }


def portfolio_structured_data(page_meta, absolute_url, project=None, projects=()):
    site_url = absolute_url("/")
    canonical = page_meta["canonical"]
    page = {
        "@type": "WebPage",
        "@id": f"{canonical}#webpage",
        "url": canonical,
        "name": page_meta["title"],
        "description": page_meta["description"],
        "isPartOf": {"@id": f"{site_url}#website"},
    }
    path = page_meta["canonical_path"]
    if path == "/ueber-mich":
        page["@type"] = "ProfilePage"
        page["mainEntity"] = {
            "@type": "Person",
            "@id": f"{canonical}#person",
            "name": "Eugen Beirit",
            "url": canonical,
        }
    elif path == "/kontakt":
        page["@type"] = "ContactPage"
    elif path == "/projekte":
        page["@type"] = "CollectionPage"
        page["mainEntity"] = {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": position,
                    "item": {
                        "@type": "CreativeWork",
                        "name": entry.title,
                        "url": absolute_url(f"/projekte/{entry.slug}"),
                    },
                }
                for position, entry in enumerate(projects, start=1)
            ],
        }
    elif project:
        page["mainEntity"] = {
            "@type": "CreativeWork",
            "@id": f"{canonical}#project",
            "name": project.title,
            "description": page_meta["description"],
            "url": canonical,
            "keywords": project.technologies,
        }
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": f"{site_url}#website",
                "name": "Beirit Web",
                "url": site_url,
                "description": PORTFOLIO_ROUTES["/"]["description"],
            },
            page,
        ],
    }


def structured_data_json(data):
    # JSON is embedded in a script element; HTML escaping would break its values.
    # Escape script delimiters instead, including values supplied by project records.
    return json.dumps(data, ensure_ascii=False).translate({
        ord("<"): "\\u003C",
        ord(">"): "\\u003E",
        ord("&"): "\\u0026",
        ord("\u2028"): "\\u2028",
        ord("\u2029"): "\\u2029",
    })
