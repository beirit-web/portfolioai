from html.parser import HTMLParser

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings

from config.middleware import SecurityHeadersMiddleware


class ScriptParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inline_scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and "src" not in attrs and attrs.get("type", "") not in (
            "application/json", "application/ld+json",
        ):
            self.inline_scripts.append(attrs)


class ContentSecurityPolicyMiddlewareTests(SimpleTestCase):
    @override_settings(
        CONTENT_SECURITY_POLICY="script-src 'self' 'nonce-{nonce}'; object-src 'none'",
        CONTENT_SECURITY_POLICY_ENFORCE=True,
    )
    def test_nonce_exists_before_render_and_is_fresh_for_every_response(self):
        def render(request):
            return HttpResponse(f'<script nonce="{request.csp_nonce}">trusted()</script>')

        middleware = SecurityHeadersMiddleware(render)
        nonces = set()
        for _ in range(2):
            request = RequestFactory().get("/")
            response = middleware(request)
            self.assertRegex(request.csp_nonce, r"^[A-Za-z0-9_-]{32}$")
            self.assertIn(f"'nonce-{request.csp_nonce}'", response["Content-Security-Policy"])
            self.assertIn(request.csp_nonce.encode(), response.content)
            self.assertNotIn("Content-Security-Policy-Report-Only", response)
            nonces.add(request.csp_nonce)
        self.assertEqual(len(nonces), 2)

    @override_settings(
        CONTENT_SECURITY_POLICY="script-src 'nonce-{nonce}'",
        CONTENT_SECURITY_POLICY_ENFORCE=False,
    )
    def test_view_policy_is_preserved_without_authorizing_untrusted_html(self):
        def render(request):
            response = HttpResponse("<script>untrusted()</script>")
            response["Content-Security-Policy-Report-Only"] = (
                "script-src 'nonce-{nonce}'; img-src https://images.example.com"
            )
            return response

        request = RequestFactory().get("/")
        response = SecurityHeadersMiddleware(render)(request)
        self.assertEqual(response.content, b"<script>untrusted()</script>")
        policy = response["Content-Security-Policy-Report-Only"]
        self.assertIn("https://images.example.com", policy)
        self.assertIn(f"'nonce-{request.csp_nonce}'", policy)
        self.assertNotIn("Content-Security-Policy", response)


@override_settings(CONTENT_SECURITY_POLICY_ENFORCE=True, SECURE_SSL_REDIRECT=False)
class ContentSecurityPolicyTemplateTests(TestCase):
    def test_templates_authorize_inline_scripts_with_the_response_nonce(self):
        for target in (
            "/", "/kontakt/", "/ueber-mich/", "/projekte/", "/login/", "/register/",
            "/impressum/", "/datenschutz/", "/rechtliches/", "/vertragsgenerator/",
            "/botanic/?tab=plants", "/botanic/wetter/", "/shop/", "/vokabelbox/",
        ):
            with self.subTest(target=target):
                response = self.client.get(target, follow=True)
                self.assertEqual(response.status_code, 200)
                policy = response["Content-Security-Policy"]
                nonce = response.wsgi_request.csp_nonce
                self.assertIn(f"'nonce-{nonce}'", policy)
                self.assertIn("script-src-attr 'none'", policy)
                script_directive = next(part.strip() for part in policy.split(";") if part.strip().startswith("script-src "))
                self.assertNotIn("'unsafe-inline'", script_directive)
                self.assertNotIn("'unsafe-eval'", script_directive)
                parser = ScriptParser()
                parser.feed(response.content.decode())
                for attrs in parser.inline_scripts:
                    self.assertEqual(attrs.get("nonce"), nonce)
                if target.startswith("/botanic/"):
                    self.assertIn("https://static.inaturalist.org", policy)
