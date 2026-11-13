import hashlib
import json
import time
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from django.core.cache import caches
from django.db.models import F
from django.http import Http404
from django.utils import timezone

from .models import ApiBudget, Species

API_BASE = "https://api.inaturalist.org/v1/taxa"
PHOTO_HOSTS = {"inaturalist-open-data.s3.amazonaws.com", "static.inaturalist.org"}
PLANT_RANKS = {"species", "subspecies", "variety", "form", "hybrid"}
CACHE_SECONDS = 24 * 60 * 60


class ApiError(Exception):
    def __init__(self, message, status=503):
        super().__init__(message)
        self.status = status


def _reserve_request(wait=False):
    now = timezone.now()
    today = timezone.localdate()
    ApiBudget.objects.get_or_create(pk=1, defaults={"next_request_at": now})
    ApiBudget.objects.filter(pk=1, day__lt=today).update(day=today, requests=0)
    # A conditional SQL update shares the limit across concurrent Django workers.
    reserved = ApiBudget.objects.filter(pk=1, day=today, requests__lt=9500, next_request_at__lte=now).update(
        requests=F("requests") + 1, next_request_at=now + timedelta(seconds=1),
    )
    if not reserved:
        remaining = (ApiBudget.objects.get(pk=1).next_request_at - timezone.now()).total_seconds()
        if wait and 0 < remaining <= 1.1:
            time.sleep(remaining + 0.02)
            return _reserve_request()
        raise ApiError("Die Pflanzensuche macht eine kurze Abrufpause. Bitte später erneut suchen.", status=429)


def _request(path="", wait=False, **params):
    _reserve_request(wait=wait)
    request = Request(f"{API_BASE}{path}?{urlencode(params)}", headers={
        "Accept": "application/json", "User-Agent": "ENBTBotanic/1.0 (+https://portfolio.example.invalid)",
    })
    try:
        with urlopen(request, timeout=8) as response:
            raw = response.read(2 * 1024 * 1024 + 1)
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError("Response too large")
            data = json.loads(raw)
            if not isinstance(data, dict) or not isinstance(data.get("results"), list):
                raise ValueError("Invalid API response")
            return data
    except HTTPError as exc:
        if exc.code == 404:
            raise Http404("Pflanzenart nicht gefunden.") from exc
        if exc.code == 429:
            ApiBudget.objects.filter(pk=1).update(next_request_at=timezone.now() + timedelta(seconds=60))
            raise ApiError("Die Pflanzenquelle ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.", status=429) from exc
        raise ApiError("Die Pflanzenquelle ist momentan nicht erreichbar. Deine gespeicherten Pflanzen bleiben verfügbar.") from exc
    except (URLError, TimeoutError, OSError, ValueError, UnicodeError) as exc:
        raise ApiError("Die Pflanzenquelle ist momentan nicht erreichbar. Deine gespeicherten Pflanzen bleiben verfügbar.") from exc


def _photo(data):
    photos = [data.get("default_photo") or {}]
    taxon_photos = data.get("taxon_photos")
    if isinstance(taxon_photos, list):
        photos.extend(entry.get("photo", {}) for entry in taxon_photos if isinstance(entry, dict))
    for photo in photos:
        if not isinstance(photo, dict) or not isinstance(photo.get("license_code"), str) or photo.get("license_code") not in {"cc0", "cc-by"}:
            continue
        url = photo.get("medium_url") or photo.get("url", "")
        if not isinstance(url, str) or len(url) > 500:
            continue
        parsed = urlparse(url)
        photo_id = photo.get("id")
        if parsed.scheme != "https" or parsed.netloc not in PHOTO_HOSTS or not isinstance(photo_id, int) or photo_id <= 0:
            continue
        return {
            "image_url": url[:500], "image_attribution": str(photo.get("attribution") or photo.get("attribution_name") or "iNaturalist")[:500],
            "image_license": photo["license_code"], "image_source_url": f"https://www.inaturalist.org/photos/{photo_id}",
        }
    return {}


def _store(data, details=False):
    if not isinstance(data, dict) or data.get("iconic_taxon_name") != "Plantae" or not isinstance(data.get("rank"), str) or data.get("rank") not in PLANT_RANKS:
        return None
    taxon_id = data.get("id")
    scientific = data.get("name")
    if not isinstance(taxon_id, int) or taxon_id <= 0 or not isinstance(scientific, str) or not scientific:
        return None
    defaults = {
        "name": str(data.get("preferred_common_name") or scientific)[:200], "scientific_name": scientific[:200],
        "rank": data["rank"], "fetched_at": timezone.now(),
    }
    photo = _photo(data)
    defaults.update(photo)
    if details:
        defaults["details_fetched_at"] = timezone.now()
        if not photo:
            defaults.update(image_url="", image_attribution="", image_license="", image_source_url="")
    species, _ = Species.objects.update_or_create(taxon_id=taxon_id, defaults=defaults)
    return species


def search(query, page=1):
    digest = hashlib.sha256(f"{query.casefold()}:{page}".encode()).hexdigest()
    cache = caches["botanic"]
    key = f"search:v1:{digest}"
    cached = cache.get(key)
    if cached is None:
        data = _request(q=query, page=page, per_page=12, iconic_taxa="Plantae", rank="species", is_active="true", locale="de")
        species = [plant for entry in data["results"] if (plant := _store(entry)) is not None]
        missing_photos = [plant.pk for plant in species if not plant.image_url and (
            not plant.details_fetched_at or plant.details_fetched_at < timezone.now() - timedelta(seconds=CACHE_SECONDS)
        )]
        if missing_photos:
            try:
                details = _request("/" + ",".join(map(str, missing_photos)), wait=True, locale="de")
                for entry in details["results"]:
                    _store(entry, details=True)
            except ApiError:
                pass
        total = data.get("total_results", len(species))
        if not isinstance(total, int) or total < 0:
            raise ApiError("Die Pflanzenquelle hat eine unvollständige Antwort geliefert.")
        cached = {"ids": [plant.pk for plant in species], "total": total}
        cache.set(key, cached, CACHE_SECONDS)
    by_id = Species.objects.in_bulk(cached["ids"])
    return {"results": [by_id[key] for key in cached["ids"] if key in by_id], "total": cached["total"],
            "has_next": page < 20 and page * 12 < cached["total"], "has_previous": page > 1}


def get_species(taxon_id):
    existing = Species.objects.filter(pk=taxon_id).first()
    if existing and existing.details_fetched_at and existing.details_fetched_at > timezone.now() - timedelta(seconds=CACHE_SECONDS):
        return existing
    try:
        data = _request(f"/{taxon_id}", locale="de")
    except ApiError:
        if existing:
            return existing
        raise
    species = _store(data["results"][0], details=True) if data["results"] else None
    if species is None or species.pk != taxon_id:
        raise Http404("Pflanzenart nicht gefunden.")
    return species
