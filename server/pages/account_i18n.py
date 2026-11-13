"""Account copy shared by templates, form fields and status messages."""

import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.utils.cache import patch_vary_headers
from django.utils.functional import lazy
from django.utils.translation import get_language, override


@lru_cache(maxsize=1)
def account_translations():
    return json.loads(Path(__file__).with_name("account_translations.json").read_text(encoding="utf-8"))


def account_text(source):
    language = (get_language() or "de").split("-")[0]
    return account_translations().get(str(source), {}).get(language, str(source))


account_text_lazy = lazy(account_text, str)


class AccountLanguageMiddleware:
    """Use the rendered account language for Django's validators as well."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .views import get_preferred_language

        configured_paths = {"/" + str(getattr(settings, name, "")).strip("/") for name in (
            "PASSWORD_RESET_URL", "PASSWORD_RESET_DONE_URL", "PASSWORD_RESET_COMPLETE_URL", "PASSWORD_RESET_INVALID_URL",
        )}
        auth_prefix = "/" + settings.AUTH_URL_PREFIX.strip("/") + "/"
        reset_prefix = "/" + settings.PASSWORD_RESET_CONFIRM_PREFIX.strip("/") + "/"
        account_path = request.path.rstrip("/") in configured_paths | {
            "/login", "/register", "/profil", "/account/delete",
            "/examplemail", "/email-bestaetigung", auth_prefix + "login",
        } or request.path.startswith((
            "/password-reset", reset_prefix, "/verify-email/",
            auth_prefix + "password_reset/", auth_prefix + "reset/",
        ))
        if not account_path:
            return self.get_response(request)
        language = get_preferred_language(request)
        request.LANGUAGE_CODE = language
        with override(language):
            response = self.get_response(request)
            # TemplateResponse must render before leaving the language context.
            if hasattr(response, "render"):
                response.render()
        response.headers.setdefault("Content-Language", language)
        patch_vary_headers(response, ["Accept-Language"])
        return response
