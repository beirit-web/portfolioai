from functools import lru_cache
from hashlib import md5
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()


@lru_cache(maxsize=512)
def _asset_fingerprint(path: str) -> str:
    absolute_path = finders.find(path)
    if isinstance(absolute_path, (list, tuple)):
        absolute_path = absolute_path[0] if absolute_path else None
    if not absolute_path:
        return "missing"

    digest = md5(usedforsecurity=False)
    with Path(absolute_path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def _append_version(url: str, version: str) -> str:
    parsed = urlsplit(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["v"] = version
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)
    )


@register.simple_tag
def asset_url(path: str) -> str:
    return _append_version(static(path), _asset_fingerprint(path))
