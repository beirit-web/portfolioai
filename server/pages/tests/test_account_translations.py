"""Account pages keep their copy, validation and activation status in one locale."""

import ast
import re
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.messages import get_messages
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import gettext, override

from pages.account_i18n import account_text, account_translations
from pages.local_activation import SESSION_KEY
from pages.tests.test_authentication_forms import configured_auth_routes


@override_settings(
    DEBUG=True, LOCAL_ACCOUNT_ACTIVATION_ENABLED=True,
    ACCOUNT_EMAIL_DELIVERY_ENABLED=False, LOGIN_REQUIRED=False,
    EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    ALLOWED_HOSTS=["localhost", "testserver"],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class AccountTranslationTests(TestCase):
    def test_all_account_copy_has_complete_russian_and_ukrainian_translations(self):
        translations = account_translations()
        root = Path(__file__).resolve().parents[2]
        sources = set()
        templates = list((root / "templates/registration").glob("*")) + [
            root / "templates/pages" / f"{name}.html" for name in ("login", "register", "profile", "delete_account")
        ]
        for path in templates:
            if path.is_file():
                sources.update(re.findall(r'{% account_text "([^"]+)"', path.read_text()))
        for name in ("forms.py", "local_activation.py", "account_views.py", "views.py"):
            tree = ast.parse((root / "pages" / name).read_text())
            sources.update(node.args[0].value for node in ast.walk(tree)
                           if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                           and node.func.id == "account_copy" and node.args and isinstance(node.args[0], ast.Constant))
        for source in sources:
            for language in ("ru", "uk"):
                with self.subTest(source=source, language=language):
                    self.assertTrue(translations.get(source, {}).get(language))

    def test_registration_activation_expiry_and_success_use_the_request_language(self):
        password = "Fictional-language-test-42!"
        for language, heading, code_label in (
            ("ru", "Регистрация", "Код активации"),
            ("uk", "Реєстрація", "Код активації"),
        ):
            with self.subTest(language=language):
                client = Client(HTTP_HOST="localhost", HTTP_ACCEPT_LANGUAGE=language)
                page = client.get(reverse("pages:register"))
                self.assertContains(page, heading)
                self.assertEqual(page["Content-Language"], language)
                self.assertContains(page, f'<html lang="{language}"')
                invalid = client.post(reverse("pages:register"), {})
                with override(language):
                    self.assertContains(invalid, escape(gettext("This field is required.")))
                self.assertNotContains(invalid, "Dieses Feld ist zwingend erforderlich")
                registered = client.post(reverse("pages:register"), {
                    "email": f"locale-{language}@example.test", "password1": password,
                    "password2": password, "privacy_consent": "on",
                })
                self.assertEqual(registered.status_code, 302)
                login = client.get(registered["Location"])
                self.assertContains(login, code_label)
                self.assertContains(login, 'disabled aria-describedby="activation-login-hint"')
                challenge = client.session[SESSION_KEY]
                session = client.session
                session[SESSION_KEY] = {**challenge, "expires_at": (timezone.now() - timedelta(seconds=1)).timestamp()}
                session.save()
                expired = client.post(reverse("pages:login"), {"action": "activate_local", "activation_code": challenge["code"]})
                with override(language):
                    self.assertContains(expired, account_text("Der Aktivierungscode ist abgelaufen. Bitte fordern Sie unter /examplemail einen neuen Code an."))
                client.post(reverse("pages:example_mail"))
                activated = client.post(reverse("pages:login"), {
                    "action": "activate_local", "activation_code": client.session[SESSION_KEY]["code"],
                }, follow=True)
                with override(language):
                    self.assertContains(activated, account_text("Ihr Konto ist aktiviert. Sie können sich jetzt mit E-Mail-Adresse und Passwort anmelden."))
                self.assertNotContains(activated, 'disabled aria-describedby="activation-login-hint"')
        # Lazy class-level field labels must not retain the previous request's locale.
        german = self.client.get(reverse("pages:register"))
        self.assertContains(german, "Registrierung")
        self.assertContains(german, "Mindestens 8 Zeichen")
        self.assertNotContains(german, "Реєстрація")

    def test_password_recovery_and_confirmation_pages_use_request_language(self):
        for language in ("ru", "uk"):
            client = Client(HTTP_ACCEPT_LANGUAGE=language)
            for path, source in (
                ("/password-reset/", "Passwort zurücksetzen"),
                ("/password-reset/done/", "Wiederherstellungslink angefordert"),
                ("/auth/password_reset/", "Passwort zurücksetzen"),
                ("/auth/reset/", "Link ungültig"),
                ("/examplemail", "Lokales Beispielpostfach"),
                ("/email-bestaetigung/", "Neuen Aktivierungscode anfordern"),
            ):
                with self.subTest(language=language, path=path):
                    with override(language):
                        expected = account_text(source)
                    # The local mailbox requires a localhost browser.
                    response = client.get(path, HTTP_HOST="localhost")
                    self.assertEqual(response["Content-Language"], language)
                    self.assertContains(response, expected)
                    self.assertContains(response, f'<html lang="{language}"')

    def test_default_and_configured_auth_login_aliases_use_request_language(self):
        for auth_prefix in ("auth/", "members/"):
            with configured_auth_routes(AUTH_URL_PREFIX=auth_prefix):
                path = reverse("login")
                self.assertEqual(path, f"/{auth_prefix}login/")
                for language in ("ru", "uk"):
                    with self.subTest(path=path, language=language):
                        with override(language):
                            heading = account_text("Anmeldedaten")
                            required = escape(gettext("This field is required."))
                        client = Client(HTTP_ACCEPT_LANGUAGE=language)
                        response = client.get(path)
                        self.assertEqual(response["Content-Language"], language)
                        self.assertContains(response, heading)
                        self.assertContains(response, f'<html lang="{language}"')
                        invalid = client.post(path, {})
                        self.assertContains(invalid, required)

    def test_configured_password_reset_confirmation_uses_request_language(self):
        user = get_user_model().objects.create_user(
            username="translated-recovery@example.test", email="translated-recovery@example.test",
            password="Fictional-translated-recovery-42!",
        )
        with configured_auth_routes(PASSWORD_RESET_CONFIRM_PREFIX="members/confirm/"):
            path = reverse("password_reset_confirm", kwargs={
                "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": default_token_generator.make_token(user),
            })
            self.assertTrue(path.startswith("/members/confirm/"))
            for language in ("ru", "uk"):
                with self.subTest(language=language):
                    with override(language):
                        heading = account_text("Neues Passwort setzen")
                        required = escape(gettext("This field is required."))
                    client = Client(HTTP_ACCEPT_LANGUAGE=language)
                    response = client.get(path, follow=True)
                    self.assertTrue(response.context["validlink"])
                    self.assertEqual(response["Content-Language"], language)
                    self.assertContains(response, heading)
                    self.assertContains(response, f'<html lang="{language}"')
                    invalid = client.post(response.wsgi_request.path, {})
                    self.assertContains(invalid, required)

    @override_settings(SESSION_IDLE_TIMEOUT_SECONDS=180)
    def test_idle_timeout_messages_use_request_language_on_login_and_home(self):
        for language, expected in (
            ("de", "Sie wurden nach 3 Minuten Inaktivität automatisch auf allen Geräten abgemeldet."),
            ("ru", "Вы были автоматически выведены со всех устройств после 3 минут бездействия."),
            ("uk", "Вас було автоматично виведено з усіх пристроїв після 3 хвилин бездіяльності."),
        ):
            for route in ("pages:login", "pages:home"):
                with self.subTest(language=language, route=route):
                    client = Client(HTTP_ACCEPT_LANGUAGE=language)
                    response = client.get(reverse(route), {"reason": "idle"})
                    self.assertEqual(response.status_code, 200)
                    self.assertIn(expected, [str(message) for message in get_messages(response.wsgi_request)])
