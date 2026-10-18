from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from pages.housing_api import make_housing_auth_token
from pages.models import LoginAttemptBucket


HOUSING_LOGIN = "/wohnungssuche-api/token-auth/"
LEARNING_LOGIN = "/deutschlive/api/auth/login/"
PASSWORD = "fictional-security-password"


@override_settings(
    DEBUG=True,
    LOGIN_REQUIRED=False,
    ADMIN_IP_WHITELIST=[],
    AUTH_PASSWORD_VALIDATORS=[],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class SharedLoginBudgetTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="security@example.test",
            email="security-alias@example.test",
            password=PASSWORD,
            is_staff=True,
        )

    def login_routes(self):
        return (
            ("/login/", False, 200),
            (LEARNING_LOGIN, True, 400),
            ("/api/auth/login/", True, 400),
            (HOUSING_LOGIN, True, 400),
            (f"/{settings.AUTH_URL_PREFIX.strip('/')}/login/", False, 200),
            (f"/{settings.ADMIN_URL.strip('/')}/login/", False, 200),
        )

    def post_login(self, client, path=HOUSING_LOGIN, *, json=True,
                   username=None, password="fictional-wrong-password", **headers):
        data = {"username": username or self.user.username, "password": password}
        if json:
            return client.post(path, data, content_type="application/json", **headers)
        return client.post(path, data, **headers)

    def test_configured_django_login_renders_the_portfolio_login(self):
        response = self.client.get(f"/{settings.AUTH_URL_PREFIX.strip('/')}/login/")
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "pages/login.html")

    def test_rotating_login_routes_uses_one_shared_budget(self):
        routes = self.login_routes()
        for path, uses_json, failure_status in routes[:5]:
            with self.subTest(allowed_path=path):
                response = self.post_login(self.client, path, json=uses_json)
                self.assertEqual(response.status_code, failure_status)

        for path, uses_json, _failure_status in routes:
            with self.subTest(blocked_path=path):
                response = self.post_login(Client(), path, json=uses_json)
                self.assertEqual(response.status_code, 429)
                self.assertEqual(response["Retry-After"], "900")
                if uses_json:
                    self.assertEqual(response.json()["code"], "login_rate_limited")

    def test_username_email_case_and_whitespace_share_the_budget(self):
        identifiers = (
            self.user.username,
            self.user.email,
            self.user.username.upper(),
            f" {self.user.email.upper()} ",
            f" {self.user.username} ",
        )
        for identifier in identifiers:
            self.assertEqual(self.post_login(self.client, username=identifier).status_code, 400)
        self.assertEqual(self.post_login(self.client).status_code, 429)

    def test_unicode_username_and_email_aliases_share_the_account_budget(self):
        identifiers = (
            "ｓｅｃｕｒｉｔｙ@example.test",
            self.user.username,
            "ｓｅｃｕｒｉｔｙ-alias@example.test",
            self.user.email.upper(),
            " ＳＥＣＵＲＩＴＹ@example.test ",
        )
        for index, identifier in enumerate(identifiers):
            path = HOUSING_LOGIN if index % 2 else LEARNING_LOGIN
            self.assertEqual(self.post_login(self.client, path, username=identifier).status_code, 400)
        self.assertEqual(LoginAttemptBucket.objects.count(), 1)
        for identifier in (self.user.username, self.user.email, identifiers[0]):
            with self.subTest(identifier=identifier):
                self.assertEqual(self.post_login(Client(), username=identifier).status_code, 429)

    def test_unicode_aliases_share_the_budget_before_an_account_exists(self):
        for identifier in (
            "missing-example", "ｍｉｓｓｉｎｇ-example", "ＭＩＳＳＩＮＧ-example",
            " missing-example ", "ｍｉｓｓｉｎｇ-ｅｘａｍｐｌｅ",
        ):
            self.assertEqual(self.post_login(self.client, username=identifier).status_code, 400)
        self.assertEqual(LoginAttemptBucket.objects.count(), 1)
        self.assertEqual(self.post_login(Client(), username="missing-example").status_code, 429)

    def test_forwarded_header_changes_cannot_reset_the_direct_peer_budget(self):
        for attempt in range(5):
            response = self.post_login(
                self.client,
                REMOTE_ADDR="192.0.2.10",
                HTTP_X_FORWARDED_FOR=f"198.51.100.{attempt + 1}",
                HTTP_X_REAL_IP=f"203.0.113.{attempt + 1}",
                HTTP_FORWARDED=f"for=198.51.100.{attempt + 1}",
            )
            self.assertEqual(response.status_code, 400)
        blocked = self.post_login(
            Client(),
            REMOTE_ADDR="192.0.2.10",
            HTTP_X_FORWARDED_FOR="203.0.113.99",
            HTTP_X_REAL_IP="203.0.113.98",
            HTTP_FORWARDED="for=203.0.113.97",
        )
        self.assertEqual(blocked.status_code, 429)

    def test_blocked_account_does_not_consume_other_account_or_peer_budgets(self):
        for _attempt in range(5):
            self.assertEqual(self.post_login(self.client, REMOTE_ADDR="192.0.2.10").status_code, 400)
        self.assertEqual(self.post_login(self.client, REMOTE_ADDR="192.0.2.10").status_code, 429)
        self.assertEqual(self.post_login(self.client, REMOTE_ADDR="192.0.2.11").status_code, 400)
        other = self.post_login(self.client, username="another-example", REMOTE_ADDR="192.0.2.10")
        self.assertEqual(other.status_code, 400)

    def test_successful_login_on_each_route_resets_the_shared_budget(self):
        for path, uses_json, _failure_status in self.login_routes():
            with self.subTest(path=path):
                LoginAttemptBucket.objects.all().delete()
                for _attempt in range(4):
                    self.assertEqual(self.post_login(Client()).status_code, 400)
                success = self.post_login(Client(), path, json=uses_json, password=PASSWORD)
                self.assertEqual(success.status_code, 200 if uses_json else 302)
                for _attempt in range(5):
                    self.assertEqual(self.post_login(Client()).status_code, 400)
                self.assertEqual(self.post_login(Client()).status_code, 429)

    def test_expired_budget_allows_new_attempts_at_the_window_boundary(self):
        started_at = timezone.now()
        with patch("pages.login_security.timezone.now", return_value=started_at):
            for _attempt in range(5):
                self.assertEqual(self.post_login(self.client).status_code, 400)
        with patch("pages.login_security.timezone.now", return_value=started_at + timedelta(seconds=899)):
            self.assertEqual(self.post_login(Client()).status_code, 429)
        with patch("pages.login_security.timezone.now", return_value=started_at + timedelta(seconds=900)):
            self.assertEqual(self.post_login(Client()).status_code, 400)


@override_settings(
    DEBUG=True,
    LOGIN_REQUIRED=False,
    AUTH_PASSWORD_VALIDATORS=[],
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class PasswordBoundTokenTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="token-security-example",
            email="token-security@example.test",
            password=PASSWORD,
        )

    def test_housing_password_change_rejects_old_token_and_accepts_new_login(self):
        old_token = make_housing_auth_token(self.user)
        endpoint = "/wohnungssuche-api/search-profiles/"
        self.assertEqual(self.client.get(endpoint, HTTP_AUTHORIZATION=f"Token {old_token}").status_code, 200)
        self.user.set_password("fictional-new-password")
        self.user.save(update_fields=["password"])

        self.assertEqual(self.client.get(endpoint, HTTP_AUTHORIZATION=f"Token {old_token}").status_code, 401)
        login = self.client.post(HOUSING_LOGIN, {
            "username": self.user.username, "password": "fictional-new-password",
        }, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.client.get(endpoint, HTTP_AUTHORIZATION=f"Token {login.json()['token']}").status_code, 200)

    def test_learning_password_change_rejects_old_cookie_even_with_a_current_session(self):
        login = self.client.post(LEARNING_LOGIN, {
            "username": self.user.username, "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        old_token = self.client.cookies["learning_auth_token"].value
        self.assertEqual(self.client.get("/deutschlive/api/dashboard/").status_code, 200)
        self.user.set_password("fictional-new-password")
        self.user.save(update_fields=["password"])

        current_session = Client()
        current_session.force_login(self.user)
        current_session.cookies["learning_auth_token"] = old_token
        self.assertEqual(current_session.get("/deutschlive/api/dashboard/").status_code, 401)
        login = current_session.post(LEARNING_LOGIN, {
            "username": self.user.username, "password": "fictional-new-password",
        }, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        self.assertEqual(current_session.get("/deutschlive/api/dashboard/").status_code, 200)

    @override_settings(AUTH_TOKEN_MAX_AGE=60)
    def test_learning_expired_cookie_is_rejected_while_session_is_current(self):
        issued_at = 1_900_000_000
        with patch("django.core.signing.time.time", return_value=issued_at):
            login = self.client.post(LEARNING_LOGIN, {
                "username": self.user.username, "password": PASSWORD,
            }, content_type="application/json")
            self.assertEqual(login.status_code, 200)
        old_token = self.client.cookies["learning_auth_token"].value
        current_session = Client()
        current_session.force_login(self.user)
        current_session.cookies["learning_auth_token"] = old_token
        with patch("django.core.signing.time.time", return_value=issued_at + 61):
            self.assertEqual(current_session.get("/deutschlive/api/dashboard/").status_code, 401)
