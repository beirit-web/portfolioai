import hashlib
import html
import json
import logging
import uuid
from pathlib import Path
from dataclasses import dataclass
from smtplib import SMTPException
from typing import Optional, Tuple
from datetime import date, datetime, time, timedelta
from urllib.parse import quote, urlencode

from django.core.exceptions import PermissionDenied, RequestDataTooBig
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.db import models
from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.core import signing
from django.forms import ValidationError
from django.core.mail.backends.base import BaseEmailBackend
from django.core.cache import cache
from django.http import FileResponse, Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from django.templatetags.static import static
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.cache import never_cache
from django.urls import reverse
from django.utils.text import slugify
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    url_has_allowed_host_and_scheme,
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from django.utils import timezone

from pages.modules.mail import (
    is_smtp_available,
    send_account_verification_email,
    send_notification_email,
)
from pages.modules.service_availability import get_upload_availability_error, is_service_open
from pages.modules.tokens import email_verification_token_generator

from .auth_session import (
    SESSION_GENERATION_SESSION_KEY,
    SESSION_IDLE_TIMEOUT_REASON,
    check_authenticated_session,
    get_remaining_session_seconds,
    get_session_idle_timeout_seconds,
    initialize_authenticated_session,
    touch_user_activity,
)
from .forms import (
    AccountDocumentForm,
    AccountMailboxForm,
    AppointmentQuickForm,
    CallbackRequestForm,
    ContactRequestForm,
    InterpreterApplicationForm,
    LoginForm,
    NotificationPreferencesForm,
    ProfileImageForm,
    RegistrationForm,
    UserAccountForm,
    UnavailableDayForm,
)
from .models import (
    AccountDocument,
    AccountNotice,
    AnonymousClient,
    Appointment,
    CallbackRequest,
    ChatMessage,
    ChatReply,
    InterpreterApplication,
    Profile,
    Project,
    UnavailableDay,
    WeatherSearch,
)
from .seo import (
    INTEGRATED_PROJECT_SLUGS,
    portfolio_page_metadata,
    portfolio_structured_data,
    structured_data_json,
)
from .project_detail import build_project_detail
from .projects_overview import build_projects_overview

logger = logging.getLogger(__name__)


INTRO_CLIENT_COOKIE = "beirit_client_id"
INTRO_VIDEO_COOLDOWN = timedelta(hours=24)
PROJECT_COVER_SLUGS = {
    "sprachdienstleistungen", "online-shop", "vertragsgenerator",
    "wohnungssuche-bodensee", "notenrechner", "enbt-botanic",
}
PROJECT_OVERVIEW_IMAGE_SIZES = (
    "(max-width: 47.99rem) calc(100vw - 2rem), "
    "(max-width: 74rem) calc((100vw - 4rem) / 2), "
    "calc((min(100vw, 92rem) - 7rem) / 3)"
)

PROJECT_DETAIL_IMAGE_SIZES = (
    "(max-width: 39.99rem) calc(100vw - 1.5rem), "
    "(max-width: 63.99rem) calc(100vw - 4rem), "
    "(max-width: 79.99rem) calc(100vw - 5rem), "
    "(max-width: 89.99rem) calc((100vw - 7rem) * 0.54), "
    "(max-width: 109.99rem) calc((min(100vw, 94rem) - 8rem) * 0.58), 57.6rem"
)


SEO_SITEMAP_ITEMS = [
    ("pages:home", "daily", "1.0", "templates/pages/index.html"),
    ("pages:skills_page_no_slash", "monthly", "0.8", "templates/pages/index.html"),
    ("pages:projects_page_no_slash", "weekly", "0.7", "templates/pages/index.html"),
    ("pages:about_page_no_slash", "monthly", "0.6", "templates/pages/index.html"),
    ("pages:contact_no_slash", "monthly", "0.7", "templates/pages/index.html"),
]

GOOGLE_SITE_VERIFICATION_FILE = "google-example-verification.html"
HOME_TICKER_CACHE_KEY_PREFIX = "home_ticker_interpreters_v1"
HOME_TICKER_CACHE_TTL_SECONDS = 300
HOUSING_TOKEN_SALT = "wohnungssuche-api-token"
HOUSING_SPA_INDEX = Path(settings.BASE_DIR) / "assets" / "portfolio" / "wohnungssuche" / "index.html"
HOUSING_LIVE_LISTINGS = [
    {
        "id": "saved-search-immowelt-landkreis-konstanz",
        "title": "Immowelt-Suchseite Landkreis Konstanz",
        "city": "Radolfzell",
        "rooms": None,
        "living_area": None,
        "cold_rent": None,
        "warm_rent": None,
        "source_name": "Immowelt",
        "source_type": "manual",
        "import_method": "manual",
        "source_permission_status": "manual_only",
        "source_url": "https://www.immowelt.de/suche/462771/wohnungen/mieten",
        "external_offer_id": "",
        "imported_at": "2026-07-26T00:00:00+02:00",
        "last_verified_at": None,
        "is_demo": False,
        "is_manual": True,
        "is_verified": False,
        "listing_kind": "search_page",
        "published_at": "2026-07-26T00:00:00+02:00",
        "status": "review",
        "social_housing": False,
        "wbs_required": False,
        "private_landlord": False,
        "balcony": False,
        "fitted_kitchen": False,
        "elevator": False,
        "original_url": "https://www.immowelt.de/suche/462771/wohnungen/mieten",
        "description": "Manuell gespeicherter Link auf eine Angebotsuebersicht. Nicht automatisch ausgelesen und nicht auf Aktualitaet geprueft.",
        "scores": [],
    },
    {
        "id": "saved-search-immowelt-konstanz",
        "title": "Immowelt-Suchseite Konstanz",
        "city": "Konstanz",
        "rooms": None,
        "living_area": None,
        "cold_rent": None,
        "warm_rent": None,
        "source_name": "Immowelt",
        "source_type": "manual",
        "import_method": "manual",
        "source_permission_status": "manual_only",
        "source_url": "https://www.immowelt.at/suche/ausland/mieten/wohnung/baden-wurttemberg/konstanz-78462/ad08de6010",
        "external_offer_id": "",
        "imported_at": "2026-07-26T00:00:00+02:00",
        "last_verified_at": None,
        "is_demo": False,
        "is_manual": True,
        "is_verified": False,
        "listing_kind": "search_page",
        "published_at": "2026-07-26T00:00:00+02:00",
        "status": "review",
        "social_housing": False,
        "wbs_required": False,
        "private_landlord": True,
        "balcony": False,
        "fitted_kitchen": False,
        "elevator": False,
        "original_url": "https://www.immowelt.at/suche/ausland/mieten/wohnung/baden-wurttemberg/konstanz-78462/ad08de6010",
        "description": "Manuell gespeicherter Link auf eine Angebotsuebersicht. Nicht automatisch ausgelesen und nicht auf Aktualitaet geprueft.",
        "scores": [],
    },
    {
        "id": "saved-search-kleinanzeigen-konstanz",
        "title": "Kleinanzeigen-Suchseite Konstanz",
        "city": "Konstanz",
        "rooms": None,
        "living_area": None,
        "cold_rent": None,
        "warm_rent": None,
        "source_name": "Kleinanzeigen",
        "source_type": "manual",
        "import_method": "manual",
        "source_permission_status": "manual_only",
        "source_url": "https://www.kleinanzeigen.de/s-wohnung-mieten/konstanz/c203l9386",
        "external_offer_id": "",
        "imported_at": "2026-07-26T00:00:00+02:00",
        "last_verified_at": None,
        "is_demo": False,
        "is_manual": True,
        "is_verified": False,
        "listing_kind": "search_page",
        "published_at": "2026-07-26T00:00:00+02:00",
        "status": "review",
        "social_housing": False,
        "wbs_required": False,
        "private_landlord": False,
        "balcony": False,
        "fitted_kitchen": False,
        "elevator": False,
        "original_url": "https://www.kleinanzeigen.de/s-wohnung-mieten/konstanz/c203l9386",
        "description": "Manuell gespeicherter Link auf eine Angebotsuebersicht. Nicht automatisch ausgelesen und nicht auf Aktualitaet geprueft.",
        "scores": [],
    },
]


class ContactActionRedirect(HttpResponseRedirect):
    allowed_schemes = [*HttpResponseRedirect.allowed_schemes, "mailto", "tel"]


@never_cache
def housing_spa(_request):
    if not HOUSING_SPA_INDEX.exists():
        raise Http404("Wohnungssuche build not found.")
    return FileResponse(HOUSING_SPA_INDEX.open("rb"), content_type="text/html")


def build_absolute_site_url(path: str = "") -> str:
    base_url = getattr(settings, "SITE_URL", "").rstrip("/")
    if not path:
        return f"{base_url}/"
    if path.startswith(("http://", "https://")):
        return path
    return f"{base_url}{path if path.startswith('/') else '/' + path}"


def housing_json_body(request) -> tuple[dict, JsonResponse | None]:
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}, JsonResponse({"errors": {"detail": ["Ungueltige JSON-Daten."]}}, status=400)
    if not isinstance(body, dict):
        return {}, JsonResponse({"errors": {"detail": ["JSON-Objekt erwartet."]}}, status=400)
    return body, None


def housing_authenticated_user(request) -> User | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Token "):
        return None
    token = header.removeprefix("Token ").strip()
    try:
        data = signing.loads(token, salt=HOUSING_TOKEN_SALT, max_age=60 * 60 * 24 * 30)
        return User.objects.filter(pk=data.get("uid"), is_active=True).first()
    except signing.BadSignature:
        return None


def serialize_project(project: Project) -> dict:
    image_url = project.preview_image_url
    technologies = project.technology_list
    return {
        "title": project.title,
        "slug": project.slug,
        "shortDescription": project.short_description,
        "description": project.description,
        "text": project.short_description,
        "situation": project.situation,
        "implementation": project.implementation,
        "result": project.result,
        "type": project.category or "Portfolio-Projekt",
        "category": project.category or "Weitere",
        "status": project.status_label or project.get_status_display(),
        "statusCode": project.status,
        "technologies": technologies,
        "features": project.feature_list or technologies,
        "tags": technologies,
        "images": (
            [{"src": image_url, "label": project.image_alt or "Vorschau"}]
            if image_url
            else []
        ),
        "image": image_url,
        "imageAlt": project.image_alt,
        "liveUrl": project.live_url,
        "href": project.live_url,
        "githubUrl": project.github_url,
        "githubHref": project.github_url,
        "published": project.published,
        "featured": project.featured,
        "sortOrder": project.sort_order,
    }


def published_portfolio_projects():
    return list(
        Project.objects.filter(published=True)
        .exclude(slug__in=INTEGRATED_PROJECT_SLUGS)
        .order_by("sort_order", "title")
    )


def portfolio_projects_payload(projects):
    items = [dict(serialize_project(project), orderIndex=index) for index, project in enumerate(projects)]
    return {
        "projects": items,
        "featuredProjects": [item for item in items if item["featured"]][:6],
    }


def project_cover_image_preload(slug, *, detail=False):
    base = f"/static/images/portfolio-covers/{slug}-cover-v1"
    widths = (480, 768, 960) if detail else (480, 768)
    return {
        "src": f"{base}.webp",
        "srcset": ", ".join([f"{base}-{width}.webp {width}w" for width in widths] + [f"{base}.webp 1254w"]),
        "sizes": PROJECT_DETAIL_IMAGE_SIZES if detail else PROJECT_OVERVIEW_IMAGE_SIZES,
    }


def project_overview_image_preload(projects):
    for project in projects:
        if project.slug in PROJECT_COVER_SLUGS:
            return project_cover_image_preload(project.slug)
        if project.preview_image_url:
            return {"src": project.preview_image_url}
    return None


@require_GET
def projects_api(_request):
    return JsonResponse(portfolio_projects_payload(published_portfolio_projects()))


@csrf_exempt
@require_POST
def housing_register_api(request):
    data, error = housing_json_body(request)
    if error:
        return error

    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    password_confirm = str(data.get("password_confirm", ""))
    errors: dict[str, list[str]] = {}

    if not username:
        errors["username"] = ["Nutzername ist erforderlich."]
    elif User.objects.filter(username=username).exists():
        errors["username"] = ["Dieser Nutzername ist bereits vergeben."]
    if not email:
        errors["email"] = ["E-Mail-Adresse ist erforderlich."]
    if password != password_confirm:
        errors["password_confirm"] = ["Die Passwoerter stimmen nicht ueberein."]
    try:
        validate_password(password)
    except ValidationError as exc:
        errors["password"] = list(exc.messages)

    if errors:
        return JsonResponse({"errors": errors}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    return JsonResponse(
        {
            "detail": "Registrierung erfolgreich. Du kannst dich jetzt einloggen.",
            "email": user.email,
            "login_url": "/static/portfolio/wohnungssuche/index.html",
        },
        status=201,
    )


@csrf_exempt
@require_POST
def housing_token_auth_api(request):
    data, error = housing_json_body(request)
    if error:
        return error
    user = authenticate(request, username=str(data.get("username", "")), password=str(data.get("password", "")))
    if not user:
        return JsonResponse({"errors": {"detail": ["Nutzername oder Passwort wurden nicht akzeptiert."]}}, status=400)
    token = signing.dumps({"uid": user.pk}, salt=HOUSING_TOKEN_SALT)
    return JsonResponse({"token": token, "user_id": user.pk})


@require_GET
def housing_listings_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    listings = list(HOUSING_LIVE_LISTINGS)
    query = request.GET.get("search", "").strip().lower()
    city = request.GET.get("city", "").strip()
    max_cold_rent = request.GET.get("max_cold_rent", "").strip()
    max_warm_rent = request.GET.get("max_warm_rent", "").strip()

    if query:
        listings = [
            listing for listing in listings
            if query in " ".join(
                str(listing.get(field) or "")
                for field in ("title", "city", "description", "source_name", "status")
            ).lower()
        ]
    if city:
        listings = [listing for listing in listings if listing.get("city") == city]
    if max_cold_rent:
        try:
            max_cold = float(max_cold_rent)
            listings = [
                listing for listing in listings
                if listing.get("cold_rent") is not None and float(listing["cold_rent"]) <= max_cold
            ]
        except ValueError:
            pass
    if max_warm_rent:
        try:
            max_warm = float(max_warm_rent)
            listings = [
                listing for listing in listings
                if listing.get("warm_rent") is not None and float(listing["warm_rent"]) <= max_warm
            ]
        except ValueError:
            pass

    return JsonResponse({"count": len(listings), "next": None, "previous": None, "results": listings})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def housing_search_profiles_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if request.method == "POST":
        data, error = housing_json_body(request)
        if error:
            return error
        return JsonResponse({"id": int(timezone.now().timestamp()), **data}, status=201)
    return JsonResponse({"count": 0, "next": None, "previous": None, "results": []})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def housing_search_locations_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if request.method == "POST":
        data, error = housing_json_body(request)
        if error:
            return error
        return JsonResponse({"id": int(timezone.now().timestamp()), "name": data.get("name", ""), "radius_km": data.get("radius_km", 15)}, status=201)
    return JsonResponse({"count": 0, "next": None, "previous": None, "results": []})


@require_GET
def housing_sources_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    return JsonResponse({"count": 0, "next": None, "previous": None, "results": []})


def safe_static_url(path: str, fallback_path: str | None = None) -> str:
    try:
        return static(path)
    except ValueError:
        fallback = fallback_path or path
        logger.warning("Static manifest entry missing for %s; using %s", path, fallback)
        return f"{settings.STATIC_URL.rstrip('/')}/{fallback.lstrip('/')}"


def build_sitemap_entries() -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for url_name, changefreq, priority, source_path in SEO_SITEMAP_ITEMS:
        source = settings.BASE_DIR / source_path
        try:
            lastmod = date.fromtimestamp(source.stat().st_mtime).isoformat()
        except OSError:
            lastmod = date.today().isoformat()
        entries.append(
            {
                "loc": build_absolute_site_url(reverse(url_name)),
                "changefreq": changefreq,
                "priority": priority,
                "lastmod": lastmod,
            }
        )
    for project in Project.objects.filter(published=True).exclude(
        slug__in=INTEGRATED_PROJECT_SLUGS
    ).order_by("sort_order", "title"):
        entries.append({
            "loc": build_absolute_site_url(reverse(
                "pages:project_detail_page_no_slash", kwargs={"project_slug": project.slug}
            )),
            "changefreq": "monthly",
            "priority": "0.7",
            "lastmod": project.updated_at.date().isoformat(),
        })
    return entries


def build_email_verification_url(user: User) -> str:
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    return build_absolute_site_url(
        reverse("pages:verify_email", kwargs={"uidb64": uidb64, "token": token})
    )


def store_contact_request(request, contact_form: ContactRequestForm, lang: str) -> str:
    name = contact_form.cleaned_data["name"].strip()
    email = contact_form.cleaned_data["email"].strip()
    subject = contact_form.cleaned_data["subject"].strip()
    message_text = contact_form.cleaned_data["message"].strip()
    client_hash = get_client_fingerprint(request) or hashlib.sha256(
        f"{email}|{name}".encode("utf-8", errors="ignore")
    ).hexdigest()
    stored_text = (
        f"Kontaktformular Beirit Digital\n"
        f"Name: {name}\n"
        f"E-Mail: {email}\n"
        f"Betreff: {subject}\n\n"
        f"{message_text}"
    )
    ChatMessage.objects.create(
        lang=lang,
        user=request.user if request.user.is_authenticated else None,
        contact_email=email,
        client_hash=client_hash,
        text=stored_text,
        privacy_consent_at=timezone.now(),
        privacy_consent_version=getattr(settings, "PRIVACY_CONSENT_VERSION", ""),
    )
    if request.user.is_authenticated:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.privacy_consent_at = timezone.now()
        profile.privacy_consent_version = getattr(settings, "PRIVACY_CONSENT_VERSION", "")
        profile.privacy_consent_source = "contact_form"
        profile.save(update_fields=["privacy_consent_at", "privacy_consent_version", "privacy_consent_source"])
    send_notification_email(
        f"Neue Portfolio-Nachricht: {subject}",
        stored_text,
        getattr(settings, "CONTACT_EMAIL", ""),
    )
    return stored_text


def _contact_rate_key(request) -> str:
    return f"contact-rate:{get_client_fingerprint(request) or 'anonymous'}"


def _contact_duplicate_key(contact_form: ContactRequestForm) -> str:
    email = (contact_form.cleaned_data.get("email") or "").strip().lower()
    message = (contact_form.cleaned_data.get("message") or "").strip()
    subject = (contact_form.cleaned_data.get("subject") or "").strip()
    digest = hashlib.sha256(f"{email}|{subject}|{message}".encode("utf-8", errors="ignore")).hexdigest()
    return f"contact-duplicate:{digest}"


def contact_rate_limited(request) -> bool:
    key = _contact_rate_key(request)
    attempts = int(cache.get(key, 0) or 0)
    limit = int(getattr(settings, "CONTACT_RATE_LIMIT_COUNT", 5))
    timeout = int(getattr(settings, "CONTACT_RATE_LIMIT_SECONDS", 15 * 60))
    if attempts >= limit:
        logger.warning(
            "Contact form rate limit exceeded fingerprint=%s ua=%s",
            (get_client_fingerprint(request) or "")[:16],
            (request.META.get("HTTP_USER_AGENT") or "")[:120],
        )
        return True
    cache.set(key, attempts + 1, timeout=timeout)
    return False


def contact_duplicate_submission(contact_form: ContactRequestForm) -> bool:
    key = _contact_duplicate_key(contact_form)
    timeout = int(getattr(settings, "CONTACT_DUPLICATE_WINDOW_SECONDS", 120))
    return not cache.add(key, "1", timeout=timeout)


@require_GET
def robots_txt(_request):
    sitemap_url = build_absolute_site_url(reverse("pages:sitemap_xml"))
    host = getattr(settings, "SITE_HOST", "")
    lines = [
        "User-agent: *",
        "Allow: /",
        "",
        f"Sitemap: {sitemap_url}",
    ]
    if host:
        lines.append(f"Host: {host}")
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain; charset=utf-8")


@require_GET
def sitemap_xml(_request):
    entries = build_sitemap_entries()
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for entry in entries:
        xml_lines.extend(
            [
                "  <url>",
                f"    <loc>{html.escape(entry['loc'])}</loc>",
                f"    <lastmod>{entry['lastmod']}</lastmod>",
                f"    <changefreq>{entry['changefreq']}</changefreq>",
                f"    <priority>{entry['priority']}</priority>",
                "  </url>",
            ]
        )
    xml_lines.append("</urlset>")
    return HttpResponse("\n".join(xml_lines), content_type="application/xml; charset=utf-8")


@require_GET
def google_site_verification(_request):
    verification_file = Path(settings.BASE_DIR) / GOOGLE_SITE_VERIFICATION_FILE
    if not verification_file.exists():
        raise Http404()
    return HttpResponse(
        verification_file.read_text(encoding="utf-8"),
        content_type="text/html; charset=utf-8",
    )


def user_is_interpreter(user) -> bool:
    """
    Prüft, ob der/die Nutzer:in als Dolmetscher:in freigeschaltet ist.
    """
    if not user.is_authenticated:
        return False
    return InterpreterApplication.objects.filter(
        user=user, status=InterpreterApplication.STATUS_APPROVED
    ).exists()


def build_contact_book_entries():
    """
    Aggregiert Nutzer:innen mit Kontaktanfragen zu einem einfachen Kontaktbuch.
    Falls eine Nachricht keinem Konto zugeordnet wurde, wird ersatzweise
    nach client_hash gruppiert, damit keine Anfragen unsichtbar bleiben.
    """
    entries = {}
    chat_messages = (
        ChatMessage.objects.filter(user__isnull=False)
        .select_related("user", "user__profile")
        .order_by("-created_at")
    )
    orphan_messages = (
        ChatMessage.objects.filter(user__isnull=True)
        .select_related("user", "user__profile")
        .order_by("-created_at")
    )

    for message in chat_messages:
        key = f"user:{message.user_id}"
        entry = entries.get(key)
        if not entry:
            entry = {
                "key": key,
                "user": message.user,
                "profile": getattr(message.user, "profile", None),
                "latest_message": message,
                "message_count": 0,
                "open_count": 0,
                "latest_client_hash": message.client_hash,
                "display_name": message.user.get_full_name() or message.user.username,
                "email": message.user.email or message.contact_email or "",
                "kind": "user",
            }
            entries[key] = entry
        entry["message_count"] += 1
        if not message.handled:
            entry["open_count"] += 1

    for message in orphan_messages:
        client_hash = (message.client_hash or "").strip() or f"msg-{message.id}"
        key = f"hash:{client_hash}"
        entry = entries.get(key)
        if not entry:
            label = message.contact_email or f"Kontakt {client_hash[:10]}"
            entry = {
                "key": key,
                "user": None,
                "profile": None,
                "latest_message": message,
                "message_count": 0,
                "open_count": 0,
                "latest_client_hash": client_hash,
                "display_name": label,
                "email": message.contact_email or "nicht zugeordnet",
                "kind": "hash",
            }
            entries[key] = entry
        entry["message_count"] += 1
        if not message.handled:
            entry["open_count"] += 1

    return sorted(
        entries.values(),
        key=lambda item: item["latest_message"].created_at,
        reverse=True,
    )


def build_contact_book_thread(entry):
    """
    Baut den Verlauf für einen Kontakt aus Kontaktanfragen und Antworten.
    """
    if entry.get("user"):
        incoming_qs = ChatMessage.objects.filter(user=entry["user"])
    else:
        incoming_qs = ChatMessage.objects.filter(
            user__isnull=True,
            client_hash=entry.get("latest_client_hash", ""),
        )

    incoming_messages = list(incoming_qs.order_by("created_at"))
    client_hashes = list(
        incoming_qs.exclude(client_hash="")
        .values_list("client_hash", flat=True)
        .distinct()
    )
    outgoing_replies = list(
        ChatReply.objects.filter(client_hash__in=client_hashes).order_by("created_at")
    )

    timeline = [
        {
            "direction": "incoming",
            "created_at": message.created_at,
            "text": message.text,
            "meta": message.contact_email or (message.user.email if message.user else "") or "",
        }
        for message in incoming_messages
    ]
    timeline.extend(
        {
            "direction": "outgoing",
            "created_at": reply.created_at,
            "text": reply.text,
            "meta": "zugestellt" if reply.delivered else "wartet auf Auslieferung",
        }
        for reply in outgoing_replies
    )
    timeline.sort(key=lambda item: item["created_at"])

    latest_client_hash = incoming_messages[-1].client_hash if incoming_messages else ""
    return timeline, latest_client_hash


def build_account_mailbox_hash(user: User) -> str:
    normalized = (user.email or user.username or str(user.pk)).strip().lower().encode("utf-8")
    digest = hashlib.sha256(normalized).hexdigest()[:24]
    return f"acct-{user.pk}-{digest}"


def build_profile_mailbox_timeline(user: User):
    client_hash = build_account_mailbox_hash(user)
    incoming_messages = list(
        ChatMessage.objects.filter(user=user, client_hash=client_hash).order_by("created_at")
    )
    outgoing_replies = list(
        ChatReply.objects.filter(client_hash=client_hash).order_by("created_at")
    )
    notices = list(
        AccountNotice.objects.filter(user=user).order_by("created_at")
    )

    timeline = [
        {
            "kind": "incoming",
            "created_at": message.created_at,
            "title": "Ihre Nachricht",
            "text": message.text,
            "meta": message.contact_email or user.email or "",
        }
        for message in incoming_messages
    ]
    timeline.extend(
        {
            "kind": "reply",
            "created_at": reply.created_at,
            "title": "Antwort",
            "text": reply.text,
            "meta": "zugestellt" if reply.delivered else "neu im Postfach",
        }
        for reply in outgoing_replies
    )
    timeline.extend(
        {
            "kind": "notice",
            "created_at": notice.created_at,
            "title": notice.title,
            "text": notice.text,
            "meta": "interne Nachricht",
        }
        for notice in notices
    )
    timeline.sort(key=lambda item: item["created_at"], reverse=True)
    return client_hash, timeline


@dataclass(frozen=True)
class UploadSettings:
    """
    Regeln und Zieladressen für Datei-Uploads.
    """

    allowed_types: set[str]
    max_bytes: int
    recipient: str
    from_email: str


def parse_interpreter_ids(raw_values) -> list[int]:
    """
    Extrahiert eindeutige Interpreter-IDs aus wiederholten oder kommagetrennten Query-Parametern.
    """
    parsed_ids: list[int] = []
    seen: set[int] = set()
    for raw_value in raw_values or []:
        for chunk in str(raw_value or "").split(","):
            chunk = chunk.strip()
            if not chunk.isdigit():
                continue
            interpreter_id = int(chunk)
            if interpreter_id in seen:
                continue
            seen.add(interpreter_id)
            parsed_ids.append(interpreter_id)
    return parsed_ids


def calculate_easter_sunday(year: int) -> date:
    """
    Berechnet den Ostersonntag nach dem gregorianischen Kalender.
    """
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def niedersachsen_holidays(year: int) -> dict[str, str]:
    """
    Gesetzliche Feiertage in Niedersachsen nach NFeiertagsG § 2.
    """
    easter_sunday = calculate_easter_sunday(year)
    return {
        date(year, 1, 1).isoformat(): "Neujahr",
        (easter_sunday - timedelta(days=2)).isoformat(): "Karfreitag",
        (easter_sunday + timedelta(days=1)).isoformat(): "Ostermontag",
        date(year, 5, 1).isoformat(): "Tag der Arbeit",
        (easter_sunday + timedelta(days=39)).isoformat(): "Christi Himmelfahrt",
        (easter_sunday + timedelta(days=50)).isoformat(): "Pfingstmontag",
        date(year, 10, 3).isoformat(): "Tag der Deutschen Einheit",
        date(year, 10, 31).isoformat(): "Reformationstag",
        date(year, 12, 25).isoformat(): "1. Weihnachtstag",
        date(year, 12, 26).isoformat(): "2. Weihnachtstag",
    }


def build_shared_calendar_days(base_date=None) -> dict[str, dict[str, object]]:
    """
    Liefert gemeinsame Kalendertage wie Feiertage und Wochenenden.
    """
    today = base_date or timezone.localdate()
    days: dict[str, dict[str, object]] = {}

    for year in dict.fromkeys((today.year - 1, today.year, today.year + 1, today.year + 2)):
        for date_str, name in niedersachsen_holidays(year).items():
            meta = days.setdefault(date_str, {})
            meta["unavailable"] = True
            meta["holiday"] = True
            meta["note"] = name

        current = datetime(year, 1, 1).date()
        last = datetime(year, 12, 31).date()
        while current <= last:
            if current.weekday() in (5, 6):
                key = current.isoformat()
                meta = days.setdefault(key, {})
                meta["weekend"] = True
                meta["unavailable"] = True
                if current.weekday() == 6:
                    meta.setdefault("note", "Sonntag")
                else:
                    meta.setdefault("note", "Samstag")
            current += timedelta(days=1)

    return days


def combine_calendar_datetime(date_value, time_value):
    base_time = time_value or time(0, 0)
    try:
        return datetime.combine(date_value, base_time)
    except Exception:
        return None


def build_calendar_event_payload(appointment: Appointment, include_private: bool, default_duration: timedelta):
    """
    Baut ein Kalender-Event für JSON-Antworten.
    """
    start_dt = combine_calendar_datetime(appointment.date, appointment.start_time)
    if not start_dt:
        return None
    end_dt = combine_calendar_datetime(appointment.date, appointment.end_time)
    if not end_dt:
        end_dt = start_dt + default_duration

    event = {
        "title": (appointment.subject or "Belegt") if include_private else "Belegt",
        "start": start_dt.isoformat(timespec="minutes"),
        "end": end_dt.isoformat(timespec="minutes"),
    }
    if include_private:
        event.update(
            {
                "location": appointment.location,
                "username": appointment.username,
                "note": appointment.note,
            }
        )
    return event


def build_calendar_payload(include_private: bool, interpreter_ids: Optional[list[int]] = None) -> dict:
    """
    Erzeugt Kalenderdaten entweder für einen Gesamtfeed oder gebündelt pro Dolmetscher:in.
    """
    default_duration = timedelta(minutes=60)
    appointment_fields = (
        "id",
        "interpreter_id",
        "date",
        "start_time",
        "end_time",
        "location",
        "subject",
        "username",
        "note",
    )
    unavailable_fields = ("id", "interpreter_id", "date", "note")

    if interpreter_ids is None:
        events = []
        days = build_shared_calendar_days()
        appointment_qs = Appointment.objects.only(*appointment_fields)
        unavailable_qs = UnavailableDay.objects.only(*unavailable_fields)

        for appointment in appointment_qs:
            event = build_calendar_event_payload(appointment, include_private, default_duration)
            if not event:
                continue
            events.append(event)
            day_key = event["start"][:10]
            meta = days.setdefault(day_key, {})
            meta["busy"] = True

        for unavailable_day in unavailable_qs:
            meta = days.setdefault(unavailable_day.date.isoformat(), {})
            meta["unavailable"] = True
            meta["note"] = unavailable_day.note

        return {"events": events, "days": days}

    requested_ids = [int(interpreter_id) for interpreter_id in interpreter_ids]
    requested_set = set(requested_ids)
    calendars = {
        str(interpreter_id): {"events": [], "days": {}}
        for interpreter_id in requested_ids
    }

    if not requested_ids:
        return {"shared_days": build_shared_calendar_days(), "calendars": calendars}

    appointment_qs = Appointment.objects.filter(
        models.Q(interpreter_id__in=requested_ids) | models.Q(interpreter__isnull=True)
    ).only(*appointment_fields)
    unavailable_qs = UnavailableDay.objects.filter(
        models.Q(interpreter_id__in=requested_ids) | models.Q(interpreter__isnull=True)
    ).only(*unavailable_fields)

    for appointment in appointment_qs:
        event = build_calendar_event_payload(appointment, include_private, default_duration)
        if not event:
            continue
        target_ids = requested_ids if appointment.interpreter_id is None else [appointment.interpreter_id]
        for interpreter_id in target_ids:
            if interpreter_id not in requested_set:
                continue
            calendar = calendars[str(interpreter_id)]
            calendar["events"].append(event.copy())
            day_key = event["start"][:10]
            meta = calendar["days"].setdefault(day_key, {})
            meta["busy"] = True

    for unavailable_day in unavailable_qs:
        target_ids = requested_ids if unavailable_day.interpreter_id is None else [unavailable_day.interpreter_id]
        for interpreter_id in target_ids:
            if interpreter_id not in requested_set:
                continue
            calendar = calendars[str(interpreter_id)]
            meta = calendar["days"].setdefault(unavailable_day.date.isoformat(), {})
            meta["unavailable"] = True
            meta["note"] = unavailable_day.note

    return {"shared_days": build_shared_calendar_days(), "calendars": calendars}


def build_home_contact_messengers(contact_actions):
    return []


def get_home_ticker_cache_key(lang: str) -> str:
    normalized_lang = "ru" if (lang or "").lower() == "ru" else "de"
    return f"{HOME_TICKER_CACHE_KEY_PREFIX}:{normalized_lang}"


def build_home_ticker_interpreters(lang: str):
    cache_key = get_home_ticker_cache_key(lang)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    normalized_lang = "ru" if (lang or "").lower() == "ru" else "de"
    default_meta = (
        "Dolmetschen & Begleitung"
        if normalized_lang == "de"
        else "Перевод и сопровождение"
    )
    fallback_languages = "Sprachen" if normalized_lang == "de" else "Языки"

    interpreters = list(
        InterpreterApplication.objects.filter(
            status=InterpreterApplication.STATUS_APPROVED
        )
        .order_by("-created_at")
        .values(
            "id",
            "display_name",
            "languages",
            "specialization",
            "experience",
            "availability",
        )
    )

    formatted = []
    for item in interpreters:
        parts = [
            (item.get("specialization") or "").strip(),
            (item.get("experience") or "").strip(),
            (item.get("availability") or "").strip(),
        ]
        parts = [part for part in parts if part]
        languages = (item.get("languages") or "").strip()
        languages = " / ".join(
            [
                segment.strip()
                for segment in languages.replace("|", "/").replace(",", "/").split("/")
                if segment.strip()
            ]
        ) or fallback_languages
        formatted.append(
            {
                "id": item["id"],
                "display_name": item.get("display_name"),
                "languages": languages,
                "meta": " · ".join(parts) if parts else default_meta,
                "is_default_meta": not parts,
            }
        )

    if len(formatted) == 1:
        formatted *= 2

    cache.set(cache_key, formatted, HOME_TICKER_CACHE_TTL_SECONDS)
    return formatted


def build_directory_slug(display_name: str, fallback: str) -> str:
    return slugify(display_name or "") or fallback


def summarize_directory_text(text: str, fallback: str) -> str:
    normalized = " ".join(
        (text or "")
        .replace("DEUTSCH:", "")
        .replace("РУССКИЙ:", "")
        .split()
    ).strip()
    if not normalized:
        return fallback
    if len(normalized) <= 180:
        return normalized
    clipped = normalized[:177].rsplit(" ", 1)[0].strip()
    return f"{clipped or normalized[:177]}..."


def build_interpreter_directory_entries(
    applications: list[InterpreterApplication],
) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for app in applications:
        profile = getattr(app.user, "profile", None)
        display_name = (
            (app.display_name or "").strip()
            or app.user.get_full_name().strip()
            or app.user.username
        )
        slug = build_directory_slug(display_name, f"interpreter-{app.id}")
        entries.append(
            {
                "slug": slug,
                "anchor_id": f"interp-{slug}",
                "display_name": display_name,
                "image_url": profile.image_url if profile else "",
                "languages": app.languages,
                "region": app.region,
                "specialization": app.specialization,
                "experience": app.experience,
                "availability": app.availability,
                "motivation": app.motivation,
                "service_title": (
                    (app.specialization or "").strip()
                    or "Persönliche Unterstützung für Termine, Gespräche und Dokumente"
                ),
                "service_summary": summarize_directory_text(
                    app.motivation,
                    "Aktives Profil für persönliche Begleitung und Dolmetsch-Einsätze.",
                ),
                "type_label": "Dolmetscherprofil",
                "badge_label": "Aktiv",
                "image_letter": display_name[:1].upper() or "D",
                "is_placeholder": False,
                "is_company": False,
                "has_calendar": True,
                "application": app,
                "user": app.user,
            }
        )

    return entries


def filter_directory_entries(
    entries: list[dict[str, object]],
    region_query: str,
    language_query: str,
) -> list[dict[str, object]]:
    filtered_entries: list[dict[str, object]] = []
    for entry in entries:
        region = str(entry.get("region") or "")
        languages = str(entry.get("languages") or "")
        if region_query and region_query.lower() not in region.lower():
            continue
        if language_query and language_query.lower() not in languages.lower():
            continue
        filtered_entries.append(entry)
    return filtered_entries


@ensure_csrf_cookie
def home(request, project_slug=None):
    if project_slug == "deutschlive":
        return redirect("/projekte/sprachdienstleistungen/#deutschlive", permanent=True)
    if project_slug == "musikplayer":
        return redirect("/projekte/sprachdienstleistungen/#musikplayer", permanent=True)
    if project_slug == "wetter":
        return redirect("/projekte/enbt-botanic/#wetter", permanent=True)
    if request.path.rstrip("/") == "/wetter":
        return redirect("botanic:weather", permanent=True)
    if project_slug == "vokabelbox":
        return redirect("/projekte/sprachdienstleistungen/#vokabelbox", permanent=True)
    maybe_add_idle_timeout_message(request)
    ctx = build_base_context(request, include_upload=True)
    contact_actions = ctx.get("contact_actions", {})
    lang = ctx.get("initial_lang", "de")
    contact_form = ContactRequestForm(request.POST or None, request.FILES or None)
    if request.method == "POST":
        if contact_rate_limited(request):
            return render(request, "429.html", {
                "status_code": 429,
                "error_title": "Zu viele Anfragen",
                "error_message": "Bitte warten Sie kurz und versuchen Sie es danach erneut.",
            }, status=429)
        if contact_form.is_valid():
            if contact_duplicate_submission(contact_form):
                messages.error(request, "Diese Anfrage wurde gerade bereits gesendet.")
                return redirect(f"{reverse('pages:home')}#kontakt")
            store_contact_request(request, contact_form, lang)
            messages.success(
                request,
                "Danke. Ihre Anfrage wurde gespeichert. Ich prüfe sie und melde mich zurück.",
            )
            return redirect(f"{reverse('pages:home')}#kontakt")
        messages.error(request, "Bitte prüfen Sie die markierten Formularfelder.")

    ctx["show_home_calendar"] = bool(ctx.get("calendar_enabled")) and request.user.is_authenticated
    applications = list(
        InterpreterApplication.objects.select_related("user", "user__profile")
        .filter(status=InterpreterApplication.STATUS_APPROVED)
        .order_by("user__username", "user__id")
    )
    for app in applications:
        profile = getattr(app.user, "profile", None)
        if not profile:
            profile, _ = Profile.objects.get_or_create(user=app.user)
            app.user.profile = profile
    directory_entries = build_interpreter_directory_entries(applications)

    ctx["home_contact_messengers"] = build_home_contact_messengers(contact_actions)
    ctx["home_active_entry"] = next(
        (entry for entry in directory_entries if not entry.get("is_placeholder")),
        None,
    )
    ctx["womens_day_page_href"] = reverse("pages:womens_day")
    ctx["womens_day_page_label"] = (
        "Zur Weltfrauentag-Seite"
        if lang == "de"
        else "Открыть отдельную страницу"
    )
    ctx["ticker_interpreters"] = build_home_ticker_interpreters(lang)
    ctx["contact_form"] = contact_form
    route_path = request.path.rstrip("/") or "/"
    ctx["react_route_path"] = route_path
    ctx["react_is_home_route"] = route_path == "/"
    project = Project.objects.filter(slug=project_slug, published=True).first() if project_slug else None
    page_meta = portfolio_page_metadata(
        route_path, build_absolute_site_url, project=project, project_slug=project_slug
    )
    ctx["react_page_meta"] = page_meta
    listed_projects = published_portfolio_projects() if route_path == "/projekte" else ()
    ctx["portfolio_structured_data_json"] = structured_data_json(
        portfolio_structured_data(page_meta, build_absolute_site_url, project, listed_projects)
    )

    ctx["react_home_config"] = {
        "pageMeta": page_meta,
        "contactApiUrl": reverse("pages:contact_request_api"),
        "logoUrl": safe_static_url("images/aktueles-logo-160.webp"),
        "logoSmallUrl": safe_static_url("images/aktueles-logo-160.webp"),
        "logoLargeUrl": safe_static_url("images/aktueles-logo-320.webp"),
        "projectsApiUrl": reverse("pages:projects_api"),
        "weatherSearchesUrl": reverse("pages:weather_searches"),
        "loginUrl": reverse("pages:login"),
        "registerUrl": reverse("pages:register"),
        "profileUrl": reverse("pages:profile"),
        "logoutUrl": reverse("pages:logout"),
    }
    ctx["react_is_project_detail"] = bool(project_slug)
    if project_slug in PROJECT_COVER_SLUGS:
        ctx["react_project_image_preload"] = project_cover_image_preload(project_slug, detail=True)
    if project:
        ctx["project_detail"] = build_project_detail(serialize_project(project), lang, ctx["react_home_config"])
    if route_path == "/projekte":
        ctx["react_home_config"]["initialProjects"] = portfolio_projects_payload(listed_projects)["projects"]
        ctx["react_project_image_preload"] = project_overview_image_preload(listed_projects)
        ctx["projects_overview"] = build_projects_overview(
            ctx["react_home_config"]["initialProjects"], lang, ctx["react_home_config"]
        )

    return render(request, "pages/index.html", ctx)


@require_POST
@csrf_protect
def contact_request_api(request):
    lang = get_preferred_language(request)
    if contact_rate_limited(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "Bitte warten Sie kurz, bevor Sie erneut senden.",
                "errors": {},
            },
            status=429,
        )
    contact_form = ContactRequestForm(request.POST, request.FILES)
    if contact_form.is_valid():
        if contact_duplicate_submission(contact_form):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Diese Anfrage wurde gerade bereits gesendet.",
                    "errors": {},
                },
                status=429,
            )
        store_contact_request(request, contact_form, lang)
        return JsonResponse(
            {
                "ok": True,
                "message": "Danke. Ihre Nachricht wurde gespeichert. Ich melde mich, sobald ich sie gelesen habe.",
            }
        )
    return JsonResponse(
        {
            "ok": False,
            "message": "Bitte prüfen Sie die markierten Formularfelder.",
            "errors": contact_form.errors.get_json_data(),
        },
        status=400,
    )


def womens_day(request):
    context = build_base_context(request)
    context["back_home_href"] = reverse("pages:home")
    context["back_home_label"] = (
        "Zur Startseite"
        if get_preferred_language(request) == "de"
        else "На главную"
    )
    return render(request, "pages/weltfrauentag.html", context)


def about(request):
    raise PermissionDenied()


def manual(request):
    manual_path = settings.SERVER_DIR / "assets" / "files" / "handbuch.html"
    try:
        return HttpResponse(manual_path.read_text(encoding="utf-8"), content_type="text/html; charset=utf-8")
    except FileNotFoundError as exc:
        raise Http404("Handbuchdatei nicht gefunden.") from exc


def service_catalog(request):
    return redirect(f"{reverse('pages:home')}#leistungen")


def normalize_weather_query(value: str) -> str:
    return " ".join(str(value or "").strip().split()).lower()


def weather_search_payload(search: WeatherSearch) -> dict:
    return {
        "id": search.pk,
        "query": search.query,
        "city": search.city_label or search.query,
        "updated_at": search.updated_at.isoformat() if search.updated_at else "",
    }


@require_http_methods(["GET", "POST"])
@csrf_protect
def weather_searches_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "auth_required"}, status=403)

    if request.method == "GET":
        searches = WeatherSearch.objects.filter(user=request.user)[:12]
        return JsonResponse(
            {"searches": [weather_search_payload(search) for search in searches]},
            json_dumps_params={"ensure_ascii": False},
        )

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    query = " ".join(str(body.get("query") or "").strip().split())
    city_label = " ".join(str(body.get("city") or "").strip().split())
    normalized_query = normalize_weather_query(query or city_label)
    if len(normalized_query) < 2:
        return JsonResponse({"error": "invalid_query"}, status=400)

    search, _ = WeatherSearch.objects.update_or_create(
        user=request.user,
        normalized_query=normalized_query[:200],
        defaults={
            "query": (query or city_label)[:200],
            "city_label": city_label[:200],
        },
    )
    searches = WeatherSearch.objects.filter(user=request.user)[:12]
    return JsonResponse(
        {
            "saved": weather_search_payload(search),
            "searches": [weather_search_payload(item) for item in searches],
        },
        json_dumps_params={"ensure_ascii": False},
    )


@require_POST
@csrf_protect
def weather_search_delete_api(request, search_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "auth_required"}, status=403)

    deleted, _ = WeatherSearch.objects.filter(pk=search_id, user=request.user).delete()
    return JsonResponse({"ok": True, "deleted": bool(deleted)})


def legal(request):
    return render(request, "pages/rechtliches.html", build_base_context(request))


def privacy(request):
    return render(request, "pages/datenschutz.html", build_base_context(request))


def imprint(request):
    return render(request, "pages/impressum.html", build_base_context(request))


def donate(request):
    """Keep old donation bookmarks usable without exposing the hidden page."""
    return redirect("pages:projects_page_no_slash")


def register(request):
    already_logged_in = request.user.is_authenticated
    if request.method == "POST":
        form = RegistrationForm(request.POST, request.FILES)
        try:
            if form.is_valid():
                user = form.save()
                activation_url = build_email_verification_url(user)
                if not send_account_verification_email(user, activation_url):
                    user.delete()
                    raise ValidationError(
                        "Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen."
                    )
                reg_msg = (
                    "Registrierung erfolgreich. Bitte bestätigen Sie jetzt Ihre E-Mail-Adresse über den Link in der E-Mail."
                )
                messages.success(request, reg_msg)
                login_url = reverse("pages:login")
                return redirect(f"{login_url}?email={quote(user.email)}")
        except ValidationError as exc:
            form.add_error(None, exc.message or str(exc) or "Ungültige Eingabe.")
        except Exception as exc:
            logger.error("Registration failed: %s", exc, exc_info=True)
            form.add_error(
                None,
                "Registrierung gerade nicht möglich. Bitte später erneut versuchen.",
            )
    else:
        form = RegistrationForm()
    context = build_base_context(request)
    context["form"] = form
    context["already_logged_in"] = already_logged_in
    return render(request, "pages/register.html", context)


@require_GET
@never_cache
def verify_email(request, uidb64, token):
    try:
        user_id = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if not user or not email_verification_token_generator.check_token(user, token):
        messages.error(
            request,
            "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte registrieren Sie sich erneut.",
        )
        return redirect("pages:register")

    user.is_active = True
    user.save(update_fields=["is_active"])
    cache.delete("footer_user_stats_v2")
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    initialize_authenticated_session(request, user, reset_activity=True)
    messages.success(
        request,
        "Ihre E-Mail-Adresse wurde bestätigt. Sie sind jetzt eingeloggt.",
    )
    return redirect("pages:home")


def build_session_response_payload(request, authenticated: bool, reason: str = "") -> dict:
    login_url = reverse("pages:login")
    login_target = login_url
    login_params = {}
    if reason == SESSION_IDLE_TIMEOUT_REASON:
        login_target = reverse("pages:home")
        login_params["reason"] = "idle"

    current_path = request.get_full_path()
    if login_target == login_url and current_path and request.path != login_url:
        login_params["next"] = current_path

    if login_params:
        login_target = f"{login_target}?{urlencode(login_params)}"

    payload = {
        "authenticated": authenticated,
        "idleTimeoutSeconds": get_session_idle_timeout_seconds(),
        "loginUrl": login_target,
    }
    if reason:
        payload["reason"] = reason
    return payload


def maybe_add_idle_timeout_message(request) -> None:
    if request.method != "GET":
        return
    if request.GET.get("reason") != "idle":
        return

    lang = get_preferred_language(request)
    timeout_minutes = max(1, get_session_idle_timeout_seconds() // 60)
    if lang == "de":
        message = (
            f"Sie wurden nach {timeout_minutes} Minuten Inaktivität "
            "automatisch auf allen Geräten abgemeldet."
        )
    else:
        message = (
            f"Вы были автоматически выведены со всех устройств "
            f"после {timeout_minutes} минут бездействия."
        )
    messages.warning(request, message)


def get_safe_login_redirect(request) -> str:
    candidate = (
        (request.POST.get("next") if request.method == "POST" else None)
        or request.GET.get("next")
        or ""
    ).strip()

    if candidate and url_has_allowed_host_and_scheme(
        candidate,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return candidate

    return reverse("pages:home")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("pages:home")
    maybe_add_idle_timeout_message(request)
    form = LoginForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.get_user()
        login(request, user)
        initialize_authenticated_session(request, user, reset_activity=True)
        request.session.set_expiry(0)
        lang = get_preferred_language(request)
        login_msg = (
            "Login erfolgreich. Willkommen zurück!"
            if lang == "de"
            else "Вы успешно вошли. Добро пожаловать!"
        )
        messages.success(request, login_msg)
        return redirect(get_safe_login_redirect(request))
    context = build_base_context(request)
    context["form"] = form
    context["login_next"] = request.GET.get("next", "")
    return render(request, "pages/login.html", context)


def logout_view(request):
    logout(request)
    return redirect("pages:home")


@require_GET
@never_cache
def session_status_api(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            build_session_response_payload(request, authenticated=False),
            status=401,
        )

    session_state = check_authenticated_session(request)
    if session_state and not session_state.valid:
        logout(request)
        return JsonResponse(
            build_session_response_payload(
                request,
                authenticated=False,
                reason=session_state.reason,
            ),
            status=401,
        )

    profile = initialize_authenticated_session(request, request.user)
    payload = build_session_response_payload(request, authenticated=True)
    payload["expiresInSeconds"] = get_remaining_session_seconds(profile)
    return JsonResponse(payload)


@require_POST
@csrf_protect
@never_cache
def session_activity_api(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            build_session_response_payload(request, authenticated=False),
            status=401,
        )

    session_state = check_authenticated_session(request)
    if session_state and not session_state.valid:
        logout(request)
        return JsonResponse(
            build_session_response_payload(
                request,
                authenticated=False,
                reason=session_state.reason,
            ),
            status=401,
        )

    profile = touch_user_activity(request.user)
    request.session[SESSION_GENERATION_SESSION_KEY] = int(profile.session_generation or 0)
    payload = build_session_response_payload(request, authenticated=True)
    payload["expiresInSeconds"] = get_remaining_session_seconds(profile)
    return JsonResponse(payload)


@login_required
@csrf_protect
def delete_account(request):
    """
    Ermöglicht angemeldeten Nutzer:innen, ihr Konto selbst zu löschen.
    """
    if request.method == "POST":
        user_id = request.user.pk
        logout(request)
        User.objects.filter(pk=user_id).delete()
        cache.delete("footer_user_stats_v2")
        messages.success(request, "Ihr Konto wurde endgültig gelöscht.")
        return redirect("pages:home")
    context = build_base_context(request)
    return render(request, "pages/delete_account.html", context)


@login_required
def apply_interpreter(request):
    latest = (
        InterpreterApplication.objects.filter(
            user=request.user).order_by("-created_at").first()
    )
    submitted = False
    if request.method == "POST":
        form = InterpreterApplicationForm(request.POST, request.FILES)
        if form.is_valid():
            application = form.save(commit=False)
            application.user = request.user
            application.save()
            # Optional Profilfoto speichern
            image = form.cleaned_data.get("image")
            if image:
                profile, _ = Profile.objects.get_or_create(user=request.user)
                profile.image_data = image.read()
                profile.image_mime = getattr(image, "content_type", "") or ""
                profile.image_name = getattr(image, "name", "") or ""
                profile.save()
            notify_interpreter_application(application)
            submitted = True
            latest = application
            form = InterpreterApplicationForm()
    else:
        form = InterpreterApplicationForm()

    context = build_base_context(request)
    context.update(
        {
            "form": form,
            "latest_application": latest,
            "submitted": submitted,
        }
    )
    return render(request, "pages/apply.html", context)


@login_required
def edit_interpreter_profile(request):
    """
    Ermöglicht Dolmetscher:innen, ihre Bewerbungs-/Profilangaben zu bearbeiten.
    Nutzt die jüngste Bewerbung des Accounts.
    """
    app = (
        InterpreterApplication.objects.filter(user=request.user)
        .order_by("-created_at")
        .first()
    )
    if not app:
        messages.info(request, "Bitte zuerst eine Bewerbung anlegen.")
        return redirect("pages:apply_interpreter")

    if request.method == "POST":
        form = InterpreterApplicationForm(request.POST, request.FILES, instance=app)
        if form.is_valid():
            updated = form.save(commit=False)
            updated.user = request.user
            updated.save()
            image = form.cleaned_data.get("image")
            if image:
                profile, _ = Profile.objects.get_or_create(user=request.user)
                profile.image_data = image.read()
                profile.image_mime = getattr(image, "content_type", "") or ""
                profile.image_name = getattr(image, "name", "") or ""
                profile.save()
            messages.success(request, "Profil aktualisiert.")
            return redirect("pages:edit_interpreter_profile")
    else:
        form = InterpreterApplicationForm(instance=app)

    context = build_base_context(request)
    context.update(
        {
            "form": form,
            "application": app,
        }
    )
    return render(request, "pages/interpreter_profile_edit.html", context)


@login_required
def interpreter_dashboard(request):
    """
    Einfaches Dashboard für Dolmetscher:innen.
    Zeigt Links zu Profilbearbeitung und den persönlichen Kalenderfeed.
    """
    if not user_is_interpreter(request.user):
        messages.error(
            request,
            "Dashboard ist nur für freigeschaltete Dolmetscher:innen verfügbar.",
        )
        return redirect("pages:apply_interpreter")

    interpreter_events_url = f"{reverse('pages:events_json')}?interpreter={request.user.id}"
    appt_form = AppointmentQuickForm()
    day_form = UnavailableDayForm()

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "reply_contact":
            contact_key = str(request.POST.get("contact_key") or "").strip()
            reply_text = str(request.POST.get("reply_text") or "").strip()
            contact_book_entries = build_contact_book_entries()
            selected_entry = next(
                (entry for entry in contact_book_entries if entry["key"] == contact_key),
                None,
            )
            if not selected_entry:
                messages.error(request, "Kontakt konnte nicht gefunden werden.")
                return redirect("pages:interpreter_dashboard")
            if not reply_text:
                messages.error(request, "Bitte eine Nachricht eingeben.")
                return redirect(
                    f"{reverse('pages:interpreter_dashboard')}?contact={contact_key}#contactBook"
                )
            latest_client_hash = selected_entry.get("latest_client_hash", "")
            if not latest_client_hash:
                messages.error(request, "Kontakt hat noch keinen gültigen Antwort-Kanal.")
                return redirect("pages:interpreter_dashboard")
            ChatReply.objects.create(
                client_hash=latest_client_hash,
                text=reply_text,
            )
            if selected_entry.get("user"):
                ChatMessage.objects.filter(
                    user=selected_entry["user"], handled=False
                ).update(handled=True)
            else:
                ChatMessage.objects.filter(
                    user__isnull=True,
                    client_hash=latest_client_hash,
                    handled=False,
                ).update(handled=True)
            messages.success(
                request,
                "Antwort gespeichert. Sie wird beim nächsten Nachrichtenabruf zugestellt.",
            )
            return redirect(
                f"{reverse('pages:interpreter_dashboard')}?contact={contact_key}#contactBook"
            )
        elif action == "add_appointment":
            appt_form = AppointmentQuickForm(request.POST)
            if appt_form.is_valid():
                appt = appt_form.save(commit=False)
                appt.interpreter = request.user
                appt.username = request.user.get_full_name() or request.user.username
                appt.save()
                messages.success(request, "Terminblock gespeichert.")
                return redirect("pages:interpreter_dashboard")
        elif action == "edit_appointment":
            appt_id = request.POST.get("appointment_id")
            appt = get_object_or_404(Appointment, id=appt_id, interpreter=request.user)
            appt_form = AppointmentQuickForm(request.POST, instance=appt)
            if appt_form.is_valid():
                updated = appt_form.save(commit=False)
                updated.interpreter = request.user
                updated.username = request.user.get_full_name() or request.user.username
                updated.save()
                messages.success(request, "Termin aktualisiert.")
                return redirect("pages:interpreter_dashboard")
            else:
                messages.error(request, "Termin konnte nicht aktualisiert werden – bitte Eingaben prüfen.")
        elif action == "delete_appointment":
            appt_id = request.POST.get("appointment_id")
            appt = get_object_or_404(Appointment, id=appt_id, interpreter=request.user)
            appt.delete()
            messages.success(request, "Termin gelöscht.")
            return redirect("pages:interpreter_dashboard")
        elif action == "add_unavailable":
            day_form = UnavailableDayForm(request.POST)
            if day_form.is_valid():
                day = day_form.save(commit=False)
                day.interpreter = request.user
                day.save()
                messages.success(request, "Tag als nicht verfügbar markiert.")
                return redirect("pages:interpreter_dashboard")
        elif action == "edit_unavailable":
            day_id = request.POST.get("day_id")
            day = get_object_or_404(UnavailableDay, id=day_id, interpreter=request.user)
            day_form = UnavailableDayForm(request.POST, instance=day)
            if day_form.is_valid():
                day_form.save()
                messages.success(request, "Sperrung aktualisiert.")
                return redirect("pages:interpreter_dashboard")
            else:
                messages.error(request, "Sperrung konnte nicht aktualisiert werden – bitte Eingaben prüfen.")
        elif action == "delete_unavailable":
            day_id = request.POST.get("day_id")
            day = get_object_or_404(UnavailableDay, id=day_id, interpreter=request.user)
            day.delete()
            messages.success(request, "Sperrung gelöscht.")
            return redirect("pages:interpreter_dashboard")

    today = timezone.localdate()
    upcoming_appointments = (
        Appointment.objects.filter(interpreter=request.user, date__gte=today)
        .order_by("date", "start_time")
    )
    blocked_days = (
        UnavailableDay.objects.filter(interpreter=request.user, date__gte=today)
        .order_by("date")
    )
    appointment_count = upcoming_appointments.count()
    blocked_count = blocked_days.count()
    week_cutoff = today + timedelta(days=6)
    week_appointment_count = upcoming_appointments.filter(date__lte=week_cutoff).count()
    week_blocked_count = blocked_days.filter(date__lte=week_cutoff).count()
    contact_book = build_contact_book_entries()
    open_contact_count = sum(1 for entry in contact_book if entry.get("open_count"))
    open_message_count = sum(int(entry.get("open_count") or 0) for entry in contact_book)
    selected_contact = None
    contact_thread = []
    selected_contact_id = str(request.GET.get("contact") or "").strip()
    next_appointment = upcoming_appointments.first()

    schedule_items = [
        {
            "kind": "appointment",
            "id": item.id,
            "date": item.date,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "title": item.subject or "Belegt",
            "subject": item.subject or "",
            "note": item.note or "",
        }
        for item in upcoming_appointments
    ]
    schedule_items.extend(
        {
            "kind": "blocked",
            "id": day.id,
            "date": day.date,
            "start_time": None,
            "end_time": None,
            "title": "Tag gesperrt",
            "subject": "",
            "note": day.note or "",
        }
        for day in blocked_days
    )
    schedule_items.sort(
        key=lambda item: (
            item["date"],
            item["start_time"] or time.min,
            0 if item["kind"] == "blocked" else 1,
        )
    )
    next_entry = schedule_items[0] if schedule_items else None

    if contact_book:
        selected_contact = next(
            (
                entry for entry in contact_book
                if entry["key"] == selected_contact_id
            ),
            contact_book[0],
        )
        contact_thread, _ = build_contact_book_thread(selected_contact)

    context = build_base_context(request)
    context.update(
        {
            "interpreter_events_url": interpreter_events_url,
            "appointment_form": appt_form,
            "unavailable_form": day_form,
            "upcoming_appointments": upcoming_appointments,
            "blocked_days": blocked_days,
            "schedule_items": schedule_items,
            "appointment_count": appointment_count,
            "blocked_count": blocked_count,
            "week_appointment_count": week_appointment_count,
            "week_blocked_count": week_blocked_count,
            "next_appointment": next_appointment,
            "next_entry": next_entry,
            "contact_book": contact_book,
            "open_contact_count": open_contact_count,
            "open_message_count": open_message_count,
            "selected_contact": selected_contact,
            "contact_thread": contact_thread,
        }
    )
    return render(request, "pages/interpreter_dashboard.html", context)


def interpreter_list(request):
    """
    Leitet die frühere Dolmetscher-Seite auf den Leistungsbereich der Startseite um.
    """
    return redirect(f"{reverse('pages:home')}#leistungen")


@require_http_methods(["GET", "POST"])
@csrf_protect
def contact_redirect(request):
    """
    Eigenständige Kontaktseite für Projektanfragen und rechtliche Footer-Links.
    """
    lang = get_preferred_language(request)
    if request.method == "POST":
        if contact_rate_limited(request):
            return render(request, "429.html", {
                "status_code": 429,
                "error_title": "Zu viele Anfragen",
                "error_message": "Bitte warten Sie kurz und versuchen Sie es danach erneut.",
            }, status=429)
        contact_form = ContactRequestForm(request.POST, request.FILES)
        if contact_form.is_valid():
            if contact_duplicate_submission(contact_form):
                messages.error(request, "Diese Anfrage wurde gerade bereits gesendet.")
                return redirect("pages:contact")
            store_contact_request(request, contact_form, lang)
            messages.success(
                request,
                "Danke. Ihre Anfrage wurde gespeichert. Ich prüfe sie und melde mich zurück.",
            )
            return redirect("pages:contact")
    else:
        contact_form = ContactRequestForm()

    context = build_base_context(request)
    context["contact_form"] = contact_form
    return render(request, "pages/kontakt.html", context)

@require_GET
def contact_action_redirect(request, action):
    return ContactActionRedirect(resolve_contact_action_target(action))


@login_required
def profile_page(request):
    """
    Zeigt Nutzerdaten und ergänzt Dokumentenablage, internes Postfach,
    Rückrufwünsche sowie Benachrichtigungseinstellungen.
    """
    profile, _ = Profile.objects.get_or_create(user=request.user)
    applications = (
        InterpreterApplication.objects.filter(user=request.user)
        .order_by("-created_at")
    )
    account_documents = AccountDocument.objects.filter(user=request.user)
    callback_requests = CallbackRequest.objects.filter(user=request.user)
    mailbox_hash, mailbox_timeline = build_profile_mailbox_timeline(request.user)
    account_form = UserAccountForm(instance=request.user, prefix="account")
    user_uploads_enabled = getattr(settings, "USER_UPLOADS_ENABLED", False)
    image_form = ProfileImageForm(prefix="image") if user_uploads_enabled else None
    document_form = AccountDocumentForm(prefix="document") if user_uploads_enabled else None
    mailbox_form = AccountMailboxForm(prefix="mailbox")
    callback_form = CallbackRequestForm(
        prefix="callback",
        initial={
            "phone": profile.callback_phone,
            "time_windows": profile.callback_time_windows,
        },
    )
    notifications_form = NotificationPreferencesForm(
        instance=profile,
        prefix="notifications",
    )

    if request.method == "POST":
        if "account_submit" in request.POST:
            account_form = UserAccountForm(request.POST, instance=request.user, prefix="account")
            if account_form.is_valid():
                account_form.save()
                messages.success(request, "Ihre Kontodaten wurden aktualisiert.")
                return redirect("pages:profile")
        elif "image_submit" in request.POST:
            wants_image_removal = request.POST.get("image-remove_image") == "on"
            if not user_uploads_enabled and not wants_image_removal:
                messages.error(request, "Uploads sind derzeit deaktiviert.")
                return redirect("pages:profile")
            image_form = ProfileImageForm(request.POST, request.FILES, prefix="image")
            if image_form.is_valid():
                image = image_form.cleaned_data.get("image")
                remove_image = image_form.cleaned_data.get("remove_image")
                if image and user_uploads_enabled:
                    profile.image_data = image.read()
                    profile.image_mime = getattr(image, "content_type", "") or ""
                    profile.image_name = getattr(image, "name", "") or ""
                    profile.save()
                elif remove_image:
                    profile.image_data = None
                    profile.image_mime = ""
                    profile.image_name = ""
                    profile.save()
                messages.success(request, "Ihr Profilbild wurde aktualisiert.")
                return redirect("pages:profile")
        elif "document_submit" in request.POST:
            if not user_uploads_enabled:
                messages.error(request, "Uploads sind derzeit deaktiviert.")
                return redirect("pages:profile")
            document_form = AccountDocumentForm(request.POST, request.FILES, prefix="document")
            if document_form.is_valid():
                uploaded = document_form.cleaned_data["file"]
                document = AccountDocument.objects.create(
                    user=request.user,
                    title=document_form.cleaned_data.get("title", ""),
                    note=document_form.cleaned_data.get("note", ""),
                    file_data=uploaded.read(),
                    file_name=getattr(uploaded, "name", "") or "dokument",
                    file_mime=getattr(uploaded, "content_type", "") or "",
                    file_size=getattr(uploaded, "size", 0) or 0,
                )
                notify_service_team(
                    "[Beirit Digital] Neues Kontodokument",
                    (
                        f"Benutzer: {request.user.email or request.user.username}\n"
                        f"Dokument: {document.title or document.file_name}\n"
                        f"Datei: {document.file_name}\n"
                        f"Größe: {document.file_size} Bytes"
                    ),
                )
                messages.success(request, "Dokument gespeichert.")
                return redirect("pages:profile")
        elif "document_delete_submit" in request.POST:
            document_id = request.POST.get("document_id")
            document = get_object_or_404(AccountDocument, pk=document_id, user=request.user)
            document.delete()
            messages.success(request, "Dokument entfernt.")
            return redirect("pages:profile")
        elif "application_delete_submit" in request.POST:
            application_id = request.POST.get("application_id")
            application = get_object_or_404(
                InterpreterApplication,
                pk=application_id,
                user=request.user,
            )
            application.delete()
            messages.success(request, "Bewerbung zurückgezogen.")
            return redirect("pages:profile")
        elif "mailbox_submit" in request.POST:
            mailbox_form = AccountMailboxForm(request.POST, prefix="mailbox")
            if mailbox_form.is_valid():
                ChatMessage.objects.create(
                    lang=get_preferred_language(request),
                    user=request.user,
                    contact_email=request.user.email or "",
                    client_hash=mailbox_hash,
                    text=mailbox_form.cleaned_data["text"],
                    handled=False,
                )
                notify_service_team(
                    "[Beirit Digital] Neue Kontonachricht",
                    (
                        f"Benutzer: {request.user.email or request.user.username}\n"
                        f"Nachricht:\n{mailbox_form.cleaned_data['text']}"
                    ),
                )
                messages.success(request, "Nachricht im Postfach gespeichert.")
                return redirect("pages:profile")
        elif "callback_submit" in request.POST:
            callback_form = CallbackRequestForm(request.POST, prefix="callback")
            if callback_form.is_valid():
                callback_request = callback_form.save(commit=False)
                callback_request.user = request.user
                callback_request.save()
                profile.callback_phone = callback_request.phone
                profile.callback_time_windows = callback_request.time_windows
                profile.save(update_fields=["callback_phone", "callback_time_windows"])
                notify_service_team(
                    "[Beirit Digital] Neuer Rückrufwunsch",
                    (
                        f"Benutzer: {request.user.email or request.user.username}\n"
                        f"Telefon: {callback_request.phone}\n"
                        f"Zeitfenster: {callback_request.time_windows}\n"
                        f"Hinweis: {callback_request.note or '-'}"
                    ),
                )
                messages.success(request, "Rückrufwunsch gespeichert.")
                return redirect("pages:profile")
        elif "callback_delete_submit" in request.POST:
            callback_id = request.POST.get("callback_id")
            callback_request = get_object_or_404(
                CallbackRequest,
                pk=callback_id,
                user=request.user,
            )
            callback_request.delete()
            messages.success(request, "Rückrufwunsch zurückgezogen.")
            return redirect("pages:profile")
        elif "notifications_submit" in request.POST:
            notifications_form = NotificationPreferencesForm(
                request.POST,
                instance=profile,
                prefix="notifications",
            )
            if notifications_form.is_valid():
                notifications_form.save()
                messages.success(request, "Benachrichtigungseinstellungen gespeichert.")
                return redirect("pages:profile")
    context = build_base_context(request)
    context.update(
        {
            "profile": profile,
            "applications": applications,
            "account_documents": account_documents,
            "callback_requests": callback_requests,
            "mailbox_timeline": mailbox_timeline,
            "account_form": account_form,
            "profile_form": image_form,
            "document_form": document_form,
            "user_uploads_enabled": user_uploads_enabled,
            "mailbox_form": mailbox_form,
            "callback_form": callback_form,
            "notifications_form": notifications_form,
        }
    )
    return render(request, "pages/profile.html", context)


@login_required
@require_GET
def account_document_download(request, document_id):
    document = get_object_or_404(AccountDocument, pk=document_id, user=request.user)
    response = HttpResponse(
        document.file_data,
        content_type=document.file_mime or "application/octet-stream",
    )
    response["Content-Length"] = str(document.file_size or len(document.file_data or b""))
    response["Content-Disposition"] = f'attachment; filename="{document.file_name}"'
    return response


@require_POST
def upload_document(request):
    """
    Akzeptiert eine oder mehrere Dateien und sendet sie per E-Mail weiter.
    Der Upload ist auf erlaubte Typen und Größe begrenzt.
    """
    if not getattr(settings, "USER_UPLOADS_ENABLED", False):
        raise Http404()
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "auth_required"}, status=403)
        uploaded_files = list(request.FILES.getlist("file"))
        if not uploaded_files:
            return JsonResponse({"error": "no_file"}, status=400)
        upload_settings = build_upload_settings()

        for uploaded in uploaded_files:
            error_key, status_code = validate_uploaded_file(
                uploaded, upload_settings)
            if error_key:
                return JsonResponse({"error": error_key}, status=status_code)

        availability_error = get_upload_availability_error()
        if availability_error:
            return JsonResponse({"error": availability_error}, status=503)

        if not upload_settings.recipient or not settings.EMAIL_HOST:
            return JsonResponse({"error": "email_not_configured"}, status=503)

        lang = (request.POST.get("lang", "") or "").lower()
        allowed_langs = {"de", "ru", "en", "uk"}
        if lang and lang not in allowed_langs:
            return friendly_error_response()

        topic = request.POST.get("topic", "")
        files_meta = []
        attachments = []
        for uploaded in uploaded_files:
            filename = uploaded.name
            content_type = uploaded.content_type or "-"
            size_bytes = uploaded.size
            files_meta.append(
                {"name": filename, "type": content_type, "size": size_bytes})
            attachments.append((filename, uploaded.read(
            ), uploaded.content_type or "application/octet-stream"))

        subject = build_upload_subject(lang, topic)
        body = format_mail_body_multi(lang, topic, files_meta)

        if not safe_send_mail_with_attachment(
            subject=subject,
            body=body,
            from_email=upload_settings.from_email,
            to=[upload_settings.recipient],
            attachment=attachments,
        ):
            return friendly_error_response()

        return JsonResponse({"ok": True})
    except RequestDataTooBig:
        return JsonResponse({"error": "too_large"}, status=413)
    except Exception as exc:
        logger.warning("Upload failed unexpectedly: %s", exc, exc_info=True)
        return friendly_error_response()


@require_GET
@never_cache
def events_json(request):
    """
    Liefert die Termine aus der Datenbank als Event-Liste für den Kalender.
    Für anonyme Nutzer werden nur Basisinfos (Busy-Slots) ausgegeben.
    """
    include_private = request.user.is_authenticated
    interpreter_ids = parse_interpreter_ids(request.GET.getlist("interpreter"))
    if interpreter_ids:
        batch_payload = build_calendar_payload(
            include_private=include_private,
            interpreter_ids=interpreter_ids[:1],
        )
        interpreter_key = str(interpreter_ids[0])
        calendar = batch_payload["calendars"].get(interpreter_key, {"events": [], "days": {}})
        payload = {
            "events": calendar["events"],
            "days": {
                **batch_payload.get("shared_days", {}),
                **calendar.get("days", {}),
            },
        }
    else:
        payload = build_calendar_payload(
            include_private=include_private,
            interpreter_ids=None,
        )
    return JsonResponse(payload, json_dumps_params={"ensure_ascii": False})


@require_GET
@never_cache
def events_batch_json(request):
    """
    Liefert Kalenderdaten gebündelt für mehrere Dolmetscher:innen in einer Antwort.
    """
    interpreter_ids = parse_interpreter_ids(request.GET.getlist("interpreter"))
    payload = build_calendar_payload(
        include_private=request.user.is_authenticated,
        interpreter_ids=interpreter_ids,
    )
    return JsonResponse(payload, json_dumps_params={"ensure_ascii": False})


def build_upload_settings() -> UploadSettings:
    """
    Liefert die Upload-Restriktionen und Zieladressen aus den Settings.
    """
    allowed_types = getattr(
        settings,
        "UPLOAD_ALLOWED_TYPES",
        {"application/pdf", "image/png", "image/jpeg"},
    )
    allowed_set = {str(item).lower() for item in (allowed_types or [])}
    max_bytes = int(getattr(settings, "UPLOAD_MAX_BYTES", 25 * 1024 * 1024))
    recipient = (
        getattr(settings, "UPLOAD_EMAIL_TO", "")
        or getattr(settings, "CONTACT_EMAIL", "")
        or getattr(settings, "EMAIL_HOST_USER", "")
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL",
                         settings.EMAIL_HOST_USER)
    return UploadSettings(
        allowed_types=allowed_set,
        max_bytes=max_bytes,
        recipient=recipient,
        from_email=from_email,
    )


def build_contact_details(user=None):
    """
    Liefert bewusst keine sensiblen Kontaktdaten für das DOM.
    """
    return {
        "email": "",
        "phone_signal": "",
        "phone_landline": "",
        "availability": "",
        "region": "",
    }


def _sanitize_phone(value: str) -> str:
    return str(value or "").replace(" ", "").replace("-", "")


def build_imprint_details() -> dict[str, object]:
    """Zentrale, öffentlich auszugebende Anbieterangaben."""
    site_config = getattr(settings, "SITE_CONFIG", {}) or {}
    value = lambda key: str(site_config.get(key, "") or "").strip()
    street_address = value("street")
    postal_code = value("postal_code")
    phone = value("phone")
    activity_items = [
        item.strip() for item in value("activity").split(";") if item.strip()
    ]
    tax_notice_lines = [
        f"{item.strip()}."
        for item in value("tax_notice").split(".")
        if item.strip()
    ]
    return {
        "business_name": value("business_name"),
        "owner_name": value("owner_name"),
        "responsible_person": value("responsible_person") or value("owner_name"),
        "business_type": value("legal_form"),
        "street_address": street_address,
        "street_is_placeholder": not street_address,
        "postal_code": postal_code,
        "postal_is_placeholder": not postal_code,
        "city": value("city"),
        "country": value("country"),
        "email": value("email"),
        "phone": phone,
        "phone_href": _sanitize_phone(phone),
        "activity_items": activity_items,
        "tax_notice_lines": tax_notice_lines,
        "tax_id": value("tax_id"),
        "trade_authority": value("register_authority"),
        "registration_date": value("register_date"),
        "activity_start_date": value("business_start_date"),
        "register_name": value("register_name"),
        "register_number": value("register_number"),
        "vat_id": value("vat_id"),
        "economic_id": value("economic_id"),
        "supervisory_authority": value("supervisory_authority"),
        "dispute_resolution_notice": value("dispute_resolution_notice"),
        "has_address": bool(street_address or postal_code or value("city")),
    }


def _iter_chat_contact_settings():
    for index, item in enumerate(getattr(settings, "CHAT_CONTACTS", []) or []):
        label = str(item.get("label", "") or "").strip()
        url = str(item.get("url", "") or "").strip()
        hint = str(item.get("hint", "") or "").strip()
        if not label or not url:
            continue
        yield index, label, url, hint


def build_contact_actions(user=None):
    """
    Liefert interne Aktions-Links statt echter Kontaktziele.
    """
    actions = {}
    if getattr(settings, "CONTACT_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", ""):
        actions["email"] = reverse("pages:contact_action", kwargs={"action": "email"})

    if getattr(settings, "CONTACT_PHONE_LANDLINE", ""):
        actions["landline"] = reverse("pages:contact_action", kwargs={"action": "landline"})

    return actions


def build_chat_contacts(user=None):
    """
    Liefert Messenger-Kontakte nur mit internen Aktions-Links.
    """
    contacts = []
    for index, label, _url, hint in _iter_chat_contact_settings():
        if label.casefold() in {"signal", "telegram", "whatsapp", "proton"}:
            continue
        contacts.append(
            {
                "label": label,
                "hint": hint,
                "action_url": reverse("pages:contact_action", kwargs={"action": f"chat-{index}"}),
            }
        )
    return contacts


def resolve_contact_action_target(action: str) -> str:
    email = getattr(settings, "CONTACT_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")

    if action == "email" and email:
        return f"mailto:{quote(email)}"

    if action == "landline":
        phone_landline = _sanitize_phone(getattr(settings, "CONTACT_PHONE_LANDLINE", ""))
        if phone_landline:
            return f"tel:{phone_landline}"

    if action.startswith("chat-"):
        try:
            index = int(action.split("-", 1)[1])
        except (TypeError, ValueError):
            raise Http404("Unknown contact action")

        for candidate_index, _label, url, _hint in _iter_chat_contact_settings():
            if candidate_index == index:
                return url

    raise Http404("Unknown contact action")


def notify_interpreter_application(application: InterpreterApplication):
    """
    Schickt eine Benachrichtigung bei neuer Dolmetscher:innen-Bewerbung.
    """
    try:
        to_email = getattr(settings, "CONTACT_EMAIL",
                           "") or settings.DEFAULT_FROM_EMAIL
        if not to_email or not settings.EMAIL_HOST:
            return

        subject = "[Beirit Digital] Neue Dolmetscher-Bewerbung"
        body = (
            f"E-Mail: {application.user.email}\\n"
            f"Sprachen: {application.languages}\\n"
            f"Region: {application.region}\\n"
            f"Erfahrung: {application.experience}\\n"
            f"Verfügbarkeit: {application.availability}\\n"
            f"Kurzbeschreibung:\\n{application.motivation}\\n"
        )
        send_notification_email(
            subject, body, to_email, from_email=settings.DEFAULT_FROM_EMAIL or to_email)
    except Exception as exc:
        logger.warning(
            "Could not notify interpreter application: %s", exc, exc_info=True)


def notify_service_team(subject: str, body: str) -> None:
    """
    Sendet eine interne Hinweis-Mail an die hinterlegte Kontaktadresse.
    """
    try:
        to_email = (
            getattr(settings, "CONTACT_EMAIL", "")
            or getattr(settings, "DEFAULT_FROM_EMAIL", "")
            or getattr(settings, "EMAIL_HOST_USER", "")
        )
        if not to_email:
            return
        send_notification_email(
            subject,
            body,
            to_email,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "") or to_email,
        )
    except Exception as exc:
        logger.warning("Service notification failed: %s", exc, exc_info=True)


def notify_user_about_document_upload(document: AccountDocument) -> None:
    user = document.user
    if not user.email:
        return
    subject = "Neues Dokument in Ihrem Konto gespeichert"
    body = (
        "Ein neues Dokument wurde in Ihrem Konto gespeichert.\n\n"
        f"Titel: {document.title or document.file_name}\n"
        f"Datei: {document.file_name}\n"
        f"Hochgeladen am: {timezone.localtime(document.created_at):%d.%m.%Y %H:%M}\n\n"
        "Sie können das Dokument nach dem Login im Bereich \"Mein Konto\" aufrufen."
    )
    send_notification_email(subject, body, user.email)


def notify_user_about_mailbox_message(user: User, message_title: str, text: str, *, kind: str) -> None:
    profile = getattr(user, "profile", None)
    if not user.email or not profile:
        return
    if kind == "reply" and not profile.notify_new_reply:
        return
    if kind == "message" and not profile.notify_new_message:
        return
    subject = message_title
    body = (
        f"{message_title}\n\n"
        f"{text}\n\n"
        f"Zum Postfach: {build_absolute_site_url(reverse('pages:profile'))}"
    )
    send_notification_email(subject, body, user.email)


def notify_user_about_callback_update(callback_request: CallbackRequest) -> None:
    user = callback_request.user
    profile = getattr(user, "profile", None)
    if not user.email or not profile or not profile.notify_appointment_changes:
        return
    when = (
        timezone.localtime(callback_request.scheduled_for).strftime("%d.%m.%Y %H:%M")
        if callback_request.scheduled_for
        else "Noch kein fester Termin"
    )
    subject = "Aktualisierung zu Ihrem Rückrufwunsch"
    body = (
        "Es gibt ein Update zu Ihrem Rückrufwunsch.\n\n"
        f"Status: {callback_request.get_status_display()}\n"
        f"Geplant für: {when}\n"
        f"Hinweis: {callback_request.note or 'Kein zusätzlicher Hinweis'}\n\n"
        f"Zum Konto: {build_absolute_site_url(reverse('pages:profile'))}"
    )
    send_notification_email(subject, body, user.email)


def validate_uploaded_file(uploaded, cfg: UploadSettings) -> Tuple[Optional[str], int]:
    """
    Validiert die hochgeladene Datei und liefert (error_key, status_code).
    """
    if not uploaded:
        return "no_file", 400
    if (uploaded.content_type or "").lower() not in cfg.allowed_types:
        return "invalid_type", 400
    if uploaded.size > cfg.max_bytes:
        return "too_large", 400
    return None, 200


def build_upload_subject(lang: str, topic: str) -> str:
    """
    Einheitlicher Betreff für Upload-Mails.
    """
    return f"[ENBT Upload] {topic or 'Dokument'} ({lang or 'n/a'})"


def safe_send_mail_with_attachment(subject, body, from_email, to, attachment):
    """
    Send email with one or multiple attachments. Returns bool; logs warnings on failure.
    """
    connection = None
    try:
        connection = get_connection(
            backend=settings.EMAIL_BACKEND,
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=getattr(settings, "EMAIL_USE_TLS", False),
            use_ssl=getattr(settings, "EMAIL_USE_SSL", False),
            timeout=15,
        )
        if isinstance(connection, BaseEmailBackend):
            connection.open()
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=from_email,
            to=to,
            connection=connection,
        )
        if attachment:
            attachments = attachment if isinstance(
                attachment, (list, tuple)) else [attachment]
            for item in attachments:
                if not item:
                    continue
                try:
                    name, content, content_type = item
                except ValueError:
                    # Skip malformed attachment entries
                    continue
                email.attach(name, content, content_type)
        email.send(fail_silently=False)
        return True
    except (SMTPException, Exception) as exc:
        logger.warning("Upload send failed: %s", exc, exc_info=True)
        return False
    finally:
        try:
            if connection and hasattr(connection, "close"):
                connection.close()
        except Exception:
            pass


def format_mail_body_multi(lang, topic, files):
    """
    Sprachabhängiges Template für Upload-Mails mit mehreren Dateien.
    """
    templates = {
        "de": "Neue Uploads über das Kontaktformular.\n\nSprache: {lang}\nThema: {topic}\nDateien:\n{files}\n",
        "ru": "Новые загрузки через контактную форму.\n\nЯзык: {lang}\nТема: {topic}\nФайлы:\n{files}\n",
        "uk": "Нові завантаження через контактну форму.\n\nМова: {lang}\nТема: {topic}\nФайли:\n{files}\n",
        "en": "New uploads via the contact form.\n\nLanguage: {lang}\nTopic: {topic}\nFiles:\n{files}\n",
    }
    template = templates.get((lang or "").lower(), templates["en"])
    file_lines = []
    for f in files or []:
        file_lines.append(
            f"- {f.get('name') or '-'} ({f.get('type') or '-'}, {f.get('size') or 0} Bytes)"
        )
    files_text = "\n".join(file_lines) if file_lines else "- keine Dateien -"
    return template.format(
        lang=lang or "-",
        topic=topic or "-",
        files=files_text,
    )


def friendly_error_response():
    """
    Einheitliche, freundliche Fehlermeldung bei unerwarteten Eingaben/Sprachen.
    """
    return JsonResponse(
        {
            "error": "please_try_again",
            "message": "Wir schrauben kurz am Server 😊 Bitte später nochmal probieren.",
        },
        status=503,
    )


def get_preferred_language(request):
    """
    Wählt Deutsch, Russisch oder Ukrainisch nach Browser-Sprache.
    """
    header = (request.META.get("HTTP_ACCEPT_LANGUAGE") or "").lower()
    languages = [entry.split(";", 1)[0].strip()[:2] for entry in header.split(",")]
    for lang in languages:
        if lang in {"de", "ru", "uk"}:
            return lang
    return "de"


def get_client_fingerprint(request):
    """
    Build a stable hash per client without storing identifiable data.
    Uses IP (first in X-Forwarded-For), user agent and session key.
    """
    try:
        addr = request.META.get(
            "HTTP_X_FORWARDED_FOR") or request.META.get("REMOTE_ADDR") or ""
        if "," in addr:
            addr = addr.split(",")[0].strip()
        ua = request.META.get("HTTP_USER_AGENT", "")
        if not request.session.session_key:
            request.session.save()
        session_id = request.session.session_key or ""
        raw = f"{addr}|{ua}|{session_id}".strip()
        if not raw:
            return None
        return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()
    except Exception as exc:
        logger.debug("Fingerprint unavailable: %s", exc, exc_info=True)
        return None


def require_admin_ip(func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied()
        if settings.ADMIN_IP_WHITELIST:
            remote_ip = (request.META.get("REMOTE_ADDR") or "").strip()
            if remote_ip and remote_ip not in settings.ADMIN_IP_WHITELIST:
                raise PermissionDenied()
        return func(request, *args, **kwargs)
    return wrapper


def build_base_context(request, include_upload: bool = False) -> dict:
    """
    Gemeinsame Template-Kontexte für Seiten mit optionalen Upload-Zeiten.
    """
    cache_key = "footer_user_stats_v2"
    stats = cache.get(cache_key)
    if not stats:
        stats = {
            "registered_user_count": User.objects.filter(
                is_active=True, is_staff=False, is_superuser=False
            ).count(),
            "interpreter_count": InterpreterApplication.objects.filter(
                status=InterpreterApplication.STATUS_APPROVED
            ).count(),
        }
        cache.set(cache_key, stats, 300)

    owner_profile_image_url = settings.PROFILE_IMAGE_URL
    user_profile_image_url = ""
    if request.user.is_authenticated:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.image_url:
            user_profile_image_url = profile.image_url

    contact_visible = request.user.is_authenticated

    events_json_url = getattr(
        settings,
        "EVENTS_JSON_URL",
        reverse("pages:events_json"),
    )
    is_interpreter = user_is_interpreter(request.user)
    if is_interpreter:
        events_json_url = f"{reverse('pages:events_json')}?interpreter={request.user.id}"

    context = {
        "signal_interpreter_url": "",
        "signal_user_url": "",
        "site_url": settings.SITE_URL,
        "profile_image_url": owner_profile_image_url,
        "user_profile_image_url": user_profile_image_url,
        "initial_lang": get_preferred_language(request),
        "contact_details": build_contact_details(request.user),
        "contact_actions": build_contact_actions(request.user),
        "chat_contacts": build_chat_contacts(request.user),
        "contact_visible": contact_visible,
        "imprint": build_imprint_details(),
        "calendar_enabled": getattr(settings, "CALENDAR_ENABLED", False),
        "is_interpreter": is_interpreter,
        "registered_user_count": stats.get("registered_user_count", 0),
        "interpreter_count": stats.get("interpreter_count", 0),
        "events_json_url": events_json_url,
        "user_uploads_enabled": getattr(settings, "USER_UPLOADS_ENABLED", False),
    }
    if include_upload and getattr(settings, "USER_UPLOADS_ENABLED", False):
        context.update(
            {
                "upload_service_start": settings.UPLOAD_SERVICE_START_HOUR,
                "upload_service_end": settings.UPLOAD_SERVICE_END_HOUR,
                "upload_service_block_weekends": settings.UPLOAD_SERVICE_BLOCK_WEEKENDS,
            }
        )
    return context
