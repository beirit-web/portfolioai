from unittest.mock import patch

from django.core.exceptions import BadRequest, PermissionDenied
from django.http import Http404, HttpResponse
from django.template.loader import render_to_string
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.urls import path

from config import error_views


handler400 = "config.error_views.bad_request"
handler403 = "config.error_views.permission_denied"
handler404 = "config.error_views.page_not_found"
handler500 = "config.error_views.server_error"


def broken_view(request, status):
    exception_type = {400: BadRequest, 403: PermissionDenied, 404: Http404, 500: RuntimeError}[status]
    raise exception_type("fictional-private-error")


def metadata_error(request):
    response = HttpResponse("Internal details", status=405, content_type="text/plain")
    for header, value in {
        "Allow": "POST", "Retry-After": "60", "WWW-Authenticate": 'Basic realm="example"',
        "Cache-Control": "private, no-store", "Vary": "Cookie", "Content-Length": "16",
        "Content-Encoding": "gzip", "ETag": '"fictional"', "Digest": "sha-256=example",
    }.items():
        response[header] = value
    response.set_cookie("example", "fictional", httponly=True, samesite="Lax")
    return response


urlpatterns = [
    path("broken/<int:status>/", broken_view),
    path("api/broken/<int:status>/", broken_view),
    path("deutschlive/api/broken/<int:status>/", broken_view),
    path("wohnungssuche-api/broken/<int:status>/", broken_view),
    path("botanic/api/broken/<int:status>/", broken_view),
    path("metadata/", metadata_error),
    path("api/metadata/", metadata_error),
]


class ErrorResponseTests(SimpleTestCase):
    def test_early_html_handlers_keep_status_and_hide_exception_details(self):
        request = RequestFactory().get("/fictional-missing/")
        for status, handler in (
            (400, error_views.bad_request), (403, error_views.permission_denied),
            (404, error_views.page_not_found), (500, error_views.server_error),
        ):
            with self.subTest(status=status):
                args = (request,) if status == 500 else (request, Exception("fictional-private-error"))
                response = handler(*args)
                self.assertEqual(response.status_code, status)
                self.assertTrue(response["Content-Type"].startswith("text/html"))
                self.assertNotIn(b"fictional-private-error", response.content)
                self.assertTrue(response.status_page_handled)

    def test_accept_preferences_and_ajax_choose_the_response_format(self):
        for headers, wants_json in (
            ({}, False),
            ({"HTTP_ACCEPT": "application/json"}, True),
            ({"HTTP_ACCEPT": "text/html, application/json;q=0.2"}, False),
            ({"HTTP_ACCEPT": "application/json;q=0, text/html"}, False),
            ({"HTTP_ACCEPT": "application/problem+json"}, True),
            ({"HTTP_ACCEPT": "application/vnd.api+json, text/html;q=0.2"}, True),
            ({"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}, True),
        ):
            with self.subTest(headers=headers):
                response = error_views.error_response(RequestFactory().get("/missing/", **headers), 404)
                self.assertEqual(response["Content-Type"] == "application/json", wants_json)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(set(response["Vary"].split(", ")), {"Accept", "X-Requested-With"})

    def test_json_errors_do_not_render_templates_or_require_authenticated_requests(self):
        request = RequestFactory().get("/api/missing/")
        with patch("config.error_views.render_to_string") as render:
            response = error_views.error_response(request, 500)
        render.assert_not_called()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertTrue(response.status_page_handled)


@override_settings(
    DEBUG=False,
    ALLOWED_HOSTS=["testserver"],
    ROOT_URLCONF=__name__,
    LOGIN_REQUIRED=False,
    MAINTENANCE_MODE=False,
    SECURE_SSL_REDIRECT=False,
)
class ErrorHandlerIntegrationTests(SimpleTestCase):
    def test_production_errors_choose_json_for_api_and_accept_requests(self):
        self.client.raise_request_exception = False
        for prefix, headers in (
            ("", {"HTTP_ACCEPT": "application/json"}),
            ("/api", {}), ("/deutschlive/api", {}), ("/wohnungssuche-api", {}), ("/botanic/api", {}),
        ):
            for status in (400, 403, 404, 500):
                with self.subTest(prefix=prefix, status=status), self.assertLogs("django.request", level="WARNING"):
                    response = self.client.get(f"{prefix}/broken/{status}/", **headers)
                    self.assertEqual(response.status_code, status)
                    self.assertEqual(response["Content-Type"], "application/json")
                    self.assertEqual(response.json(), {"status": status, **error_views.ERROR_COPY[status]})
                    self.assertNotIn(b"fictional-private-error", response.content)
                    self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_production_html_errors_render_once(self):
        self.client.raise_request_exception = False
        for status in (400, 403, 404, 500):
            with self.subTest(status=status), self.assertLogs("django.request", level="WARNING"):
                with patch("config.error_views.render_to_string", wraps=render_to_string) as render:
                    response = self.client.get(f"/broken/{status}/")
                self.assertEqual(response.status_code, status)
                self.assertTrue(response["Content-Type"].startswith("text/html"))
                self.assertEqual(render.call_count, 1)
                self.assertNotIn(b"fictional-private-error", response.content)

    def test_unmatched_api_routes_and_head_keep_json_status(self):
        response = self.client.get("/api/fictional-missing/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response["Content-Type"], "application/json")
        response = self.client.head("/api/fictional-missing/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.content, b"")

    @override_settings(DEBUG=True)
    def test_already_handled_debug_error_is_not_rendered_again(self):
        with patch("config.error_views.render_to_string", wraps=render_to_string) as render:
            response = self.client.get("/.env")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(render.call_count, 1)

    def test_html_and_json_replacements_preserve_headers_and_cookies(self):
        for target, is_json in (("/metadata/", False), ("/api/metadata/", True)):
            with self.subTest(target=target):
                response = self.client.get(target)
                self.assertEqual(response.status_code, 405)
                self.assertEqual(response["Content-Type"] == "application/json", is_json)
                for header, value in {
                    "Allow": "POST", "Retry-After": "60", "WWW-Authenticate": 'Basic realm="example"',
                    "Cache-Control": "private, no-store",
                }.items():
                    self.assertEqual(response[header], value)
                self.assertTrue({"Cookie", "Accept", "X-Requested-With"}.issubset(
                    {value.strip() for value in response["Vary"].split(",")}
                ))
                self.assertEqual(response["Content-Length"], str(len(response.content)))
                for header in ("Content-Encoding", "ETag", "Digest"):
                    self.assertNotIn(header, response)
                self.assertEqual(response.cookies["example"].value, "fictional")
                self.assertTrue(response.cookies["example"]["httponly"])
                self.assertEqual(response.cookies["example"]["samesite"], "Lax")
                self.assertNotIn(b"Internal details", response.content)
