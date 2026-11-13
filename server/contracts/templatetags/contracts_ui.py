from django import template
from django.utils.html import format_html

from pages.templatetags.asset_tags import asset_url

register = template.Library()


@register.simple_tag(takes_context=True)
def contract_icon(context, name):
    # The generator already resolves the sprite for the browser configuration.
    # Reuse it across included templates instead of searching static files for
    # every icon. Standalone renders only cache within their current render.
    sprite_url = context.get("config", {}).get("iconsUrl")
    if not sprite_url:
        cache_key = (__name__, "icons_url")
        sprite_url = context.render_context.get(cache_key)
        if sprite_url is None:
            sprite_url = asset_url("contracts/icons.svg")
            context.render_context[cache_key] = sprite_url
    return format_html(
        '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">'
        '<use href="{}#{}"></use></svg>',
        sprite_url, name,
    )
