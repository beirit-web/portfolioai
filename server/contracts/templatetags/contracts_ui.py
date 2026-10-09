from django import template
from django.templatetags.static import static
from django.utils.html import format_html

register = template.Library()


@register.simple_tag
def contract_icon(name):
    return format_html(
        '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">'
        '<use href="{}#{}"></use></svg>',
        static("contracts/icons.svg"), name,
    )
