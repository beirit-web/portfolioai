from django.http import HttpResponse
from django.template.loader import render_to_string


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


def error_response(_request, status_code: int):
    copy = ERROR_COPY.get(status_code, ERROR_COPY[500])
    content = render_to_string(
        "error.html",
        {
            "status_code": status_code,
            "error_title": copy["title"],
            "error_message": copy["message"],
        },
    )
    return HttpResponse(content, status=status_code)


def bad_request(request, exception=None):
    return error_response(request, 400)


def permission_denied(request, exception=None):
    return error_response(request, 403)


def page_not_found(request, exception=None):
    return error_response(request, 404)


def server_error(request):
    return error_response(request, 500)
