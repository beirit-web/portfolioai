from decimal import Decimal, InvalidOperation
from functools import lru_cache
import json
from pathlib import Path

from django import template
from django.templatetags.static import static
from django.utils.html import format_html

register = template.Library()

# These sizes mirror the existing catalog grid, including its wider displays.
CATALOG_IMAGE_SIZES = (
    "(min-width: 3000px) calc((min(100vw - 96px, 3600px) - 240px) / 8), "
    "(min-width: 2200px) calc((100vw - 284px) / 6), "
    "(min-width: 1800px) calc((100vw - 258px) / 5), "
    "(min-width: 1600px) calc((100vw - 232px) / 4), "
    "(min-width: 1320px) 296px, "
    "(min-width: 1200px) calc((100vw - 136px) / 4), "
    "(min-width: 900px) calc((100vw - 110px) / 3), "
    "(min-width: 540px) calc((100vw - 80px) / 2), "
    "(max-width: 359px) calc(100vw - 30px), calc(100vw - 38px)"
)
DETAIL_IMAGE_SIZES = (
    "(min-width: 1320px) 608px, (min-width: 900px) calc((100vw - 104px) / 2), "
    "(min-width: 540px) calc(100vw - 56px), (max-width: 359px) calc(100vw - 28px), calc(100vw - 36px)"
)


@lru_cache(maxsize=1)
def _product_images():
    manifest = Path(__file__).resolve().parents[1] / "static" / "shop" / "products" / "responsive-images.json"
    try:
        return json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


@register.simple_tag
def product_image(product, variant="catalog", eager=False):
    """Advertise checked local variants; custom admin URLs retain their fallback."""
    source = str(product.image_url)
    image = _product_images().get(source, {})
    candidates = image.get("candidates", [])
    responsive = ""
    if candidates:
        sizes = {
            "catalog": CATALOG_IMAGE_SIZES,
            "detail": DETAIL_IMAGE_SIZES,
            "cart": "(min-width: 540px) 80px, (max-width: 359px) 48px, 64px",
        }.get(variant, CATALOG_IMAGE_SIZES)
        responsive = format_html(
            ' srcset="{}" sizes="{}"',
            ", ".join(f"{static(candidate['path'])} {candidate['width']}w" for candidate in candidates),
            sizes if eager else f"auto, {sizes}",
        )
    loading = format_html(' loading="{}" fetchpriority="{}"', "eager", "high") if eager else format_html(' loading="{}"', "lazy")
    return format_html(
        '<img src="{}" alt="{}" width="{}" height="{}" decoding="async"{}{}>',
        source, product.name, image.get("width", 620), image.get("height", 620), responsive, loading,
    )


@register.simple_tag
def shop_icon(name):
    return format_html('<svg class="icon" aria-hidden="true"><use href="{}#{}"></use></svg>', static("shop/icons.svg"), name)


@register.filter
def euros(value):
    try:
        return format(Decimal(value), ",.2f").replace(",", "_").replace(".", ",").replace("_", ".") + " €"
    except (InvalidOperation, TypeError, ValueError):
        return "–"
