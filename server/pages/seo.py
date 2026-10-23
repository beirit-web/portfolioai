"""Metadata for the public portfolio and its project case studies."""

import json
from django.templatetags.static import static


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
        "description": "Webanwendungen, Django-Projekte und Python-Tools mit technischen Einblicken und Live-Demos.",
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


def login_page_metadata(request, absolute_url):
    from .account_i18n import account_text

    public_form = request.method == "GET" and not request.GET.get("email", "").strip()
    return {
        "title": account_text("Anmelden | Beirit Digital"),
        "description": account_text(
            "Melde dich bei Beirit Digital an, um deine persönlichen Projekte wie "
            "ENBT Botanic zu nutzen. Mit E-Mail und Passwort einloggen oder den Zugang wiederherstellen."
        ),
        "canonical": absolute_url("/login/"),
        "robots": "index, follow" if public_form else "noindex, follow",
    }


def imprint_page_metadata(language, absolute_url):
    copy = {
        "de": {
            "heading": "Impressum",
            "title": "Muster-Impressum | Beirit Web Portfolio",
            "description": "Muster-Impressum des Beirit Web Portfolios mit fiktiven Anbieterangaben, Kontaktformular und Hinweisen zu Haftung und Urheberrecht.",
            "image_alt": "Logo des Beirit Web Portfolios",
            "locale": "de_DE", "navigation": "Hauptnavigation", "home_label": "Beirit Web Startseite",
            "menu": "Menü", "menu_open": "Menü öffnen", "menu_close": "Menü schließen", "skip_to_content": "Zum Inhalt",
            "links": ("Startseite", "Projekte", "Kompetenzen", "Über mich", "Kontakt"),
        },
        "ru": {
            "heading": "Импрессум",
            "title": "Пример импрессума | Портфолио Beirit Web",
            "description": "Пример импрессума портфолио Beirit Web: вымышленные сведения о владельце, контактная форма, ответственность и авторское право.",
            "image_alt": "Логотип портфолио Beirit Web",
            "locale": "ru_RU", "navigation": "Основная навигация", "home_label": "Beirit Web Главная",
            "menu": "Меню", "menu_open": "Открыть меню", "menu_close": "Закрыть меню", "skip_to_content": "Перейти к содержанию",
            "links": ("Главная", "Проекты", "Компетенции", "Обо мне", "Контакт"),
        },
        "uk": {
            "heading": "Імпресум",
            "title": "Зразок імпресуму | Портфоліо Beirit Web",
            "description": "Зразок імпресуму портфоліо Beirit Web: вигадані відомості про власника, контактна форма, відповідальність та авторське право.",
            "image_alt": "Логотип портфоліо Beirit Web",
            "locale": "uk_UA", "navigation": "Основна навігація", "home_label": "Beirit Web Головна",
            "menu": "Меню", "menu_open": "Відкрити меню", "menu_close": "Закрити меню", "skip_to_content": "Перейти до вмісту",
            "links": ("Головна", "Проєкти", "Компетенції", "Про мене", "Контакт"),
        },
    }.get(language)
    if copy is None:
        return imprint_page_metadata("de", absolute_url)
    routes = ("home", "projects_page_no_slash", "skills_page_no_slash", "about_page_no_slash", "contact_no_slash")
    return {
        **copy,
        "language": language,
        "share_image": absolute_url(static("images/beirit-digital-logo.png")),
        "robots": "index, follow",
        "canonical": absolute_url("/impressum"),
        "links": [{"label": label, "route": f"pages:{route}"} for label, route in zip(copy["links"], routes)],
    }


def privacy_page_metadata(language, absolute_url):
    # Only German and Russian legal texts are available; use German otherwise.
    language = "ru" if language == "ru" else "de"
    copy = {
        "de": {
            "title": "Muster-Datenschutz | Beirit Web Portfolio",
            "description": "Muster-Datenschutzerklärung des Beirit Web Portfolios: Kontaktformular, Konten, Cookies, Speicherdauer und Ihre Rechte im Überblick.",
        },
        "ru": {
            "title": "Пример политики конфиденциальности | Beirit Web Portfolio",
            "description": "Пример политики конфиденциальности портфолио Beirit Web: контактная форма, аккаунты, cookies, сроки хранения и ваши права.",
        },
    }[language]
    return {
        **imprint_page_metadata(language, absolute_url),
        **copy,
        "language": language,
        "robots": "index, follow",
        "canonical": absolute_url("/datenschutz/"),
    }


def legal_page_metadata(language, absolute_url):
    # The project terms are maintained in German and Russian.
    language = "ru" if language == "ru" else "de"
    copy = {
        "de": {
            "title": "Muster-Projektbedingungen | Beirit Web Portfolio",
            "description": "Muster-Projektbedingungen des Beirit Web Portfolios: Projektablauf, Mitwirkung, Lieferung, Nutzungsrechte und Haftung im Überblick.",
        },
        "ru": {
            "title": "Пример условий проекта | Beirit Web Portfolio",
            "description": "Пример условий проектов портфолио Beirit Web: порядок работы, содействие, передача результатов, права использования и ответственность.",
        },
    }[language]
    return {
        **imprint_page_metadata(language, absolute_url),
        **copy,
        "canonical": absolute_url("/rechtliches/"),
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
