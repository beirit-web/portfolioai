"""Stable portfolio links to separately hosted, retired service demos."""

from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.http import HttpResponseRedirect
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_safe

from config.error_views import error_response


@never_cache
@require_safe
def language_services_demo(request):
    # The destination comes only from trusted deployment configuration. Never
    # forward query strings, form submissions, credentials or session tokens.
    destination = getattr(settings, "LANGUAGE_SERVICES_DEMO_URL", "")
    try:
        URLValidator(schemes=["https"])(destination)
        parsed = urlsplit(destination)
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("Expected a public demo URL without credentials.")
    except (ValidationError, ValueError):
        response = error_response(request, 503)
    else:
        response = HttpResponseRedirect(destination)
    response["Referrer-Policy"] = "no-referrer"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response
