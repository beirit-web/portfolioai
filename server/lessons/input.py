"""Strict JSON request schemas shared by the learning API endpoints."""

from dataclasses import dataclass
from functools import wraps
import json

from django.http import JsonResponse


@dataclass(frozen=True)
class Field:
    kind: type = str
    max_length: int = 0
    choices: tuple = ()
    minimum: int = 0
    maximum: int = 32767

    def valid(self, value):
        if type(value) is not self.kind:
            return False
        if self.kind is str:
            try:
                value.encode("utf-8")
            except UnicodeEncodeError:
                return False
            if self.max_length and len(value) > self.max_length:
                return False
        if self.kind is int and not self.minimum <= value <= self.maximum:
            return False
        return not self.choices or value in self.choices


def text(max_length, *, choices=()):
    return Field(max_length=max_length, choices=tuple(choices))


def _invalid_constant(value):
    raise ValueError(value)


def json_input(**schema):
    def decorate(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if request.method in {"GET", "HEAD"}:
                return view(request, *args, **kwargs)
            try:
                data = json.loads(request.body.decode("utf-8") or "{}", parse_constant=_invalid_constant)
            except (ValueError, UnicodeDecodeError, RecursionError):
                data = None
            if not isinstance(data, dict):
                return invalid_input("Bitte senden Sie ein gültiges JSON-Objekt.")
            errors = {
                name: "Ungültiger Wert oder Datentyp."
                for name, value in data.items()
                if name not in schema or not schema[name].valid(value)
            }
            if errors:
                return invalid_input("Bitte prüfen Sie die eingegebenen Daten.", fields=errors)
            request.learning_api_data = data
            return view(request, *args, **kwargs)
        return wrapper
    return decorate


def invalid_input(message, *, fields=None, code="invalid_input"):
    return JsonResponse({"error": message, "code": code, "fields": fields or {}}, status=400)
