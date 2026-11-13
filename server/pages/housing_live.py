"""User-initiated Somantic searches; never persist or automatically refresh listings."""

import json
import math
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.db.models import F
from django.http import JsonResponse
from django.utils import timezone
from django.utils.cache import patch_vary_headers
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .housing_api import housing_authenticated_user, housing_json_body
from .models import HousingApiBudget


API_URL = "https://www.somantic.net/api/graphql"
MAX_RESPONSE_BYTES = 1024 * 1024
RESULT_LIMIT = 20
RESULT_LIFETIME_SECONDS = 15 * 60


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the server-side API key to another endpoint.
        return None


class SearchError(Exception):
    def __init__(self, detail, code, status=503, retry_after=None):
        super().__init__(detail)
        self.code = code
        self.status = status
        self.retry_after = retry_after


def private_json(data, status=200):
    response = JsonResponse(data, status=status)
    response["Cache-Control"] = "private, no-store, max-age=0"
    response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    patch_vary_headers(response, ["Authorization"])
    return response


def monthly_limit():
    return max(0, min(50, int(settings.HOUSING_SOMANTIC_MONTHLY_LIMIT)))


def month_start():
    return timezone.localdate().replace(day=1)


def search_status():
    limit = monthly_limit()
    used = HousingApiBudget.objects.filter(month=month_start()).values_list("requests", flat=True).first() or 0
    return {
        "enabled": bool(settings.HOUSING_SOMANTIC_ENABLED and settings.HOUSING_SOMANTIC_API_KEY and limit),
        "monthly_limit": limit,
        "remaining": max(0, limit - used),
        "provider": "Somantic",
    }


def reserve_request():
    now = timezone.now()
    month = month_start()
    HousingApiBudget.objects.get_or_create(month=month, defaults={"next_request_at": now})
    reserved = HousingApiBudget.objects.filter(
        month=month, requests__lt=monthly_limit(), next_request_at__lte=now,
    ).update(requests=F("requests") + 1, next_request_at=now + timedelta(seconds=2))
    if not reserved:
        budget = HousingApiBudget.objects.get(month=month)
        if budget.requests >= monthly_limit():
            raise SearchError("Das monatliche Anfragebudget für die Live-Suche ist ausgeschöpft. Im nächsten Monat kannst du wieder suchen.", "monthly_limit", 429)
        retry = max(1, math.ceil((budget.next_request_at - now).total_seconds()))
        raise SearchError("Bitte warte kurz, bevor du erneut nach Wohnungen suchst.", "cooldown", 429, retry)


def validate_search(body):
    city = body.get("city")
    if not isinstance(city, str) or not 2 <= len(city.strip()) <= 120 or any(ord(c) < 32 for c in city):
        raise SearchError("Bitte gib einen Ort mit 2 bis 120 Zeichen an.", "invalid_search", 400)
    result = {"city": city.strip()}
    for key, maximum in (("max_cold_rent", 1000000), ("max_warm_rent", 1000000), ("min_rooms", 100)):
        value = body.get(key)
        if value is None or value == "":
            result[key] = None
            continue
        try:
            number = float(value)
        except (ValueError, TypeError, OverflowError):
            number = math.nan
        if isinstance(value, bool) or not math.isfinite(number) or not 0 <= number <= maximum:
            raise SearchError("Budget und Zimmerzahl müssen gültige, nicht negative Zahlen sein.", "invalid_search", 400)
        result[key] = number
    return result


def build_query(search):
    # GraphQL string literals are JSON strings; user input never becomes query syntax.
    filters = ['action: "mieten"', 'is_active: true', f'city: {json.dumps(search["city"])}']
    if search["max_cold_rent"] is not None:
        filters.append(f'rent_price_lt: {math.floor(search["max_cold_rent"]) + 1}')
    if search["min_rooms"] is not None:
        filters.append(f'rooms_gte: {search["min_rooms"]}')
    return "{ all_appartments(per_page: 20, page: 1, order_by: \"-uptime_date\", filters: { " + ", ".join(filters) + " }) { edges { node { immo_id title url source action currency is_active city zipcode rent_price warm_rent_price square_meter rooms date uptime_date } } } }"


def fetch_results(search):
    request = Request(API_URL, data=json.dumps({"query": build_query(search)}).encode("utf-8"), headers={
        "X-API-Key": settings.HOUSING_SOMANTIC_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }, method="POST")
    try:
        with build_opener(NoRedirect()).open(request, timeout=10) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise ValueError("Response too large")
            data = json.loads(raw)
        if not isinstance(data, dict) or data.get("errors"):
            raise ValueError("Invalid GraphQL response")
        edges = data["data"]["all_appartments"]["edges"]
        if not isinstance(edges, list):
            raise ValueError("Invalid listing response")
        return edges[:RESULT_LIMIT]
    except HTTPError as error:
        if error.code == 429:
            HousingApiBudget.objects.filter(month=month_start()).update(next_request_at=timezone.now() + timedelta(seconds=60))
            raise SearchError("Der Anbieter hat sein Anfragekontingent oder die Abrufrate begrenzt. Bitte später erneut versuchen.", "provider_limit", 429, 60) from None
        if error.code in (401, 403):
            raise SearchError("Der Zugang zur Wohnungsquelle ist nicht freigeschaltet. Bitte prüfe die lokale Konfiguration.", "provider_auth") from None
        raise SearchError("Die Wohnungsquelle ist momentan nicht erreichbar. Bitte später erneut versuchen.", "provider_unavailable", 502) from None
    except (URLError, TimeoutError, OSError, ValueError, KeyError, TypeError, UnicodeError, RecursionError):
        raise SearchError("Die Wohnungsquelle hat keine gültige Antwort geliefert. Bitte später erneut versuchen.", "provider_unavailable", 502) from None


def number(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        value = float(value)
        return value if math.isfinite(value) and value >= 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def normalize_listing(edge, search):
    node = edge.get("node") if isinstance(edge, dict) else None
    if not isinstance(node, dict) or node.get("action") != "mieten" or node.get("is_active") is not True or node.get("currency") != "EUR":
        return None
    url = node.get("url")
    try:
        parsed = urlsplit(url) if isinstance(url, str) else None
        if not parsed or parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password or any(c.isspace() for c in url):
            return None
    except ValueError:
        return None
    title, source, city = (node.get(key) for key in ("title", "source", "city"))
    if not all(isinstance(value, str) and value.strip() for value in (title, source, city)):
        return None
    cold, warm, rooms = (number(node.get(key)) for key in ("rent_price", "warm_rent_price", "rooms"))
    for value, bound, minimum in ((cold, search["max_cold_rent"], False), (warm, search["max_warm_rent"], False), (rooms, search["min_rooms"], True)):
        if bound is not None and (value is None or (value < bound if minimum else value > bound)):
            return None
    # Whitelist only display fields: no descriptions, images, addresses or model scores.
    return {
        "title": title[:250], "source": source[:120], "url": url, "city": city[:120],
        "zipcode": str(node["zipcode"]).zfill(5) if type(node.get("zipcode")) is int and 0 <= node["zipcode"] <= 99999 else "",
        "cold_rent": cold, "warm_rent": warm, "rooms": rooms, "living_area": number(node.get("square_meter")),
    }


@require_GET
def housing_live_status(request):
    if not housing_authenticated_user(request):
        return private_json({"detail": "Bitte melde dich für die Live-Suche an."}, 401)
    return private_json(search_status())


@csrf_exempt
@require_POST
def housing_live_search(request):
    if not housing_authenticated_user(request):
        return private_json({"detail": "Bitte melde dich für die Live-Suche an."}, 401)
    body, error = housing_json_body(request)
    if error:
        return private_json({"detail": "Bitte übermittle gültige Suchkriterien.", "code": "invalid_search"}, 400)
    try:
        search = validate_search(body)
        if not search_status()["enabled"]:
            raise SearchError("Die Live-Suche ist noch nicht eingerichtet. Die Beispielangebote bleiben verfügbar.", "not_configured")
        reserve_request()
        results = [listing for edge in fetch_results(search) if (listing := normalize_listing(edge, search))]
        return private_json({
            "results": results, "count": len(results), "provider": "Somantic", "search": search,
            "fetched_at": timezone.now().isoformat(), "expires_in": RESULT_LIFETIME_SECONDS,
            "remaining": search_status()["remaining"],
        })
    except SearchError as error:
        response = private_json({"detail": str(error), "code": error.code, "remaining": search_status()["remaining"]}, error.status)
        if error.retry_after:
            response["Retry-After"] = str(error.retry_after)
        return response
