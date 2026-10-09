from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings


def notification_group_for_user(user_id):
    return f"user_{user_id}_notifications"


def send_user_notification(user_id, event_type, payload):
    if not settings.REALTIME_NOTIFICATIONS_ENABLED:
        return False
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return False
    async_to_sync(channel_layer.group_send)(
        notification_group_for_user(user_id),
        {
            "type": "notification.message",
            "payload": {"type": event_type, **payload},
        },
    )
    return True


def realtime_feature_status():
    return {
        "notificationsEnabled": settings.REALTIME_NOTIFICATIONS_ENABLED,
        "messengerPrepared": settings.REALTIME_MESSENGER_PREPARED,
        "learningRoomsPrepared": settings.REALTIME_LEARNING_ROOMS_PREPARED,
        "channelLayer": settings.CHANNEL_LAYERS["default"]["BACKEND"],
        "redisConfigured": settings.USE_REDIS_CHANNEL_LAYER,
    }
