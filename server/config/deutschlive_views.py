from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache


@never_cache
def deutschlive_api_not_found(_request, _path=""):
    return JsonResponse({"error": "API-Endpunkt nicht gefunden."}, status=404)


@never_cache
def deutschlive_recordings_archive(_request):
    # Keep existing browser recordings accessible for downloading after the move.
    index_path = Path(settings.BASE_DIR) / "assets" / "deutschlive-dist" / "index.html"
    if not index_path.exists():
        raise Http404("DeutschLive build not found.")
    return FileResponse(index_path.open("rb"), content_type="text/html")


@never_cache
def deutschlive_spa(request, _path=""):
    if _path.strip("/") == "grades":
        return redirect("/static/portfolio/test-main/index.html")
    return deutschlive_recordings_archive(request)


def deutschlive_redirect(request, _path=""):
    if _path.strip("/") == "grades":
        return redirect("/static/portfolio/test-main/index.html")
    target = "/deutschlive/"
    if _path:
        target = f"{target}{_path}"
    if request.META.get("QUERY_STRING"):
        target += "?" + request.META["QUERY_STRING"]
    return redirect(target, permanent=True)
