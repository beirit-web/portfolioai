from dataclasses import dataclass
from datetime import datetime, time
from typing import Optional

from django.conf import settings
from django.utils import timezone

from utils.mail import is_smtp_available


@dataclass(frozen=True)
class ServiceWindow:
  """
  Zeitfenster für Uploads (Start/Ende + Wochenende-Block).
  """

  start: time
  end: time
  block_weekends: bool


def _build_service_window() -> ServiceWindow:
  start_hour = int(getattr(settings, "UPLOAD_SERVICE_START_HOUR", 9))
  end_hour = int(getattr(settings, "UPLOAD_SERVICE_END_HOUR", 18))
  block_weekends = getattr(settings, "UPLOAD_SERVICE_BLOCK_WEEKENDS", True)
  return ServiceWindow(
    start=time(start_hour, 0),
    end=time(end_hour, 0),
    block_weekends=block_weekends,
  )


def is_service_open(now: Optional[datetime] = None, window: Optional[ServiceWindow] = None) -> bool:
  """
  True, wenn aktuelle Zeit innerhalb Start/Ende liegt und kein Wochenende (falls blockiert).
  """
  window = window or _build_service_window()
  reference = now or timezone.localtime()
  current = reference.time()
  weekday = reference.weekday()
  is_weekend = window.block_weekends and weekday >= 5
  return window.start <= current <= window.end and not is_weekend


def get_upload_availability_error(now: Optional[datetime] = None) -> Optional[str]:
  """
  Liefert einen Error-Key, wenn Uploads nicht angenommen werden können.
  """
  if not is_service_open(now=now):
    return "service_closed"
  if not is_smtp_available():
    return "smtp_unavailable"
  return None


def can_accept_uploads(now: Optional[datetime] = None) -> bool:
  """
  Service muss offen sein und SMTP erreichbar sein.
  """
  return get_upload_availability_error(now=now) is None
