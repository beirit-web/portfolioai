from types import SimpleNamespace

from django.test import RequestFactory, SimpleTestCase, override_settings
from django.urls import reverse

from config.context_processors import auth_session_config


class AuthSessionContextTests(SimpleTestCase):
    def test_request_before_authentication_gets_anonymous_session_configuration(self):
        config = auth_session_config(RequestFactory().get("/"))["auth_session_js_config"]
        self.assertIs(config["isAuthenticated"], False)
        self.assertEqual(config["activityUrl"], reverse("pages:session_activity"))
        self.assertEqual(config["statusUrl"], reverse("pages:session_status"))
        self.assertEqual(config["loginUrl"], reverse("pages:login"))

    @override_settings(
        SESSION_IDLE_TIMEOUT_SECONDS=180,
        SESSION_IDLE_STATUS_POLL_SECONDS=12,
        SESSION_IDLE_ACTIVITY_THROTTLE_SECONDS=8,
    )
    def test_authenticated_configuration_keeps_boolean_and_millisecond_types(self):
        request = RequestFactory().get("/")
        request.user = SimpleNamespace(is_authenticated=True)
        config = auth_session_config(request)["auth_session_js_config"]
        self.assertIs(config["isAuthenticated"], True)
        for key, value in (("idleTimeoutMs", 180000), ("statusPollMs", 12000), ("activityThrottleMs", 8000)):
            self.assertEqual(config[key], value)
            self.assertIs(type(config[key]), int)

    @override_settings(
        MAINTENANCE_MODE=True,
        MAINTENANCE_MESSAGE="Fiktive Wartung",
        LOGIN_REQUIRED=False,
        SECURE_SSL_REDIRECT=False,
    )
    def test_real_maintenance_chain_renders_before_authentication(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("Fiktive Wartung", response.content.decode())
        self.assertIn(b'"isAuthenticated": false', response.content)
        self.assertNotIn(b"AttributeError", response.content)
