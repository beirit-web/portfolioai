from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.http import HttpResponse, Http404, JsonResponse
from django.shortcuts import redirect
from django.utils.cache import patch_vary_headers
from django.views.decorators.cache import never_cache

from .deutschlive_seo import ALIASES, LOCALE_COOKIE, ROUTE_DATA, ROUTES, page_metadata, render_app_html


def _redirect_with_query(request, target, *, permanent=False):
    query = request.META.get("QUERY_STRING")
    if query:
        target += "?" + query
    return redirect(target, permanent=permanent)


def _deutschlive_index(request, path="/", *, status=200):
    index_path = Path(settings.BASE_DIR) / "assets" / "deutschlive-dist" / "index.html"
    if not index_path.exists():
        raise Http404("DeutschLive build not found.")
    locale = request.COOKIES.get(LOCALE_COOKIE, ROUTE_DATA["defaultLocale"])
    if locale not in ("de", "ru", "uk"):
        locale = ROUTE_DATA["defaultLocale"]
    metadata = page_metadata(path, locale)
    source = render_app_html(index_path.read_text(encoding="utf-8"), metadata)
    response = HttpResponse(source, content_type="text/html; charset=utf-8", status=status)
    # Keep the app's deliberate 404 page when DEBUG middleware hides technical
    # Django error pages in local development.
    if status == 404:
        response.status_page_handled = True
    response["Content-Length"] = str(len(response.content))
    response["Content-Language"] = locale
    response["X-Robots-Tag"] = metadata["robots"]
    patch_vary_headers(response, ("Cookie",))
    return response


@never_cache
def deutschlive_api_not_found(_request, _path=""):
    return JsonResponse({"error": "API-Endpunkt nicht gefunden."}, status=404)


@never_cache
def deutschlive_recordings_archive(request):
    # Keep existing browser recordings accessible for downloading after the move.
    return _deutschlive_index(request, "/recordings-archiv")


@never_cache
def deutschlive_spa(request, _path=""):
    if _path.strip("/") == "grades":
        return _redirect_with_query(request, "/static/portfolio/notenrechner/index.html")
    path = "/" + _path.rstrip("/")
    if path in ALIASES:
        return _redirect_with_query(request, "/deutschlive" + ALIASES[path], permanent=True)
    if _path.endswith("/"):
        # App.tsx matches its subpages without trailing slashes.
        target = "/deutschlive/" + quote(_path.rstrip("/"), safe="/")
        return _redirect_with_query(request, target, permanent=True)
    # Keep unknown app paths out of the search index and show the same explicit
    # not-found state in the browser instead of silently displaying the landing.
    return _deutschlive_index(request, path, status=200 if path in ROUTES else 404)


def deutschlive_redirect(request, _path=""):
    if _path.strip("/") == "grades":
        return deutschlive_spa(request, _path)
    target = "/deutschlive/" + quote(_path, safe="/")
    return _redirect_with_query(request, target, permanent=True)
