import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def _app_url(path: str) -> str:
    base_url = str(getattr(settings, "DEUTSCHLIVE_PUBLIC_URL", "") or "").strip().rstrip("/")
    if not base_url:
        base_url = str(getattr(settings, "SITE_URL", "") or "").strip().rstrip("/")
    if not base_url:
        return path
    return f"{base_url}{path if path.startswith('/') else f'/{path}'}"


def send_email_confirmation(user, token: str) -> bool:
    subject = "DeutschLive: E-Mail bestätigen"
    body = (
        "Здравствуйте!\n\n"
        "Подтвердите E-Mail для DeutschLive.\n\n"
        f"Код подтверждения:\n{token}\n\n"
        f"Откройте приложение: {_app_url('/account')}\n\n"
        "Если вы не создавали аккаунт, просто проигнорируйте это письмо.\n"
    )
    return _send_user_mail(user.email, subject, body)


def send_password_reset(user, token: str) -> bool:
    subject = "DeutschLive: Passwort zurücksetzen"
    body = (
        "Здравствуйте!\n\n"
        "Для сброса пароля используйте этот код в DeutschLive.\n\n"
        f"Код сброса пароля:\n{token}\n\n"
        f"Откройте приложение: {_app_url('/account')}\n\n"
        "Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n"
    )
    return _send_user_mail(user.email, subject, body)


def _send_user_mail(to_email: str, subject: str, body: str) -> bool:
    to_email = (to_email or "").strip()
    if not to_email:
        return False
    try:
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "") or None,
            to=[to_email],
        )
        email.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.warning("DeutschLive mail failed: %s", exc, exc_info=True)
        return False
