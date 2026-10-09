"""
Signal handlers for cache invalidation and related housekeeping.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import EmailMessage
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.urls import reverse

from .models import AccountNotice, CallbackRequest, ChatMessage, ChatReply, InterpreterApplication

logger = logging.getLogger(__name__)

CACHE_KEY_USER_STATS = "footer_user_stats_v2"
HOME_TICKER_CACHE_KEYS = (
  "home_ticker_interpreters_v1:de",
  "home_ticker_interpreters_v1:ru",
)


def _invalidate_user_stats_cache() -> None:
  """
  Clear the cached footer/user stats so counts refresh immediately.
  """
  cache.delete(CACHE_KEY_USER_STATS)


def _invalidate_home_ticker_cache() -> None:
  cache.delete_many(HOME_TICKER_CACHE_KEYS)


def _send_user_mail(to_email: str, subject: str, body: str) -> None:
  if not to_email or not getattr(settings, "EMAIL_HOST", ""):
    return
  try:
    EmailMessage(
      subject=subject,
      body=body,
      from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "") or to_email,
      to=[to_email],
    ).send(fail_silently=False)
  except Exception as exc:
    logger.warning("User notification failed: %s", exc, exc_info=True)


@receiver([post_save, post_delete], sender=InterpreterApplication)
def _on_interpreter_application_change(**_kwargs):
  _invalidate_user_stats_cache()
  _invalidate_home_ticker_cache()


@receiver([post_save, post_delete], sender=get_user_model())
def _on_user_change(**_kwargs):
  _invalidate_user_stats_cache()


@receiver(post_save, sender=ChatReply)
def _notify_user_on_chat_reply(sender, instance: ChatReply, created: bool, **_kwargs):
  if not created:
    return
  users = (
    get_user_model().objects.filter(
      chatmessage__client_hash=instance.client_hash,
      chatmessage__user__isnull=False,
      profile__notify_new_reply=True,
    )
    .distinct()
  )
  profile_url = f"{getattr(settings, 'SITE_URL', '').rstrip('/')}{reverse('pages:profile')}"
  for user in users:
    if not user.email:
      continue
    _send_user_mail(
      user.email,
      "Neue Antwort in Ihrem Konto",
      (
        "Es gibt eine neue Antwort in Ihrem internen Postfach.\n\n"
        f"{instance.text}\n\n"
        f"Zum Konto: {profile_url}"
      ),
    )


@receiver(post_save, sender=AccountNotice)
def _notify_user_on_account_notice(sender, instance: AccountNotice, created: bool, **_kwargs):
  if not created:
    return
  user = instance.user
  profile = getattr(user, "profile", None)
  if not user.email or not profile or not profile.notify_new_message:
    return
  profile_url = f"{getattr(settings, 'SITE_URL', '').rstrip('/')}{reverse('pages:profile')}"
  _send_user_mail(
    user.email,
    instance.title,
    f"{instance.text}\n\nZum Konto: {profile_url}",
  )


@receiver(pre_save, sender=CallbackRequest)
def _remember_callback_request_state(sender, instance: CallbackRequest, **_kwargs):
  if not instance.pk:
    instance._previous_status = None
    instance._previous_scheduled_for = None
    return
  previous = sender.objects.filter(pk=instance.pk).only("status", "scheduled_for").first()
  instance._previous_status = getattr(previous, "status", None)
  instance._previous_scheduled_for = getattr(previous, "scheduled_for", None)


@receiver(post_save, sender=CallbackRequest)
def _notify_user_on_callback_update(sender, instance: CallbackRequest, created: bool, **_kwargs):
  if created:
    return
  previous_status = getattr(instance, "_previous_status", None)
  previous_scheduled_for = getattr(instance, "_previous_scheduled_for", None)
  if previous_status == instance.status and previous_scheduled_for == instance.scheduled_for:
    return

  user = instance.user
  profile = getattr(user, "profile", None)
  if not user.email or not profile or not profile.notify_appointment_changes:
    return

  scheduled_for = (
    instance.scheduled_for.strftime("%d.%m.%Y %H:%M")
    if instance.scheduled_for
    else "Noch nicht terminiert"
  )
  profile_url = f"{getattr(settings, 'SITE_URL', '').rstrip('/')}{reverse('pages:profile')}"
  _send_user_mail(
    user.email,
    "Aktualisierung zu Ihrem Rückrufwunsch",
    (
      f"Status: {instance.get_status_display()}\n"
      f"Geplant für: {scheduled_for}\n"
      f"Hinweis: {instance.note or '-'}\n\n"
      f"Zum Konto: {profile_url}"
    ),
  )
