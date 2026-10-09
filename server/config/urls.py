from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path
from django.views.generic import TemplateView

from .deutschlive_views import deutschlive_api_not_found, deutschlive_redirect, deutschlive_spa, deutschlive_recordings_archive

handler400 = "config.error_views.bad_request"
handler403 = "config.error_views.permission_denied"
handler404 = "config.error_views.page_not_found"
handler500 = "config.error_views.server_error"

password_reset_patterns = [
    path(settings.PASSWORD_RESET_URL, auth_views.PasswordResetView.as_view(), name="password_reset"),
    path(settings.PASSWORD_RESET_DONE_URL, auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path(
        f"{settings.PASSWORD_RESET_CONFIRM_PREFIX}<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(settings.PASSWORD_RESET_COMPLETE_URL, auth_views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path(
        settings.PASSWORD_RESET_INVALID_URL,
        TemplateView.as_view(template_name="registration/password_reset_invalid.html"),
        name="password_reset_invalid",
    ),
]

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("deutschLive/", deutschlive_redirect, name="deutschlive_legacy_case"),
    path("deutschLive/<path:_path>", deutschlive_redirect, name="deutschlive_legacy_case_spa"),
    path("deutschlive/api/", include("lessons.urls")),
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
    path(settings.AUTH_URL_PREFIX, include("django.contrib.auth.urls")),
    *password_reset_patterns,
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,
                          document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
