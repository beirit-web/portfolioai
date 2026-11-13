import logging

from django.apps import AppConfig
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)


class PagesConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "pages"
  verbose_name = "Inhalte und Datenmodelle"

  def ready(self):
    self._ensure_admin_user()

  def _ensure_admin_user(self) -> None:
    """
    Create/update a superuser based on DJANGO_ADMIN_NAME/DJANGO_ADMIN_PASSWORD.
    """
    username = (getattr(settings, "ADMIN_SETUP_USERNAME", "") or "").strip()
    password = getattr(settings, "ADMIN_SETUP_PASSWORD", "")
    email = getattr(settings, "ADMIN_SETUP_EMAIL", "")

    if not username or not password:
      return

    try:
      User = get_user_model()
      user, created = User.objects.get_or_create(
        username=username,
        defaults={
          "email": email,
          "is_staff": True,
          "is_superuser": True,
        },
      )

      updated = False
      if created:
        user.set_password(password)
        updated = True
      else:
        if email and user.email != email:
          user.email = email
          updated = True
        if not user.is_staff or not user.is_superuser:
          user.is_staff = True
          user.is_superuser = True
          updated = True
        if not user.check_password(password):
          user.set_password(password)
          updated = True

      if updated:
        user.save()
        action = "created" if created else "updated"
        logger.info("Admin user %s via env settings (username=%s)", action, username)
    except (OperationalError, ProgrammingError) as exc:
      logger.warning("Skip admin bootstrap (database not ready): %s", exc)
    except Exception:
      logger.exception("Could not ensure admin user via env settings")
