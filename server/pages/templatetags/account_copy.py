from django import template

from pages.account_i18n import account_text


register = template.Library()
register.simple_tag(account_text, name="account_text")
