from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
  """
  One-time token for account activation. Including `is_active` invalidates the
  link as soon as the account is confirmed.
  """

  def _make_hash_value(self, user, timestamp):
    login_timestamp = "" if user.last_login is None else user.last_login.replace(microsecond=0, tzinfo=None)
    email = getattr(user, user.get_email_field_name(), "") or ""
    return f"{user.pk}{user.password}{login_timestamp}{timestamp}{email}{user.is_active}"

  def check_token(self, user, token):
    if not (user and token):
      return False
    try:
      ts_b36, _ = token.split("-")
      ts = base36_to_int(ts_b36)
    except ValueError:
      return False

    for secret in [self.secret, *self.secret_fallbacks]:
      if constant_time_compare(
        self._make_token_with_timestamp(user, ts, secret),
        token,
      ):
        break
    else:
      return False

    timeout = int(getattr(settings, "EMAIL_VERIFICATION_TIMEOUT", settings.PASSWORD_RESET_TIMEOUT))
    if (self._num_seconds(self._now()) - ts) > timeout:
      return False
    return True


email_verification_token_generator = EmailVerificationTokenGenerator()
