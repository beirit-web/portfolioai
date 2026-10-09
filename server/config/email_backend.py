import ssl

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as DjangoEmailBackend
from django.utils.functional import cached_property


class TolerantEmailBackend(DjangoEmailBackend):
    """
    SMTP backend that allows trusting a custom CA or opting out of verification
    (for self-signed dev servers). Defaults to Django's secure context.
    """

    @cached_property
    def ssl_context(self):
        ca_file = getattr(settings, "EMAIL_SSL_CA_FILE", None) or None
        skip_verify = getattr(settings, "EMAIL_SSL_SKIP_VERIFY", False)

        if skip_verify:
            # Only use in trusted/dev environments; disables certificate checks.
            context = ssl._create_unverified_context()
            context.check_hostname = False
        elif ca_file:
            context = ssl.create_default_context(cafile=ca_file)
        else:
            context = ssl.create_default_context()

        if self.ssl_certfile and self.ssl_keyfile:
            context.load_cert_chain(certfile=self.ssl_certfile, keyfile=self.ssl_keyfile)
        elif self.ssl_certfile:
            context.load_cert_chain(certfile=self.ssl_certfile)

        return context
