from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.utils.cache import patch_vary_headers


API_PREFIXES = ("/api/", "/deutschlive/api/", "/wohnungssuche-api/", "/botanic/api/")
ERROR_COPY = {
    400: {
        "title": "Anfrage konnte nicht verarbeitet werden",
        "message": "Die Anfrage war ungültig oder unvollständig. Bitte versuchen Sie es erneut.",
    },
    403: {
        "title": "Zugriff nicht erlaubt",
        "message": "Für diesen Bereich ist keine Berechtigung vorhanden.",
    },
    404: {
        "title": "Seite nicht gefunden",
        "message": "Der aufgerufene Link ist ungültig, abgelaufen oder wurde verschoben.",
    },
    405: {
        "title": "Methode nicht erlaubt",
        "message": "Diese Aktion ist über den verwendeten Aufruf nicht verfügbar.",
    },
    429: {
        "title": "Zu viele Anfragen",
        "message": "Bitte warten Sie kurz und versuchen Sie es danach erneut.",
    },
    500: {
        "title": "Kurzzeitig nicht verfügbar",
        "message": "Die Anfrage konnte gerade nicht verarbeitet werden. Bitte versuchen Sie es später erneut.",
    },
    502: {
        "title": "Dienst nicht erreichbar",
        "message": "Ein vorgelagerter Dienst antwortet gerade nicht zuverlässig.",
    },
    503: {
        "title": "Wartung oder Überlastung",
        "message": "Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.",
    },
}


def wants_json_error_response(request) -> bool:
    if any(request.path == prefix.rstrip("/") or request.path.startswith(prefix) for prefix in API_PREFIXES):
        return True
    if (request.headers.get("X-Requested-With") or "").lower() == "xmlhttprequest":
        return True

    json_types = ["application/json"]
    json_types.extend(
        str(media_type).split(";", 1)[0]
        for media_type in request.accepted_types
        if media_type.sub_type.endswith("+json")
    )
    preferred_type = request.get_preferred_type(["text/html", *json_types])
    return preferred_type is not None and preferred_type != "text/html"


def error_response(request, status_code: int):
    copy = ERROR_COPY.get(status_code, ERROR_COPY[500])
    if wants_json_error_response(request):
        response = JsonResponse({"status": status_code, **copy}, status=status_code)
    else:
        content = render_to_string(
            "error.html",
            {
                "status_code": status_code,
                "error_title": copy["title"],
                "error_message": copy["message"],
            },
        )
        response = HttpResponse(content, status=status_code)
    patch_vary_headers(response, ("Accept", "X-Requested-With"))
    response.status_page_handled = True
    return response


def bad_request(request, exception=None):
    return error_response(request, 400)


def permission_denied(request, exception=None):
    return error_response(request, 403)


def page_not_found(request, exception=None):
    return error_response(request, 404)


def server_error(request):
    return error_response(request, 500)
