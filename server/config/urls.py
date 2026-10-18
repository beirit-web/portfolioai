from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

from pages.views import login_view
from pages.account_views import (
    AccountPasswordResetView, AccountPasswordResetDoneView,
    AccountPasswordResetConfirmView, AccountPasswordResetCompleteView,
)

from .asset_redirects import urlpatterns as legacy_asset_patterns
from .deutschlive_views import (
    deutschlive_api_not_found,
    deutschlive_recordings_archive,
    deutschlive_redirect,
    deutschlive_spa,
)

handler400 = "config.error_views.bad_request"
handler403 = "config.error_views.permission_denied"
handler404 = "config.error_views.page_not_found"
handler500 = "config.error_views.server_error"

password_reset_patterns = [
    path(settings.PASSWORD_RESET_URL, AccountPasswordResetView.as_view(), name="password_reset"),
    path(settings.PASSWORD_RESET_DONE_URL, AccountPasswordResetDoneView.as_view(), name="password_reset_done"),
    path(
        f"{settings.PASSWORD_RESET_CONFIRM_PREFIX}<uidb64>/<token>/",
        AccountPasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(settings.PASSWORD_RESET_COMPLETE_URL, AccountPasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path(
        settings.PASSWORD_RESET_INVALID_URL,
        TemplateView.as_view(template_name="registration/password_reset_invalid.html"),
        name="password_reset_invalid",
    ),
]

urlpatterns = [
    *legacy_asset_patterns,
    path(settings.ADMIN_URL, admin.site.urls),
    path("deutschLive/", deutschlive_redirect, name="deutschlive_legacy_case"),
    path("deutschLive/<path:_path>", deutschlive_redirect, name="deutschlive_legacy_case_spa"),
    path("deutschlive/api/", include("lessons.urls")),
    # Keep root and nested API misses out of the HTML SPA fallback below.
    path("deutschlive/api", deutschlive_api_not_found),
    path("deutschlive/api/", deutschlive_api_not_found),
    path("deutschlive/api/<path:_path>", deutschlive_api_not_found),
    path("deutschlive/recordings-archiv", deutschlive_recordings_archive, name="deutschlive_recordings_archive"),
    path("deutschlive/", deutschlive_spa, name="deutschlive"),
    path("deutschlive/<path:_path>", deutschlive_spa, name="deutschlive_spa"),
    path("api/shop/", include("shop.urls")),
    path("shop/", include("shop.storefront_urls")),
    path("vertragsgenerator/", include("contracts.urls")),
    path("botanic/", include("botanic.urls")),
    path("", include("pages.urls")),
    # Keep Django's named auth URLs while sharing the portfolio login UI/session rules.
    path(f"{settings.AUTH_URL_PREFIX}login/", login_view),
    path(f"{settings.AUTH_URL_PREFIX}password_reset/", AccountPasswordResetView.as_view()),
    path(f"{settings.AUTH_URL_PREFIX}password_reset/done/", AccountPasswordResetDoneView.as_view()),
    path(f"{settings.AUTH_URL_PREFIX}reset/<uidb64>/<token>/", AccountPasswordResetConfirmView.as_view()),
    path(f"{settings.AUTH_URL_PREFIX}reset/done/", AccountPasswordResetCompleteView.as_view()),
    path(settings.AUTH_URL_PREFIX, include("django.contrib.auth.urls")),
    *password_reset_patterns,
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,
                          document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
