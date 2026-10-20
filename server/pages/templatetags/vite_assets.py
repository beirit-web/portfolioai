import json
from pathlib import Path

from django import template
from django.conf import settings
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

register = template.Library()


def _static_url(path: str) -> str:
    static_url = getattr(settings, "STATIC_URL", "/static/")
    return f"{static_url.rstrip('/')}/{path.lstrip('/')}"


def _modulepreload_tags(manifest, entries, *, priority_attribute="", exclude=()):
    """Preload static dependencies once, leaving dynamic route imports lazy."""
    tags = []
    seen_entries = set(exclude)
    seen_files = set()

    def visit(entry):
        if entry in seen_entries:
            return
        seen_entries.add(entry)
        chunk = manifest.get(entry, {})
        module_file = chunk.get("file", "")
        if module_file.endswith(".js") and module_file not in seen_files:
            seen_files.add(module_file)
            tags.append(format_html(
                '<link rel="modulepreload" href="{}"{}>',
                _static_url(f"portfolio-dist/{module_file}"),
                priority_attribute,
            ))
        for imported in chunk.get("imports", []):
            visit(imported)

    for entry in entries:
        visit(entry)
    return tags


@register.simple_tag
def vite_react_assets(entry: str, fetchpriority=None) -> str:
    manifest_path = (
        Path(settings.SERVER_DIR)
        / "assets"
        / "portfolio-dist"
        / ".vite"
        / "manifest.json"
    )
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return mark_safe("<!-- React build missing: run npm run build in frontend/ -->")

    chunk = manifest.get(entry)
    if not chunk:
        return mark_safe(f"<!-- React entry missing: {entry} -->")

    priority_attribute = (
        format_html(' fetchpriority="{}"', fetchpriority)
        if fetchpriority in {"high", "low", "auto"}
        else ""
    )
    # Discover nested static dependencies in the HTML too, rather than waiting
    # for the browser to fetch and parse each parent module in turn.
    tags = _modulepreload_tags(
        manifest, chunk.get("imports", []),
        priority_attribute=priority_attribute, exclude={entry},
    )
    tags.append(
        format_html(
            '<script type="module" crossorigin src="{}"{}></script>',
            _static_url(f"portfolio-dist/{chunk['file']}"),
            priority_attribute,
        )
    )
    return format_html_join("\n", "{}", ((tag,) for tag in tags))


@register.simple_tag
def vite_modulepreload_assets(*entries: str) -> str:
    """Start route-specific modules early without loading unrelated lazy routes."""
    manifest_path = (
        Path(settings.SERVER_DIR)
        / "assets"
        / "portfolio-dist"
        / ".vite"
        / "manifest.json"
    )
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return mark_safe("")

    tags = _modulepreload_tags(manifest, entries)
    return format_html_join("\n", "{}", ((tag,) for tag in tags))


@register.simple_tag
def vite_css_assets(*entries: str) -> str:
    manifest_path = (
        Path(settings.SERVER_DIR)
        / "assets"
        / "portfolio-dist"
        / ".vite"
        / "manifest.json"
    )
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return mark_safe("")

    tags = []
    seen = set()
    for entry in entries:
        chunk = manifest.get(entry, {})
        chunk_file = chunk.get("file", "")
        css_files = []
        if chunk_file.endswith(".css"):
            css_files.append(chunk_file)
        css_files.extend(chunk.get("css", []))
        for css_file in css_files:
            if css_file in seen:
                continue
            seen.add(css_file)
            tags.append(
                format_html(
                    '<link rel="stylesheet" href="{}">',
                    _static_url(f"portfolio-dist/{css_file}"),
                )
            )

    return format_html_join("\n", "{}", ((tag,) for tag in tags))


@register.simple_tag
def vite_inline_css_assets(*entries: str) -> str:
    manifest_path = (
        Path(settings.SERVER_DIR)
        / "assets"
        / "portfolio-dist"
        / ".vite"
        / "manifest.json"
    )
    assets_dir = Path(settings.SERVER_DIR) / "assets" / "portfolio-dist"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return mark_safe("")

    inline_blocks = []
    seen = set()
    for entry in entries:
        chunk = manifest.get(entry, {})
        chunk_file = chunk.get("file", "")
        css_files = []
        if chunk_file.endswith(".css"):
            css_files.append(chunk_file)
        css_files.extend(chunk.get("css", []))
        for css_file in css_files:
            if css_file in seen:
                continue
            seen.add(css_file)
            try:
                css = (assets_dir / css_file).read_text(encoding="utf-8")
            except OSError:
                continue
            inline_blocks.append(f"<style data-vite-inline='{entry}'>{css}</style>")

    return mark_safe("\n".join(inline_blocks))


@register.simple_tag
def vite_css_asset_urls(*entries: str) -> str:
    manifest_path = (
        Path(settings.SERVER_DIR)
        / "assets"
        / "portfolio-dist"
        / ".vite"
        / "manifest.json"
    )
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return mark_safe("[]")

    urls = []
    seen = set()
    for entry in entries:
        chunk = manifest.get(entry, {})
        chunk_file = chunk.get("file", "")
        css_files = []
        if chunk_file.endswith(".css"):
            css_files.append(chunk_file)
        css_files.extend(chunk.get("css", []))
        for css_file in css_files:
            if css_file in seen:
                continue
            seen.add(css_file)
            urls.append(_static_url(f"portfolio-dist/{css_file}"))

    return mark_safe(json.dumps(urls))
