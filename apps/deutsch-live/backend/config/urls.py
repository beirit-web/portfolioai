from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.views.decorators.cache import never_cache

from .views import spa_index


def secure_admin_permission(request):
    user = request.user
    if not user.is_active or not user.is_staff:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name__in=["mentor", "content_manager"]).exists()


admin.site.has_permission = secure_admin_permission


urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/", include("lessons.urls")),
    path("", never_cache(spa_index)),
    path("<path:_path>", never_cache(spa_index)),
]
