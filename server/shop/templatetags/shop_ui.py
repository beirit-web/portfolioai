from decimal import Decimal, InvalidOperation

from django import template
from django.templatetags.static import static
from django.utils.html import format_html

register = template.Library()


@register.simple_tag
def shop_icon(name):
    return format_html('<svg class="icon" aria-hidden="true"><use href="{}#{}"></use></svg>', static("shop/icons.svg"), name)


@register.filter
def euros(value):
    try:
        return format(Decimal(value), ",.2f").replace(",", "_").replace(".", ",").replace("_", ".") + " €"
    except (InvalidOperation, TypeError, ValueError):
        return "–"
