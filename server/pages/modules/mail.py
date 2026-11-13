import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_notification_email(
  subject: str,
  body: str,
  to_email: str,
  *,
  from_email: str | None = None,
  attachments: list[tuple[str, bytes, str]] | None = None,
):
  """
  Versendet eine einfache Benachrichtigungs-Mail. Fail-silent mit Logging.
  """
  if not to_email:
    return False
  local_backends = {
    "django.core.mail.backends.console.EmailBackend",
    "django.core.mail.backends.locmem.EmailBackend",
    "django.core.mail.backends.filebased.EmailBackend",
    "django.core.mail.backends.dummy.EmailBackend",
  }
  if settings.EMAIL_BACKEND not in local_backends and not getattr(settings, "EMAIL_HOST", ""):
    return False
  try:
    email = EmailMessage(
      subject=subject,
      body=body,
      from_email=from_email or settings.DEFAULT_FROM_EMAIL or to_email,
      to=[to_email],
    )
    for filename, content, mimetype in attachments or []:
      email.attach(filename, content, mimetype)
    email.send(fail_silently=False)
    return True
  except Exception as exc:
    logger.warning("Notification mail failed: %s", exc, exc_info=True)
    return False


def send_account_verification_email(user, activation_url: str):
  """
  Versendet die Bestaetigungs-Mail fuer neue Konten.
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
