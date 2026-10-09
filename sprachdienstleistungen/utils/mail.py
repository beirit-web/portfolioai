import logging
import smtplib

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

def is_smtp_available():
  """
  Schneller Verfügbarkeits-Check: konfiguriert = True.
  Kein Verbindungsaufbau, damit im UI keine false negatives durch Firewalls entstehen.
  """
  host = getattr(settings, "EMAIL_HOST", "") or ""
  user = getattr(settings, "EMAIL_HOST_USER", "") or ""
  return bool(host.strip() and user.strip())


def send_notification_email(subject: str, body: str, to_email: str, *, from_email: str | None = None):
  """
  Versendet eine einfache Benachrichtigungs-Mail. Fail-silent mit Logging.
  """
  if not to_email or not getattr(settings, "EMAIL_HOST", ""):
    return False
  try:
    email = EmailMessage(
      subject=subject,
      body=body,
      from_email=from_email or settings.DEFAULT_FROM_EMAIL or to_email,
      to=[to_email],
    )
    email.send(fail_silently=False)
    return True
  except Exception as exc:
    logger.warning("Notification mail failed: %s", exc, exc_info=True)
    return False


def send_account_verification_email(user, activation_url: str):
  """
  Versendet die Bestätigungs-Mail für neue Konten.
  """
  to_email = (getattr(user, "email", "") or "").strip()
  if not to_email:
    return False

  timeout_seconds = int(getattr(settings, "EMAIL_VERIFICATION_TIMEOUT", 0) or 0)
  valid_for_days = max(1, (timeout_seconds + 86399) // 86400) if timeout_seconds else 3
  context = {
    "user": user,
    "activation_url": activation_url,
    "site_url": getattr(settings, "SITE_URL", ""),
    "valid_for_days": valid_for_days,
  }

  try:
    subject = render_to_string(
      "registration/email_verification_subject.txt",
      context,
    ).strip()
    body = render_to_string(
      "registration/email_verification_email.txt",
      context,
    )
    email = EmailMessage(
      subject=subject,
      body=body,
      from_email=settings.DEFAULT_FROM_EMAIL or to_email,
      to=[to_email],
    )
    email.send(fail_silently=False)
    return True
  except Exception as exc:
    logger.warning("Account verification mail failed: %s", exc, exc_info=True)
    return False
