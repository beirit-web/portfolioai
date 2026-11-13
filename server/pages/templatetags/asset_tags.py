from functools import lru_cache
from hashlib import md5
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django import template
from django.contrib.staticfiles import finders
from django.utils.safestring import mark_safe
from django.templatetags.static import static

register = template.Library()


def _find_asset(path: str) -> Path | None:
    absolute_path = finders.find(path)
    if isinstance(absolute_path, (list, tuple)):
        absolute_path = absolute_path[0] if absolute_path else None
    if not absolute_path:
        return None
    return Path(absolute_path)


@lru_cache(maxsize=512)
def _asset_fingerprint_cached(path: str, mtime_ns: int, size: int) -> str:
    del mtime_ns, size
    asset_path = _find_asset(path)
    if not asset_path:
        return "missing"

    digest = md5(usedforsecurity=False)
    with asset_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def _asset_fingerprint(path: str) -> str:
    asset_path = _find_asset(path)
    if not asset_path:
        return "missing"
    stat = asset_path.stat()
    return _asset_fingerprint_cached(path, stat.st_mtime_ns, stat.st_size)


@lru_cache(maxsize=128)
def _inline_asset_cached(path: str, mtime_ns: int, size: int) -> str:
    del mtime_ns, size
    asset_path = _find_asset(path)
    if not asset_path:
        return ""
    return asset_path.read_text(encoding="utf-8")


def _inline_asset(path: str) -> str:
    asset_path = _find_asset(path)
    if not asset_path:
        return ""
    stat = asset_path.stat()
    return _inline_asset_cached(path, stat.st_mtime_ns, stat.st_size)


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


@register.simple_tag
def inline_asset(path: str) -> str:
    return mark_safe(_inline_asset(path))
