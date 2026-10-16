import json
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.http import HttpResponse, HttpResponseNotAllowed, JsonResponse, StreamingHttpResponse
from django.test import Client, RequestFactory, SimpleTestCase, override_settings
from django.urls import path

from config.middleware import (
    AdminIPRestrictionMiddleware,
    AuthSessionIdleTimeoutMiddleware,
    HostRedirectMiddleware,
    LoginRequiredMiddleware,
    SafeHostAndErrorMiddleware,
    SafeStatusPageMiddleware,
)


def broken_view(request):
    raise RuntimeError("fictional-debug-exception")


urlpatterns = [
    path("broken/", broken_view),
    path("deutschlive/api/broken/", broken_view),
    path("wohnungssuche-api/broken/", broken_view),
]


@override_settings(LOGIN_REQUIRED=True, LOGIN_URL="/login/", ADMIN_URL="admin/")
class LoginRequiredMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def anonymous_request(self, method, target):
        request = self.factory.generic(method, target)
        request.user = SimpleNamespace(is_authenticated=False)
        return request

    def test_get_and_head_preserve_the_complete_return_url(self):
        middleware = LoginRequiredMiddleware(lambda request: HttpResponse("Private"))
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                request = self.anonymous_request(method, "/private/?one=1&two=a%2Bb&next=%2Fother%2F")
                response = middleware(request)
                self.assertEqual(response.status_code, 302)
                self.assertEqual(urlsplit(response["Location"]).path, "/login/")
                self.assertEqual(parse_qs(urlsplit(response["Location"]).query), {"next": [request.get_full_path()]})

    def test_post_still_requires_authentication(self):
        middleware = LoginRequiredMiddleware(lambda request: HttpResponse("Private"))
        response = middleware(self.anonymous_request("POST", "/private/"))
        self.assertEqual(response.status_code, 401)

    @override_settings(
        AUTH_URL_PREFIX="members/",
        PASSWORD_RESET_URL="recover/start/",
        PASSWORD_RESET_DONE_URL="recover/sent/",
        PASSWORD_RESET_CONFIRM_PREFIX="recover/confirm/",
        PASSWORD_RESET_COMPLETE_URL="recover/complete/",
        PASSWORD_RESET_INVALID_URL="recover/invalid/",
    )
    def test_configured_authentication_and_reset_routes_are_public(self):
        middleware = LoginRequiredMiddleware(lambda request: HttpResponse("Public"))
        for target in (
            "/members/password_reset/", "/recover/start/", "/recover/sent/",
            "/recover/confirm/fictional/token/", "/recover/complete/", "/recover/invalid/",
        ):
            with self.subTest(target=target):
                response = middleware(self.anonymous_request("GET", target))
                self.assertEqual(response.status_code, 200)
        response = middleware(self.anonymous_request("GET", "/recover/private/"))
        self.assertEqual(response.status_code, 302)


class SafeStatusPageMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_html_replacement_preserves_protocol_headers_and_cookies(self):
        original = HttpResponseNotAllowed(["POST"])
        original["Cache-Control"] = "private, no-store"
        original["Vary"] = "Cookie"
        original.set_cookie("example", "fictional", httponly=True, samesite="Lax")
        response = SafeStatusPageMiddleware(lambda request: original)(self.factory.get("/example/"))
        self.assertEqual(response.status_code, 405)
        self.assertEqual(response["Allow"], "POST")
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(set(response["Vary"].split(", ")), {"Cookie", "Accept", "X-Requested-With"})
        self.assertEqual(response.cookies["example"].OutputString(), original.cookies["example"].OutputString())
        self.assertIn("Methode nicht erlaubt", response.content.decode())

    def test_replacement_removes_headers_for_the_original_body(self):
        original = HttpResponse("Internal details", status=503, content_type="text/plain")
        original["Retry-After"] = "60"
        for header, value in {
            "Content-Length": "16", "Content-Encoding": "gzip", "ETag": '"fictional"',
            "Digest": "sha-256=example", "Content-Digest": "sha-256=:example:",
        }.items():
            original[header] = value
        response = SafeStatusPageMiddleware(lambda request: original)(self.factory.get("/example/"))
        self.assertEqual(response["Retry-After"], "60")
        self.assertTrue(response["Content-Type"].startswith("text/html"))
        for header in ("Content-Length", "Content-Encoding", "ETag", "Digest", "Content-Digest"):
            self.assertNotIn(header, response)
        self.assertNotIn(b"Internal details", response.content)

    def test_api_text_errors_use_neutral_json_and_json_errors_are_preserved(self):
        for target in ("/api/example/", "/deutschlive/api/example/", "/wohnungssuche-api/example/", "/botanic/api/example/"):
            with self.subTest(target=target):
                original = HttpResponse("API error", status=400)
                response = SafeStatusPageMiddleware(lambda request: original)(self.factory.get(target))
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response["Content-Type"], "application/json")
                self.assertEqual(json.loads(response.content)["status"], 400)
                self.assertNotIn(b"API error", response.content)
        original = HttpResponse('{"detail": "example"}', status=400, content_type="application/problem+json")
        response = SafeStatusPageMiddleware(lambda request: original)(self.factory.get("/example/"))
        self.assertIs(response, original)

    def test_streaming_errors_are_preserved(self):
        original = StreamingHttpResponse(iter([b"Unavailable"]), status=503)
        response = SafeStatusPageMiddleware(lambda request: original)(self.factory.get("/example/"))
        self.assertIs(response, original)


class SafeHostAndErrorMiddlewareTests(SimpleTestCase):
    def test_django_host_patterns_trailing_dots_and_ipv6_are_accepted(self):
        for allowed, host in (
            ([".example.com"], "sub.example.com"),
            (["example.com"], "example.com.:8000"),
            (["[::1]"], "[::1]:8000"),
        ):
            with self.subTest(host=host), override_settings(ALLOWED_HOSTS=allowed, DEBUG=False):
                request = RequestFactory().get("/", HTTP_HOST=host)
                response = SafeHostAndErrorMiddleware(lambda request: HttpResponse("OK"))(request)
                self.assertEqual(response.status_code, 200)

    @override_settings(ALLOWED_HOSTS=["portfolio.example.com"], DEBUG=True)
    def test_unlisted_hosts_are_rejected_in_debug_mode(self):
        request = RequestFactory().get("/", HTTP_HOST="unlisted.example.com")
        response = SafeHostAndErrorMiddleware(lambda request: HttpResponse("Private"))(request)
        self.assertEqual(response.status_code, 404)
        self.assertNotIn(b"Private", response.content)

    @override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
    def test_debug_json_and_streaming_errors_are_preserved(self):
        for original, target in (
            (JsonResponse({"detail": "example"}, status=500), "/example/"),
            (HttpResponse('{"detail": "example"}', status=404, content_type="application/problem+json"), "/example/"),
            (StreamingHttpResponse(iter([b"Unavailable"]), status=500), "/example/"),
        ):
            with self.subTest(content_type=original["Content-Type"]):
                response = SafeHostAndErrorMiddleware(lambda request: original)(RequestFactory().get(target))
                self.assertIs(response, original)

    @override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
    def test_debug_plain_api_errors_become_neutral_json_with_metadata(self):
        for status, target in ((404, "/deutschlive/api/example/"), (500, "/wohnungssuche-api/example/")):
            with self.subTest(target=target):
                original = HttpResponse("Internal API details", status=status)
                original["Cache-Control"] = "private, no-store"
                original["Retry-After"] = "60"
                original["Content-Length"] = "20"
                original["ETag"] = '"fictional"'
                original.set_cookie("example", "fictional", httponly=True)
                response = SafeHostAndErrorMiddleware(lambda request: original)(RequestFactory().get(target))
                self.assertEqual(response.status_code, status)
                self.assertEqual(response["Content-Type"], "application/json")
                self.assertEqual(json.loads(response.content)["status"], status)
                self.assertNotIn(b"Internal API details", response.content)
                self.assertEqual(response["Cache-Control"], "private, no-store")
                self.assertEqual(response["Retry-After"], "60")
                self.assertNotIn("Content-Length", response)
                self.assertNotIn("ETag", response)
                self.assertEqual(response.cookies["example"].OutputString(), original.cookies["example"].OutputString())


@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    LOGIN_REQUIRED=False,
    MAINTENANCE_MODE=False,
    SECURE_SSL_REDIRECT=False,
    ROOT_URLCONF=__name__,
)
class SafeHostAndErrorMiddlewareIntegrationTests(SimpleTestCase):
    # Use settings.MIDDLEWARE so host validation is checked against CommonMiddleware
    # and SecurityMiddleware as well as the error handler itself.
    def test_unlisted_host_is_neutral_with_and_without_https_redirects(self):
        for ssl_redirect in (False, True):
            with self.subTest(ssl_redirect=ssl_redirect), override_settings(SECURE_SSL_REDIRECT=ssl_redirect):
                response = Client(raise_request_exception=False).get("/broken/", HTTP_HOST="unlisted.example.com")
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("Location", response)
                self.assertNotIn(b"DisallowedHost", response.content)
                self.assertNotIn(b"Invalid HTTP_HOST", response.content)
                self.assertIn("Seite nicht gefunden", response.content.decode())
                self.assertEqual(response["X-Content-Type-Options"], "nosniff")
                self.assertEqual(response["X-Frame-Options"], "DENY")

    def test_real_django_exception_uses_neutral_html(self):
        with self.assertLogs("django.request", level="ERROR"):
            response = Client(raise_request_exception=False).get("/broken/")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn(b"fictional-debug-exception", response.content)
        self.assertIn("Kurzzeitig nicht verfügbar", response.content.decode())
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_real_django_exceptions_use_neutral_json_for_api_and_json_requests(self):
        for target, headers in (
            ("/broken/", {"HTTP_ACCEPT": "application/json"}),
            ("/deutschlive/api/broken/", {}),
            ("/wohnungssuche-api/broken/", {}),
        ):
            with self.subTest(target=target), self.assertLogs("django.request", level="ERROR"):
                response = Client(raise_request_exception=False).get(target, **headers)
                self.assertEqual(response.status_code, 500)
                self.assertEqual(response["Content-Type"], "application/json")
                self.assertEqual(response.json()["title"], "Kurzzeitig nicht verfügbar")
                self.assertEqual(response.json()["status"], 500)
                self.assertNotIn(b"fictional-debug-exception", response.content)
                self.assertNotIn(b"Traceback", response.content)
                self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_generated_debug_404_uses_neutral_html_or_json(self):
        for target, headers, wants_json in (
            ("/fictional-missing/", {}, False),
            ("/fictional-missing/", {"HTTP_ACCEPT": "application/json"}, True),
            ("/deutschlive/api/fictional-missing/", {}, True),
        ):
            with self.subTest(target=target, wants_json=wants_json):
                response = Client(raise_request_exception=False).get(target, **headers)
                self.assertEqual(response.status_code, 404)
                self.assertNotIn(b"URLconf", response.content)
                self.assertNotIn(b"DEBUG", response.content)
                if wants_json:
                    self.assertEqual(response["Content-Type"], "application/json")
                    self.assertEqual(response.json()["title"], "Seite nicht gefunden")
                else:
                    self.assertTrue(response["Content-Type"].startswith("text/html"))
                    self.assertIn("Seite nicht gefunden", response.content.decode())


@override_settings(ALLOWED_HOSTS=["*"], SITE_URL="https://portfolio.example.com:8443")
class HostRedirectMiddlewareTests(SimpleTestCase):
    @override_settings(REDIRECT_OLD_HOSTS=["portfolio.example.com"])
    def test_canonical_host_with_a_port_does_not_redirect_to_itself(self):
        request = RequestFactory().get("/example/", HTTP_HOST="portfolio.example.com:8443")
        response = HostRedirectMiddleware(lambda request: HttpResponse("OK"))(request)
        self.assertEqual(response.status_code, 200)

    def test_legacy_domains_and_ipv6_addresses_with_ports_redirect(self):
        for legacy in ("legacy.example.com:8000", "[2001:db8::1]:8000"):
            with self.subTest(legacy=legacy), override_settings(REDIRECT_OLD_HOSTS=[legacy]):
                request = RequestFactory().get("/example/?one=1&two=2", HTTP_HOST=legacy)
                response = HostRedirectMiddleware(lambda request: HttpResponse("OK"))(request)
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], "https://portfolio.example.com:8443/example/?one=1&two=2")


@override_settings(ADMIN_URL="admin/", ADMIN_IP_WHITELIST={"127.0.0.1"})
class AdminIPRestrictionMiddlewareTests(SimpleTestCase):
    def test_missing_and_unlisted_remote_addresses_are_rejected(self):
        middleware = AdminIPRestrictionMiddleware(lambda request: HttpResponse("Admin"))
        for address in (None, "192.0.2.1"):
            with self.subTest(address=address):
                request = RequestFactory().get("/admin/")
                if address is None:
                    request.META.pop("REMOTE_ADDR", None)
                else:
                    request.META["REMOTE_ADDR"] = address
                response = middleware(request)
                self.assertEqual(response.status_code, 404)
        response = middleware(RequestFactory().get("/admin/"))
        self.assertEqual(response.status_code, 200)


class IdleTimeoutMiddlewareTests(SimpleTestCase):
    def test_expired_sessions_on_api_routes_return_json_without_accept_header(self):
        state = SimpleNamespace(valid=False, reason="session_revoked")
        for target in ("/deutschlive/api/example/", "/wohnungssuche-api/example/"):
            with self.subTest(target=target), patch("config.middleware.check_authenticated_session", return_value=state), patch("config.middleware.logout"):
                request = RequestFactory().get(target)
                response = AuthSessionIdleTimeoutMiddleware(lambda request: HttpResponse("Private"))(request)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(json.loads(response.content)["reason"], "session_revoked")
                self.assertEqual(response["Content-Type"], "application/json")
