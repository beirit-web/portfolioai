"""Canonical portfolio asset names and compatibility for existing local links."""

from urllib.parse import urlsplit, urlunsplit

from django.urls import path
from django.views.generic import RedirectView


ASSET_RENAMES = {
    "images/aktueles-logo.png": "images/beirit-digital-logo.png",
    "images/aktueles-logo-180.png": "images/beirit-digital-logo-180.png",
    "images/aktueles-logo-160.webp": "images/beirit-digital-logo-160.webp",
    "images/aktueles-logo-320.webp": "images/beirit-digital-logo-320.webp",
    "images/portfolio-test-main-desktop.webp": "images/portfolio-notenrechner-desktop.webp",
    "images/portfolio-vertragsgenerator-main-desktop.webp": "images/portfolio-vertragsgenerator-desktop.webp",
    "images/portfolio-vokabelbox-main-desktop.webp": "images/portfolio-vokabelbox-desktop.webp",
}
OLD_GRADE_PREFIX = "/static/portfolio/test-main/"
GRADE_PREFIX = "/static/portfolio/notenrechner/"


def canonical_portfolio_url(value):
    """Normalize known local URLs while preserving custom URLs and their suffixes."""
    if not value or not value.startswith("/static/"):
        return value
    parts = urlsplit(value)
    if parts.path.startswith(OLD_GRADE_PREFIX):
        pathname = GRADE_PREFIX + parts.path[len(OLD_GRADE_PREFIX):]
    else:
        relative = parts.path[len("/static/"):]
        pathname = "/static/" + ASSET_RENAMES.get(relative, relative)
    return urlunsplit(parts._replace(path=pathname))


urlpatterns = [
    path(
        "static/portfolio/test-main/<path:asset_path>",
        RedirectView.as_view(
            url=GRADE_PREFIX + "%(asset_path)s", permanent=True, query_string=True,
        ),
        name="legacy_grade_calculator_asset",
    ),
    *[
        path(
            "static/" + old,
            RedirectView.as_view(url="/static/" + new, permanent=True, query_string=True),
        )
        for old, new in ASSET_RENAMES.items()
    ],
]
