"""Account-scoped persistence for the integrated housing search frontend."""

import hashlib
import json
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.contrib.auth import logout
from django.core import signing
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import HousingSearchLocation, HousingSearchProfile, HousingTokenRevocation


HOUSING_TOKEN_SALT = "wohnungssuche-api-token"
HOUSING_TOKEN_MAX_AGE = 60 * 60 * 24 * 30
PROFILE_NUMBERS = {"min_rooms": 100, "max_rooms": 100, "max_warm_rent": 1000000}
PROFILE_FLAGS = ("balcony", "fitted_kitchen", "ground_floor_or_elevator")


def validation_error(errors):
    return JsonResponse({"errors": errors}, status=400)


def _invalid_json_constant(_value):
    raise ValueError("Non-finite JSON number")


def housing_json_body(request):
    try:
        body = json.loads(request.body.decode("utf-8"), parse_constant=_invalid_json_constant)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError, RecursionError):
        return {}, validation_error({"detail": ["Ungültige JSON-Daten."]})
    if not isinstance(body, dict):
        return {}, validation_error({"detail": ["JSON-Objekt erwartet."]})
    return body, None


def housing_authenticated_user(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Token "):
        return None
    token = header.removeprefix("Token ").strip()
    try:
        data = signing.loads(token, salt=HOUSING_TOKEN_SALT, max_age=HOUSING_TOKEN_MAX_AGE)
    except (signing.BadSignature, ValueError, TypeError, UnicodeDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    user_id = data.get("uid")
    if type(user_id) is not int or not 0 < user_id <= 2**63 - 1:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if HousingTokenRevocation.objects.filter(token_hash=token_hash, expires_at__gt=timezone.now()).exists():
        return None
    user = User.objects.filter(pk=user_id, is_active=True).first()
    auth_hash = data.get("auth")
    if not user or not isinstance(auth_hash, str) or not constant_time_compare(auth_hash, user.get_session_auth_hash()):
        return None
    return user


def make_housing_auth_token(user):
    return signing.dumps({
        "uid": user.pk, "auth": user.get_session_auth_hash(), "nonce": uuid.uuid4().hex,
    }, salt=HOUSING_TOKEN_SALT)


def _unauthorized():
    return JsonResponse({"detail": "Bitte melde dich erneut an."}, status=401)


@never_cache
@require_GET
def housing_account_session_api(request):
    if not request.user.is_authenticated or not request.user.is_active:
        return _unauthorized()
    return JsonResponse({"token": make_housing_auth_token(request.user), "username": request.user.username})


def _not_found():
    return JsonResponse({"detail": "Eintrag nicht gefunden."}, status=404)


def _list_response(items):
    return JsonResponse({"count": len(items), "next": None, "previous": None, "results": items})


def serialize_location(location):
    return {"id": location.pk, "name": location.name, "radius_km": float(location.radius_km)}


def serialize_profile(profile):
    locations = [serialize_location(location) for location in profile.locations.all()]
    return {
        "id": profile.pk,
        "name": profile.name,
        **{key: float(getattr(profile, key)) if getattr(profile, key) is not None else None for key in PROFILE_NUMBERS},
        **{key: getattr(profile, key) for key in PROFILE_FLAGS},
        "location_ids": [location["id"] for location in locations],
        "locations": locations,
    }


def _validate_name(value, errors):
    if not isinstance(value, str) or not value.strip():
        errors["name"] = ["Name ist erforderlich."]
        return ""
    value = value.strip()
    if len(value) > 120:
        errors["name"] = ["Der Name darf höchstens 120 Zeichen enthalten."]
    return value


def _validate_number(key, value, upper_bound, errors, *, nullable=False):
    if nullable and value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        errors[key] = ["Bitte gib eine gültige Zahl ein."]
        return None
    try:
        number = Decimal(str(value))
        if not number.is_finite():
            raise InvalidOperation
        if number < 0 or number > upper_bound:
            errors[key] = [f"Der Wert muss zwischen 0 und {upper_bound} liegen."]
            return None
        rounded = number.quantize(Decimal("0.01"))
        if rounded != number:
            errors[key] = ["Höchstens zwei Nachkommastellen sind erlaubt."]
            return None
    except (InvalidOperation, ValueError):
        errors[key] = ["Bitte gib eine gültige Zahl ein."]
        return None
    return rounded


def _unknown_fields(data, allowed, errors):
    for key in data.keys() - allowed:
        errors[key] = ["Dieses Feld kann nicht geschrieben werden."]


def _location_values(data, *, partial=False):
    errors = {}
    _unknown_fields(data, {"name", "radius_km"}, errors)
    values = {}
    if not partial or "name" in data:
        values["name"] = _validate_name(data.get("name"), errors)
    if not partial or "radius_km" in data:
        values["radius_km"] = _validate_number("radius_km", data.get("radius_km", 15), 1000, errors)
    return values, errors


def _profile_values(data, user, current=None, *, partial=False):
    errors = {}
    _unknown_fields(data, {"name", "location_ids", *PROFILE_NUMBERS, *PROFILE_FLAGS}, errors)
    values = {}
    if not partial or "name" in data:
        values["name"] = _validate_name(data.get("name"), errors)
    for key, upper_bound in PROFILE_NUMBERS.items():
        if not partial or key in data:
            values[key] = _validate_number(key, data.get(key), upper_bound, errors, nullable=True)
    for key in PROFILE_FLAGS:
        if not partial or key in data:
            value = data.get(key, False)
            if type(value) is not bool:
                errors[key] = ["Bitte verwende true oder false."]
            else:
                values[key] = value
    min_rooms = values.get("min_rooms", current.min_rooms if current else None)
    max_rooms = values.get("max_rooms", current.max_rooms if current else None)
    if min_rooms is not None and max_rooms is not None and min_rooms > max_rooms:
        errors["max_rooms"] = ["Die maximale Zimmerzahl darf nicht kleiner als die minimale sein."]
    locations = None
    if not partial or "location_ids" in data:
        ids = data.get("location_ids", [])
        if not isinstance(ids, list) or any(type(pk) is not int or not 0 < pk <= 2**63 - 1 for pk in ids):
            errors["location_ids"] = ["Bitte gib eine Liste gültiger Orts-IDs an."]
        elif len(ids) != len(set(ids)):
            errors["location_ids"] = ["Jeder Ort darf nur einmal zugeordnet werden."]
        else:
            locations = list(HousingSearchLocation.objects.filter(user=user, pk__in=ids))
            if len(locations) != len(ids):
                errors["location_ids"] = ["Mindestens ein Ort fehlt oder gehört nicht zu deinem Konto."]
    return values, locations, errors


@csrf_exempt
@never_cache
@require_POST
def housing_logout_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return _unauthorized()
    token = request.headers["Authorization"].removeprefix("Token ").strip()
    HousingTokenRevocation.objects.get_or_create(
        token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
        defaults={"user": user, "expires_at": timezone.now() + timedelta(seconds=HOUSING_TOKEN_MAX_AGE)},
    )
    if request.user.is_authenticated and request.user.pk == user.pk:
        logout(request)
    return HttpResponse(status=204)


@csrf_exempt
@never_cache
@require_http_methods(["GET", "POST"])
def housing_search_profiles_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return _unauthorized()
    if request.method == "GET":
        profiles = HousingSearchProfile.objects.filter(user=user).prefetch_related("locations")
        return _list_response([serialize_profile(profile) for profile in profiles])
    data, error = housing_json_body(request)
    if error:
        return error
    with transaction.atomic():
        values, locations, errors = _profile_values(data, user)
        if errors:
            return validation_error(errors)
        profile = HousingSearchProfile.objects.create(user=user, **values)
        profile.locations.set(locations)
    return JsonResponse(serialize_profile(profile), status=201)


@csrf_exempt
@never_cache
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def housing_search_profile_detail_api(request, profile_id):
    user = housing_authenticated_user(request)
    if not user:
        return _unauthorized()
    if not 0 < profile_id <= 2**63 - 1:
        return _not_found()
    with transaction.atomic():
        profile = HousingSearchProfile.objects.select_for_update().filter(user=user, pk=profile_id).first()
        if not profile:
            return _not_found()
        if request.method == "DELETE":
            profile.delete()
            return HttpResponse(status=204)
        if request.method == "GET":
            return JsonResponse(serialize_profile(profile))
        data, error = housing_json_body(request)
        if error:
            return error
        values, locations, errors = _profile_values(data, user, profile, partial=request.method == "PATCH")
        if errors:
            return validation_error(errors)
        for key, value in values.items():
            setattr(profile, key, value)
        profile.save()
        if locations is not None:
            profile.locations.set(locations)
    return JsonResponse(serialize_profile(profile))


@csrf_exempt
@never_cache
@require_http_methods(["GET", "POST"])
def housing_search_locations_api(request):
    user = housing_authenticated_user(request)
    if not user:
        return _unauthorized()
    if request.method == "GET":
        return _list_response([serialize_location(location) for location in HousingSearchLocation.objects.filter(user=user)])
    data, error = housing_json_body(request)
    if error:
        return error
    values, errors = _location_values(data)
    if errors:
        return validation_error(errors)
    location = HousingSearchLocation.objects.create(user=user, **values)
    return JsonResponse(serialize_location(location), status=201)


@csrf_exempt
@never_cache
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def housing_search_location_detail_api(request, location_id):
    user = housing_authenticated_user(request)
    if not user:
        return _unauthorized()
    if not 0 < location_id <= 2**63 - 1:
        return _not_found()
    location = HousingSearchLocation.objects.filter(user=user, pk=location_id).first()
    if not location:
        return _not_found()
    if request.method == "DELETE":
        location.delete()
        return HttpResponse(status=204)
    if request.method == "GET":
        return JsonResponse(serialize_location(location))
    data, error = housing_json_body(request)
    if error:
        return error
    values, errors = _location_values(data, partial=request.method == "PATCH")
    if errors:
        return validation_error(errors)
    for key, value in values.items():
        setattr(location, key, value)
    location.save()
    return JsonResponse(serialize_location(location))
