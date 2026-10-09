from collections import OrderedDict
from datetime import timedelta

from django import template
from django.contrib.auth.models import User
from django.urls import NoReverseMatch, reverse
from django.utils import timezone
from django.utils.text import slugify

from pages.models import Appointment, CallbackRequest, ChatMessage, ChatReply, InterpreterApplication

register = template.Library()


SECTION_ORDER = (
    "administration",
    "authentication",
    "profiles",
    "communication",
    "scheduling",
    "applications",
    "content",
)

SECTION_CONFIG = {
    "administration": {
        "label": "Administration",
        "summary": "Arbeitsbereich, Zugriff und Grundnavigation",
        "icon": "workspace",
    },
    "authentication": {
        "label": "Authentifizierung und Autorisierung",
        "summary": "Konten, Gruppen und Zugriffsstruktur",
        "icon": "security",
    },
    "profiles": {
        "label": "Benutzer und Profile",
        "summary": "Zusatzdaten und Profilinformationen",
        "icon": "profiles",
    },
    "communication": {
        "label": "Kommunikation",
        "summary": "Eingänge, Antworten und Bearbeitungsstatus",
        "icon": "communication",
    },
    "scheduling": {
        "label": "Termine und Verfügbarkeit",
        "summary": "Planung, Sperrtage und Kalenderpflege",
        "icon": "calendar",
    },
    "applications": {
        "label": "Bewerbungen",
        "summary": "Freigaben und Prüfung neuer Einträge",
        "icon": "applications",
    },
    "content": {
        "label": "Inhalte und Datenmodelle",
        "summary": "Weitere Datenmodelle und Verwaltungsobjekte",
        "icon": "content",
    },
}

MODEL_CONFIG = {
    "auth.user": {
        "section": "authentication",
        "subsection": "accounts",
        "subsection_label": "Benutzerkonten",
        "subsection_summary": "Anmeldung, Zustände und Zugänge verwalten",
        "entry_summary": "Konten, Zugriffsstatus und Stammdaten pflegen",
    },
    "auth.group": {
        "section": "authentication",
        "subsection": "roles",
        "subsection_label": "Gruppen und Rollen",
        "subsection_summary": "Berechtigungen für mehrere Benutzer bündeln",
        "entry_summary": "Rollenbasierte Berechtigungen zusammenfassen",
    },
    "pages.profile": {
        "section": "profiles",
        "subsection": "profile_data",
        "subsection_label": "Profile",
        "subsection_summary": "Profilbilder und ergänzende Benutzerdaten",
        "entry_summary": "Profile, Bilder und Sitzungsbezug verwalten",
        "label": "Profile",
    },
    "pages.accountdocument": {
        "section": "profiles",
        "subsection": "documents",
        "subsection_label": "Dokumentenablage",
        "subsection_summary": "Kontodokumente, Dateien und Unterlagen",
        "entry_summary": "Gespeicherte Nutzerunterlagen prüfen und verwalten",
        "label": "Kontodokumente",
    },
    "pages.chatmessage": {
        "section": "communication",
        "subsection": "incoming",
        "subsection_label": "Eingehende Kommunikation",
        "subsection_summary": "Neue Kontaktanfragen und Bearbeitungsstände",
        "entry_summary": "Kontaktanfragen sichten und als erledigt markieren",
    },
    "pages.chatreply": {
        "section": "communication",
        "subsection": "outgoing",
        "subsection_label": "Ausgehende Kommunikation",
        "subsection_summary": "Antworten, Zustellung und Verlauf",
        "entry_summary": "Kontaktantworten erstellen und Zustellung prüfen",
    },
    "pages.accountnotice": {
        "section": "communication",
        "subsection": "mailbox",
        "subsection_label": "Internes Postfach",
        "subsection_summary": "Geschützte Hinweise und Nachrichten an Konten",
        "entry_summary": "Kontonachrichten verfassen und Verlauf pflegen",
        "label": "Kontonachrichten",
    },
    "pages.appointment": {
        "section": "scheduling",
        "subsection": "appointments",
        "subsection_label": "Terminplanung",
        "subsection_summary": "Terminblöcke, Belegungen und Kalendereinträge",
        "entry_summary": "Termine anlegen, verschieben und dokumentieren",
    },
    "pages.unavailableday": {
        "section": "scheduling",
        "subsection": "availability",
        "subsection_label": "Verfügbarkeit",
        "subsection_summary": "Sperrtage, Urlaub und ganztägige Abwesenheiten",
        "entry_summary": "Nicht verfügbare Tage zentral pflegen",
    },
    "pages.callbackrequest": {
        "section": "scheduling",
        "subsection": "callbacks",
        "subsection_label": "Rückrufwünsche",
        "subsection_summary": "Erreichbarkeit, Zeitfenster und Rückmeldungen",
        "entry_summary": "Rückrufanfragen koordinieren und weiterführen",
        "label": "Rückrufwünsche",
    },
    "pages.interpreterapplication": {
        "section": "applications",
        "subsection": "interpreter_applications",
        "subsection_label": "Dolmetscher:innen",
        "subsection_summary": "Prüfung und Entscheidung eingehender Bewerbungen",
        "entry_summary": "Bewerbungen prüfen, freigeben oder ablehnen",
    },
    "pages.serviceprice": {
        "section": "content",
        "subsection": "pricing",
        "subsection_label": "Preise",
        "subsection_summary": "Richtpreise für die öffentliche Startseite",
        "entry_summary": "Preispositionen sortieren, aktivieren und bearbeiten",
        "label": "Preispositionen",
    },
}


def _value(item, key, default=""):
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _build_section(section_id):
    config = SECTION_CONFIG[section_id]
    return {
        "id": section_id,
        "label": config["label"],
        "summary": config["summary"],
        "icon": config["icon"],
        "subsections": OrderedDict(),
        "entry_count": 0,
    }


def _ensure_subsection(section, subsection_id, label, summary):
    subsection = section["subsections"].get(subsection_id)
    if subsection:
        return subsection

    anchor = f"{section['id']}-{slugify(label) or subsection_id}"
    subsection = {
        "id": subsection_id,
        "label": label,
        "summary": summary,
        "anchor": anchor,
        "entries": [],
        "count": 0,
    }
    section["subsections"][subsection_id] = subsection
    return subsection


def _admin_actions(site_url, user):
    entries = [
        {
            "label": "Startseite",
            "meta": "Öffnet die hierarchische Verwaltungsübersicht.",
            "url": reverse("admin:index"),
            "kind": "action",
            "primary_action": {"label": "Öffnen", "url": reverse("admin:index")},
            "secondary_action": None,
        }
    ]
    if site_url:
        entries.append(
            {
                "label": "Website",
                "meta": "Wechselt zurück zur öffentlichen Website.",
                "url": site_url,
                "kind": "action",
                "primary_action": {"label": "Öffnen", "url": site_url},
                "secondary_action": None,
            }
        )
    if user and user.has_usable_password():
        url = reverse("admin:password_change")
        entries.append(
            {
                "label": "Passwort",
                "meta": "Öffnet die Passwortverwaltung für den aktuellen Admin-Zugang.",
                "url": url,
                "kind": "action",
                "primary_action": {"label": "Ändern", "url": url},
                "secondary_action": None,
            }
        )
    return entries


def _safe_admin_url(url_name, *, args=None, query=None):
    try:
        url = reverse(url_name, args=args or ())
    except NoReverseMatch:
        return ""
    if not query:
        return url
    return f"{url}?{query}"


def _model_entry(app, model, config=None):
    label = (config or {}).get("label") or _value(model, "name")
    admin_url = _value(model, "admin_url")
    add_url = _value(model, "add_url")
    view_only = bool(_value(model, "view_only"))
    app_name = _value(app, "name")
    summary = (config or {}).get("entry_summary")
    if not summary:
        summary = f"Datenmodell in {app_name}"
    primary_label = "Ansehen" if view_only else "Öffnen"
    primary_action = {"label": primary_label, "url": admin_url} if admin_url else None
    secondary_action = {"label": "Neu", "url": add_url} if add_url else None

    return {
        "label": label,
        "meta": summary,
        "url": admin_url or add_url or "",
        "kind": "model",
        "primary_action": primary_action,
        "secondary_action": secondary_action,
        "app_label": _value(app, "app_label"),
        "object_name": _value(model, "object_name"),
        "view_only": view_only,
    }


@register.simple_tag(takes_context=True)
def admin_explorer_sections(context):
    app_list = context.get("app_list") or []
    site_url = context.get("site_url") or ""
    user = context.get("user")
    sections = {section_id: _build_section(section_id) for section_id in SECTION_ORDER}

    admin_subsection = _ensure_subsection(
        sections["administration"],
        "workspace",
        "Start und Zugriff",
        "Grundfunktionen des Verwaltungsbereichs",
    )
    admin_subsection["entries"].extend(_admin_actions(site_url, user))
    admin_subsection["count"] = len(admin_subsection["entries"])
    sections["administration"]["entry_count"] = admin_subsection["count"]

    for app in app_list:
        app_label = _value(app, "app_label")
        app_name = _value(app, "name")
        for model in _value(app, "models", []):
            model_key = f"{app_label}.{_value(model, 'object_name', '').lower()}"
            config = MODEL_CONFIG.get(model_key)
            if config:
                section = sections[config["section"]]
                subsection = _ensure_subsection(
                    section,
                    config["subsection"],
                    config["subsection_label"],
                    config["subsection_summary"],
                )
                subsection["entries"].append(_model_entry(app, model, config))
                subsection["count"] += 1
                section["entry_count"] += 1
                continue

            fallback_section = sections["content"]
            fallback_subsection = _ensure_subsection(
                fallback_section,
                app_label,
                app_name,
                f"Weitere Inhalte aus {app_name}",
            )
            fallback_subsection["entries"].append(_model_entry(app, model))
            fallback_subsection["count"] += 1
            fallback_section["entry_count"] += 1

    resolved_sections = []
    for section_id in SECTION_ORDER:
        section = sections[section_id]
        subsection_list = [subsection for subsection in section["subsections"].values() if subsection["entries"]]
        if not subsection_list:
            continue
        section["subsections"] = subsection_list
        section["subsection_count"] = len(subsection_list)
        resolved_sections.append(section)
    return resolved_sections


@register.simple_tag
def admin_optional_url(url_name):
    try:
        return reverse(url_name)
    except NoReverseMatch:
        return ""


@register.simple_tag
def admin_dashboard_metrics():
    today = timezone.localdate()
    next_week = today + timedelta(days=7)
    open_messages = ChatMessage.objects.filter(handled=False).count()
    pending_replies = ChatReply.objects.filter(delivered=False).count()
    active_callbacks = CallbackRequest.objects.exclude(
        status__in=(CallbackRequest.STATUS_COMPLETED, CallbackRequest.STATUS_CANCELLED)
    ).count()
    new_applications = InterpreterApplication.objects.filter(
        status=InterpreterApplication.STATUS_NEW
    ).count()

    return [
        {
            "label": "Offene Anfragen",
            "value": open_messages,
            "caption": "Kontaktformular und Posteingang",
            "url": _safe_admin_url("admin:pages_chatmessage_changelist", query="handled__exact=0"),
            "tone": "urgent" if open_messages else "calm",
        },
        {
            "label": "Antworten offen",
            "value": pending_replies,
            "caption": "Noch nicht zugestellte Antworten",
            "url": _safe_admin_url("admin:pages_chatreply_changelist", query="delivered__exact=0"),
            "tone": "urgent" if pending_replies else "calm",
        },
        {
            "label": "Aktive Rückrufe",
            "value": active_callbacks,
            "caption": "Neu, kontaktiert oder terminiert",
            "url": _safe_admin_url("admin:pages_callbackrequest_changelist"),
            "tone": "work" if active_callbacks else "calm",
        },
        {
            "label": "Neue Bewerbungen",
            "value": new_applications,
            "caption": "Noch nicht entschieden",
            "url": _safe_admin_url("admin:pages_interpreterapplication_changelist", query="status__exact=new"),
            "tone": "work" if new_applications else "calm",
        },
        {
            "label": "Termine 7 Tage",
            "value": Appointment.objects.filter(date__gte=today, date__lte=next_week).count(),
            "caption": "Heute bis nächste Woche",
            "url": _safe_admin_url("admin:pages_appointment_changelist", query="window=next_7_days"),
            "tone": "calendar",
        },
        {
            "label": "Benutzerkonten",
            "value": User.objects.count(),
            "caption": "Registrierte Konten insgesamt",
            "url": _safe_admin_url("admin:auth_user_changelist"),
            "tone": "calm",
        },
    ]


@register.simple_tag
def admin_work_queue():
    queue = []
    for message in ChatMessage.objects.filter(handled=False).order_by("-created_at")[:3]:
        queue.append(
            {
                "type": "Kontakt",
                "title": message.contact_email or "Neue Kontaktanfrage",
                "text": (message.text or "").strip(),
                "created_at": message.created_at,
                "url": _safe_admin_url("admin:pages_chatmessage_change", args=[message.pk]),
                "priority": "hoch",
            }
        )

    active_callback_statuses = (
        CallbackRequest.STATUS_NEW,
        CallbackRequest.STATUS_CONTACTED,
        CallbackRequest.STATUS_SCHEDULED,
    )
    for callback in CallbackRequest.objects.filter(status__in=active_callback_statuses).order_by("-created_at")[:3]:
        queue.append(
            {
                "type": "Rückruf",
                "title": callback.phone,
                "text": callback.time_windows or callback.get_status_display(),
                "created_at": callback.created_at,
                "url": _safe_admin_url("admin:pages_callbackrequest_change", args=[callback.pk]),
                "priority": callback.get_status_display(),
            }
        )

    for application in InterpreterApplication.objects.filter(status=InterpreterApplication.STATUS_NEW).order_by("-created_at")[:3]:
        queue.append(
            {
                "type": "Bewerbung",
                "title": application.display_name or application.user.email or application.user.username,
                "text": application.languages,
                "created_at": application.created_at,
                "url": _safe_admin_url("admin:pages_interpreterapplication_change", args=[application.pk]),
                "priority": "Prüfen",
            }
        )

    queue.sort(key=lambda item: item["created_at"], reverse=True)
    return queue[:6]
