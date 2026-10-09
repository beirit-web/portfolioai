from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def spa_index(_request, _path=""):
    if _request.path.startswith("/api/"):
        raise Http404("API route not found.")

    index_path = Path(settings.WHITENOISE_ROOT) / "index.html"
    if not index_path.exists():
        raise Http404("Frontend build not found.")
    return FileResponse(index_path.open("rb"), content_type="text/html")
