from unittest.mock import AsyncMock, Mock, patch

from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from ..realtime import notification_group_for_user, send_user_notification


@override_settings(
    AUTH_PASSWORD_VALIDATORS=[],
    REALTIME_NOTIFICATIONS_ENABLED=True,
    REALTIME_MESSENGER_PREPARED=True,
    REALTIME_LEARNING_ROOMS_PREPARED=True,
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
    USE_REDIS_CHANNEL_LAYER=False,
)
class RealtimeTests(TestCase):
    def test_realtime_status_reports_channel_layer_and_future_features(self):
        user = get_user_model().objects.create_user(username="realtime", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        response = self.client.get("/deutschlive/api/realtime/status/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()["realtime"]
        self.assertTrue(payload["notificationsEnabled"])
        self.assertTrue(payload["messengerPrepared"])
        self.assertTrue(payload["learningRoomsPrepared"])
        self.assertEqual(payload["channelLayer"], "channels.layers.InMemoryChannelLayer")
        self.assertFalse(payload["redisConfigured"])

    def test_notification_group_is_user_scoped(self):
        self.assertEqual(notification_group_for_user(42), "user_42_notifications")

    def test_send_user_notification_uses_configured_channel_layer(self):
        channel_layer = Mock(group_send=AsyncMock())
        with (
            patch("lessons.realtime.async_to_sync", async_to_sync),
            patch("lessons.realtime.get_channel_layer", return_value=channel_layer),
        ):
            self.assertTrue(send_user_notification(1, "test_event", {"message": "Hallo"}))

        channel_layer.group_send.assert_awaited_once_with(
            "user_1_notifications",
            {"type": "notification.message", "payload": {"type": "test_event", "message": "Hallo"}},
        )

    @override_settings(REALTIME_NOTIFICATIONS_ENABLED=False)
    def test_disabled_notifications_do_not_resolve_channel_layer(self):
        with patch("lessons.realtime.get_channel_layer") as get_channel_layer:
            self.assertFalse(send_user_notification(1, "test_event", {}))
        get_channel_layer.assert_not_called()

    def test_notifications_are_unavailable_without_optional_channels(self):
        with (
            patch("lessons.realtime.async_to_sync", None),
            patch("lessons.realtime.get_channel_layer") as get_channel_layer,
        ):
            self.assertFalse(send_user_notification(1, "test_event", {}))
        get_channel_layer.assert_not_called()

    def test_notifications_are_unavailable_without_channel_layer(self):
        with (
            patch("lessons.realtime.async_to_sync", async_to_sync),
            patch("lessons.realtime.get_channel_layer", return_value=None),
        ):
            self.assertFalse(send_user_notification(1, "test_event", {}))

    def test_writing_exercise_triggers_realtime_notification_path(self):
        user = get_user_model().objects.create_user(username="notify", password="strong-pass-123")
        self.client.post(
            "/deutschlive/api/auth/login/",
            data={"username": user.username, "password": "strong-pass-123"},
            content_type="application/json",
        )

        with patch("lessons.views.send_user_notification", return_value=True) as send_notification:
            response = self.client.post(
                "/deutschlive/api/writing/exercises/",
                data={"topicId": "baeckerei", "prompt": "Bestellung schreiben", "text": "Ich hätte gern Brot."},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        send_notification.assert_called_once_with(
            user.id,
            "writing_correction",
            {"exerciseId": response.json()["exercise"]["id"], "message": "Новая Korrektur ist bereit."},
        )
