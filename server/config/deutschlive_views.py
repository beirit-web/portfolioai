from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache


def _redirect_with_query(request, target, *, permanent=False):
    query = request.META.get("QUERY_STRING")
    if query:
        target += "?" + query
    return redirect(target, permanent=permanent)


def _deutschlive_index():
    index_path = Path(settings.BASE_DIR) / "assets" / "deutschlive-dist" / "index.html"
    if not index_path.exists():
        raise Http404("DeutschLive build not found.")
    return FileResponse(index_path.open("rb"), content_type="text/html")


@never_cache
def deutschlive_api_not_found(_request, _path=""):
    return JsonResponse({"error": "API-Endpunkt nicht gefunden."}, status=404)


@never_cache
def deutschlive_recordings_archive(_request):
    # Keep existing browser recordings accessible for downloading after the move.
    return _deutschlive_index()


@never_cache
def deutschlive_spa(request, _path=""):
    if _path.strip("/") == "grades":
        return _redirect_with_query(request, "/static/portfolio/notenrechner/index.html")
    if _path.endswith("/"):
        # App.tsx matches its subpages without trailing slashes.
        target = "/deutschlive/" + quote(_path.rstrip("/"), safe="/")
        return _redirect_with_query(request, target, permanent=True)
    return _deutschlive_index()


def deutschlive_redirect(request, _path=""):
    if _path.strip("/") == "grades":
        return deutschlive_spa(request, _path)
    target = "/deutschlive/" + quote(_path, safe="/")
    return _redirect_with_query(request, target, permanent=True)
