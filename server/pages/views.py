import hashlib
import html
import json
import logging
from pathlib import Path
from datetime import date, timedelta
from urllib.parse import quote, urlencode

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.conf import settings
from django.forms import ValidationError
from django.core.cache import cache
from django.http import FileResponse, Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import redirect, render
from django.contrib import messages
from django.templatetags.static import static
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.cache import never_cache
from django.urls import reverse
from django.utils.encoding import force_str
from django.utils.http import (
    url_has_allowed_host_and_scheme,
    urlsafe_base64_decode,
)
from django.utils import timezone

from lessons.models import UserProfile as LearningUserProfile
from pages.modules.mail import send_notification_email
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
from .login_security import clear_login_attempts
from .verification import (
    account_email_delivery_mode, pending_account_for_credentials,
    send_pending_account_verification,
)
from .forms import ContactRequestForm, LoginForm, RegistrationForm, UserAccountForm
from .models import ChatMessage, Profile, Project, WeatherSearch
from .seo import (
    INTEGRATED_PROJECT_SLUGS,
    imprint_page_metadata,
    login_page_metadata,
    portfolio_page_metadata,
    privacy_page_metadata,
    portfolio_structured_data,
    structured_data_json,
)
from .project_detail import build_project_detail
from .projects_overview import build_projects_overview, projects_presentation_catalog
from .housing_api import (
    housing_authenticated_user,
    make_housing_auth_token,
    housing_json_body,
    housing_logout_api,
    housing_search_location_detail_api,
    housing_search_locations_api,
    housing_search_profile_detail_api,
    housing_search_profiles_api,
)

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
    "(max-width: 47.99rem) calc(88.8vw - 2px), "
    "(max-width: 1099px) 93vw, "
    "calc((100vw - clamp(2rem, 7vw, 12rem) - clamp(1rem, 2vw, 1.5rem)) / 2.15)"
)


SEO_SITEMAP_ITEMS = [
    ("pages:home", "daily", "1.0", "templates/pages/index.html"),
    ("pages:skills_page_no_slash", "monthly", "0.8", "templates/pages/index.html"),
    ("pages:projects_page_no_slash", "weekly", "0.7", "templates/pages/index.html"),
    ("pages:about_page_no_slash", "monthly", "0.6", "templates/pages/index.html"),
    ("pages:contact_no_slash", "monthly", "0.7", "templates/pages/index.html"),
]

HOUSING_SPA_INDEX = Path(settings.BASE_DIR) / "assets" / "portfolio" / "wohnungssuche" / "index.html"
HOUSING_SEARCH_SOURCE_LINKS = [
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
def housing_spa(_request, section=None):
    if section is not None and section not in {
        "dashboard", "apartments", "search-profiles", "sources",
        "notifications", "information", "login", "register",
    }:
        raise Http404("Wohnungssuche page not found.")
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


def serialize_project(project: Project) -> dict:
    from config.asset_redirects import canonical_portfolio_url

    image_url = project.preview_image_url
    live_url = canonical_portfolio_url(project.live_url)
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
        "liveUrl": live_url,
        "href": live_url,
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
    if detail:
        catalog = projects_presentation_catalog()
        hero = (catalog or {}).get("detailImages", {}).get(slug, {}).get("hero")
        if hero:
            preload = {"src": hero["src"], "srcset": hero["srcSet"], "sizes": hero["sizes"]}
            # Covers follow the intro. Their eager HTML images are discoverable
            # on mobile; head preloads can select a second source while the
            # initial viewport settles in Chromium.
            preload["media"] = "(min-width: 1100px)"
            return preload
    base = f"/static/images/portfolio-covers/{slug}-cover-v1"
    widths = (480, 640, 768, 960) if detail else (480, 768)
    return {
        "src": f"{base}.webp",
        "srcset": ", ".join([f"{base}-{width}.webp {width}w" for width in widths] + [f"{base}.webp 1254w"]),
        "sizes": PROJECT_DETAIL_IMAGE_SIZES if detail else PROJECT_OVERVIEW_IMAGE_SIZES,
        **({"media": "(min-width: 1100px)"} if detail else {}),
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

    username = data.get("username", "")
    email = data.get("email", "")
    password = data.get("password", "")
    password_confirm = data.get("password_confirm", "")
    errors: dict[str, list[str]] = {}

    for key, value in (("username", username), ("email", email), ("password", password), ("password_confirm", password_confirm)):
        if not isinstance(value, str) or not value.strip():
            errors[key] = ["Dieses Textfeld ist erforderlich."]
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    username = User.normalize_username(username.strip())
    email = email.strip().lower()
    for key, value in (("username", username), ("email", email)):
        try:
            User._meta.get_field(key).clean(value, None)
        except ValidationError as exc:
            errors[key] = list(exc.messages)
    if User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).exists():
        errors["username"] = ["Dieser Nutzername ist bereits vergeben."]
    if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
        errors["email"] = ["Diese E-Mail wird bereits verwendet."]
    if password != password_confirm:
        errors["password_confirm"] = ["Die Passwoerter stimmen nicht ueberein."]
    try:
        validate_password(password, user=User(username=username, email=email))
    except ValidationError as exc:
        errors["password"] = list(exc.messages)

    if errors:
        return JsonResponse({"errors": errors}, status=400)

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email, password=password, is_active=False)
            if not send_pending_account_verification(user, next_url="/wohnungssuche/login"):
                raise ValidationError("Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen.")
    except IntegrityError:
        return JsonResponse({"errors": {"username": ["Dieser Nutzername ist bereits vergeben."]}}, status=400)
    except ValidationError as exc:
        return JsonResponse({"errors": {"detail": exc.messages}}, status=503)
    return JsonResponse(
        {
            "detail": "Bitte bestätige deine E-Mail-Adresse über den Link in der Bestätigungs-E-Mail. Erst danach ist dein Konto aktiv.",
            "email": user.email,
            "emailVerificationRequired": True,
            "emailDelivery": account_email_delivery_mode(),
            "login_url": "/wohnungssuche/login",
        },
        status=201,
    )


@csrf_exempt
@never_cache
@require_POST
def housing_token_auth_api(request):
    data, error = housing_json_body(request)
    if error:
        return error
    if not isinstance(data.get("username"), str) or not isinstance(data.get("password"), str):
        return JsonResponse({"errors": {"detail": ["Nutzername und Passwort sind erforderlich."]}}, status=400)
    user = authenticate(request, username=data["username"], password=data["password"])
    if not user:
        if pending_account_for_credentials(data["username"], data["password"]):
            return JsonResponse({
                "errors": {"detail": ["Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Bestätigungs-E-Mail."]},
                "code": "email_verification_required",
            }, status=403)
        return JsonResponse({"errors": {"detail": ["Nutzername oder Passwort wurden nicht akzeptiert."]}}, status=400)
    clear_login_attempts(request)
    token = make_housing_auth_token(user)
    return JsonResponse({"token": token, "user_id": user.pk, "username": user.username})


@never_cache
@require_GET
def housing_listings_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    listings = list(HOUSING_SEARCH_SOURCE_LINKS)
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


@never_cache
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
@never_cache
def vokabelbox(request):
    learner = f"user-{request.user.pk}" if request.user.is_authenticated else "guest"
    return render(request, "pages/vokabelbox.html", {
        "site_url": settings.SITE_URL,
        "initial_lang": get_preferred_language(request),
        "vocab_storage_key": f"sprachservice:vokabelbox:v1:{learner}",
    })


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
    ctx = build_base_context(request)
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
        "logoUrl": safe_static_url("images/beirit-digital-logo-160.webp"),
        "logoSmallUrl": safe_static_url("images/beirit-digital-logo-160.webp"),
        "logoLargeUrl": safe_static_url("images/beirit-digital-logo-320.webp"),
        "projectsApiUrl": reverse("pages:projects_api"),
        "weatherSearchesUrl": reverse("pages:weather_searches"),
        "loginUrl": reverse("pages:login"),
        "isAuthenticated": request.user.is_authenticated,
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


def manual(request):
    manual_path = settings.SERVER_DIR / "assets" / "files" / "handbuch.html"
    try:
        return HttpResponse(manual_path.read_text(encoding="utf-8"), content_type="text/html; charset=utf-8")
    except FileNotFoundError as exc:
        raise Http404("Handbuchdatei nicht gefunden.") from exc


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

    if not isinstance(body, dict) or any(key in body and not isinstance(body[key], str) for key in ("query", "city")):
        return JsonResponse({"error": "invalid_query"}, status=400)

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
    context = build_base_context(request)
    context["privacy_meta"] = privacy_page_metadata(context["initial_lang"], build_absolute_site_url)
    context["initial_lang"] = context["privacy_meta"]["language"]
    return render(request, "pages/datenschutz.html", context)


def imprint(request):
    context = build_base_context(request)
    context["imprint_meta"] = imprint_page_metadata(context["initial_lang"], build_absolute_site_url)
    return render(request, "pages/impressum.html", context)


def donate(request):
    """Keep old donation bookmarks usable without exposing the hidden page."""
    return redirect("pages:projects_page_no_slash")


def register(request):
    already_logged_in = request.user.is_authenticated
    next_url = get_safe_login_redirect(request) if request.POST.get("next") or request.GET.get("next") else ""
    if request.method == "POST":
        form = RegistrationForm(request.POST, request.FILES)
        try:
            if form.is_valid():
                with transaction.atomic():
                    user = form.save()
                    if not send_pending_account_verification(user, next_url=next_url):
                        raise ValidationError(
                            "Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen."
                        )
                reg_msg = (
                    "Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in der E-Mail. Erst danach ist Ihr Konto aktiv."
                )
                messages.success(request, reg_msg)
                login_url = reverse("pages:login")
                login_params = {"email": user.email}
                if next_url:
                    login_params["next"] = next_url
                return redirect(f"{login_url}?{urlencode(login_params)}")
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
    context["registration_next"] = next_url
    return render(request, "pages/register.html", context)


@require_GET
@never_cache
def verify_email(request, uidb64, token):
    next_url = get_safe_login_redirect(request)
    with transaction.atomic():
        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.select_for_update().get(
                pk=user_id, is_active=False, profile__email_verification_pending=True,
            )
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if not user or not email_verification_token_generator.check_token(user, token):
            messages.error(
                request,
                "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte registrieren Sie sich erneut.",
            )
            registration_url = reverse("pages:register")
            if request.GET.get("next"):
                registration_url += "?" + urlencode({"next": next_url})
            return redirect(registration_url)

        Profile.objects.filter(user=user).update(email_verification_pending=False)
        user.is_active = True
        user.save(update_fields=["is_active"])
        LearningUserProfile.objects.update_or_create(user=user, defaults={"email_verified": True})
    cache.delete("footer_user_stats_v2")
    login(request, user, backend="pages.authentication.EmailOrUsernameBackend")
    initialize_authenticated_session(request, user, reset_activity=True)
    messages.success(
        request,
        "Ihre E-Mail-Adresse wurde bestätigt. Sie sind jetzt eingeloggt.",
    )
    return redirect(next_url)


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


@never_cache
def login_view(request):
    if request.user.is_authenticated:
        return redirect(get_safe_login_redirect(request))
    maybe_add_idle_timeout_message(request)
    form = LoginForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.get_user()
        login(request, user)
        clear_login_attempts(request)
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
    context["login_next"] = get_safe_login_redirect(request) if request.POST.get("next") or request.GET.get("next") else ""
    context["login_meta"] = login_page_metadata(request, build_absolute_site_url)
    response = render(request, "pages/login.html", context)
    response["X-Robots-Tag"] = context["login_meta"]["robots"]
    return response


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


@require_GET
def contact_action_redirect(request, action):
    return ContactActionRedirect(resolve_contact_action_target(action))


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


@login_required
def profile_page(request):
    """Edit the demo account without the former client workspace."""
    profile, _ = Profile.objects.get_or_create(user=request.user)
    form = UserAccountForm(instance=request.user, prefix="account")
    if request.method == "POST":
        if request.POST.get("image-remove_image") == "on":
            profile.image_data = None
            profile.image_mime = ""
            profile.image_name = ""
            profile.save(update_fields=["image_data", "image_mime", "image_name"])
            return redirect("pages:profile")
        form = UserAccountForm(request.POST, instance=request.user, prefix="account")
        if form.is_valid():
            form.save()
            messages.success(request, "Ihre Kontodaten wurden aktualisiert.")
            return redirect("pages:profile")
    return render(request, "pages/profile.html", {
        **build_base_context(request), "profile": profile, "account_form": form,
    })


def build_base_context(request) -> dict:
    return {
        "account_mail_is_console": settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend",
        "site_url": settings.SITE_URL,
        "profile_image_url": settings.PROFILE_IMAGE_URL,
        "initial_lang": get_preferred_language(request),
        "contact_details": build_contact_details(request.user),
        "contact_actions": build_contact_actions(request.user),
        "chat_contacts": build_chat_contacts(request.user),
        "contact_visible": request.user.is_authenticated,
        "imprint": build_imprint_details(),
    }
