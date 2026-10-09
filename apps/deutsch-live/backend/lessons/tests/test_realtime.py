from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import TestCase, override_settings
from unittest.mock import patch
from asgiref.sync import async_to_sync

from ..models import UserProfile
from ..realtime import notification_group_for_user, realtime_feature_status, send_user_notification
from ..realtime_middleware import RealtimeAccessMiddleware


@override_settings(AUTH_PASSWORD_VALIDATORS=[])
class RealtimeTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_realtime_status_reports_channel_layer_and_future_features(self):
        user = get_user_model().objects.create_user(username="realtime", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.get("/api/realtime/status/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["realtime"]
        self.assertTrue(payload["notificationsEnabled"])
        self.assertTrue(payload["messengerPrepared"])
        self.assertTrue(payload["learningRoomsPrepared"])
        self.assertIn("ChannelLayer", payload["channelLayer"])

    def test_notification_group_is_user_scoped(self):
        self.assertEqual(notification_group_for_user(42), "user_42_notifications")

    def test_realtime_access_middleware_accepts_authenticated_allowed_role(self):
        user = get_user_model().objects.create_user(username="wsuser", password="strong-pass-123")
        UserProfile.objects.create(user=user, role="learner")
        events = _run_realtime_middleware(user=user)

        self.assertIn({"type": "websocket.accept"}, events)

    def test_realtime_access_middleware_rejects_anonymous_user(self):
        events = _run_realtime_middleware(user=AnonymousUser())

        self.assertEqual(events, [{"type": "websocket.close", "code": 4401}])

    @override_settings(
        REALTIME_WS_POLICIES={
            "notifications": {
                "path": "/ws/notifications/",
                "allowed_roles": ["mentor"],
            }
        }
    )
    def test_realtime_access_middleware_rejects_disallowed_role(self):
        user = get_user_model().objects.create_user(username="wslearner", password="strong-pass-123")
        UserProfile.objects.create(user=user, role="learner")
        events = _run_realtime_middleware(user=user)

        self.assertEqual(events, [{"type": "websocket.close", "code": 4403}])

    @override_settings(REALTIME_WS_CONNECTION_LIMIT=1, REALTIME_WS_CONNECTION_WINDOW_SECONDS=60)
    def test_realtime_access_middleware_rate_limits_connections(self):
        user = get_user_model().objects.create_user(username="wslimited", password="strong-pass-123")
        UserProfile.objects.create(user=user, role="learner")

        first = _run_realtime_middleware(user=user)
        second = _run_realtime_middleware(user=user)

        self.assertIn({"type": "websocket.accept"}, first)
        self.assertEqual(second, [{"type": "websocket.close", "code": 4429}])

    def test_send_user_notification_uses_configured_channel_layer(self):
        self.assertTrue(send_user_notification(1, "test_event", {"message": "Hallo"}))

    def test_writing_exercise_triggers_realtime_notification_path(self):
        user = get_user_model().objects.create_user(username="notify", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.post(
            "/api/writing/exercises/",
            data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Ich hätte gern Brot."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

    @override_settings(AI_STREAMING_CORRECTIONS_ENABLED=True)
    def test_writing_correction_stream_uses_notification_channel(self):
        user = get_user_model().objects.create_user(username="streamnotify", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        sent_events = []

        def capture_event(user_id, event_type, payload):
            sent_events.append((user_id, event_type, payload))
            return True

        with patch("lessons.writing_service.send_user_notification", side_effect=capture_event):
            response = self.client.post(
                "/api/writing/exercises/",
                data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Ich hätte gern Brot."},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        event_types = [event[1] for event in sent_events]
        self.assertIn("writing_correction", event_types)
        self.assertIn("writing_correction_stream_start", event_types)
        self.assertIn("writing_correction_stream_chunk", event_types)
        self.assertIn("writing_correction_stream_done", event_types)

    @override_settings(AI_STREAMING_CORRECTIONS_ENABLED=True)
    def test_ai_streaming_status_reports_enabled_websocket_transport(self):
        user = get_user_model().objects.create_user(username="streamstatus", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.get("/api/ai/streaming/status/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["streaming"]
        self.assertTrue(payload["enabled"])
        self.assertEqual(payload["transport"], "websocket-notifications")

    def test_progress_update_sends_realtime_event(self):
        user = get_user_model().objects.create_user(username="progressnotify", password="strong-pass-123")
        self.client.post(
            "/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )
        sent_events = []

        def capture_event(user_id, event_type, payload):
            sent_events.append((user_id, event_type, payload))
            return True

        with patch("lessons.views.send_user_notification", side_effect=capture_event):
            response = self.client.post(
                "/api/progress/",
                data={"topicId": "baeckerei", "status": "completed", "completedExercises": 3},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(sent_events), 1)
        user_id, event_type, payload = sent_events[0]
        self.assertEqual(user_id, user.id)
        self.assertEqual(event_type, "progress_updated")
        self.assertEqual(payload["topicId"], "baeckerei")
        self.assertEqual(payload["status"], "completed")
        self.assertEqual(payload["completedExercises"], 3)


def _run_realtime_middleware(user, path="/ws/notifications/", client=("127.0.0.1", 1234)):
    events = []

    async def app(scope, receive, send):
        await send({"type": "websocket.accept"})

    async def receive():
        return {"type": "websocket.connect"}

    async def send(event):
        events.append(event)

    scope = {"type": "websocket", "path": path, "user": user, "client": client}
    async_to_sync(RealtimeAccessMiddleware(app))(scope, receive, send)
    return events
