from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache


@never_cache
def deutschlive_api_not_found(_request, _path=""):
    return JsonResponse({"error": "API-Endpunkt nicht gefunden."}, status=404)


@never_cache
def deutschlive_spa(_request, _path=""):
    index_path = Path(settings.BASE_DIR) / "assets" / "deutschlive-dist" / "index.html"
    if not index_path.exists():
        raise Http404("DeutschLive build not found.")
    return FileResponse(index_path.open("rb"), content_type="text/html")


def deutschlive_redirect(_request, _path=""):
    target = "/deutschlive/"
    if _path:
        target = f"{target}{_path}"
    return redirect(target, permanent=True)
