from django import template
from django.utils.html import format_html

from pages.templatetags.asset_tags import asset_url

register = template.Library()


@register.simple_tag
def contract_icon(name):
    return format_html(
        '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">'
        '<use href="{}#{}"></use></svg>',
        asset_url("contracts/icons.svg"), name,
    )
