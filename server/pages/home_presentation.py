"""Read the HTML built from the same components and locales as the browser UI."""

from functools import lru_cache
import json
from pathlib import Path

from django.conf import settings


@lru_cache(maxsize=4)
def _read_home(path, modified_ns, size):
    catalog = json.loads(Path(path).read_text(encoding="utf-8"))
    if catalog.get("schemaVersion") != 1:
        raise ValueError("Unsupported home presentation catalog")
    return catalog["locales"]


def rendered_home(language):
    path = Path(settings.SERVER_DIR) / "assets/portfolio-dist/.vite/home-rendered.json"
    try:
        metadata = path.stat()
        locales = _read_home(str(path), metadata.st_mtime_ns, metadata.st_size)
        return locales.get(language, locales["de"])
    except (OSError, KeyError, json.JSONDecodeError, ValueError):
        # A missing build keeps the existing React fallback available.
        return None
