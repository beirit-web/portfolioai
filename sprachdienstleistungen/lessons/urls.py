from django.urls import path

from . import views


urlpatterns = [
    path("auth/csrf/", views.csrf),
    path("auth/me/", views.me),
    path("auth/logout/", views.logout_view),
    path("auth/export/", views.export_user_data),
    path("dashboard/", views.dashboard),
    path("dashboard/clear-progress/", views.clear_learning_progress),
    path("quiz-attempts/", views.save_quiz_attempt),
    path("progress/", views.save_progress),
    path("vocabulary/", views.save_vocabulary),
    path("bot/reply/", views.bot_reply),
    path("writing/exercises/", views.writing_exercises),
    path("settings/", views.update_settings),
    path("feedback/", views.submit_feedback),
    path("billing/status/", views.billing_status),
    path("billing/checkout/", views.billing_checkout_placeholder),
    path("premium/feature-preview/", views.premium_feature_preview),
    path("realtime/status/", views.realtime_status),
    path("ai/adaptive-scene/", views.adaptive_scene_preview),
    path("ai/streaming/status/", views.ai_streaming_status),
    path("security/admin-summary/", views.security_admin_summary),
    path("scenes/", views.scenes),
    path("topics/", views.topics),
    path("topics/<slug:topic_id>/", views.topic_detail),
    path("page/", views.page_content),
]
