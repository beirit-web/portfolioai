from django.contrib import admin

from .audit import audit_admin_change, audit_admin_delete
from .models import Achievement, AuditEvent, BotExchange, Feedback, Category, Plan, ChatHistory, QuizAnswer, QuizAttempt, QuizQuestion, Scene, Subscription, SceneLine, UserProfile, UserProgress, UserVocabulary, Vocabulary, WebhookEvent, WritingExercise


class AuditAdminMixin:
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        audit_admin_change(request, obj, created=not change, changed_fields=list(form.changed_data))

    def delete_model(self, request, obj):
        audit_admin_delete(request, obj)
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            audit_admin_delete(request, obj)
        super().delete_queryset(request, queryset)


@admin.register(UserProfile)
class UserProfileAdmin(AuditAdminMixin, admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "premium_status",
        "level",
        "interface_language",
        "explanation_language",
        "email_verified",
        "save_progress",
        "updated_at",
    )
    list_filter = ("role", "premium_status", "level", "interface_language", "explanation_language", "email_verified", "save_progress")
    search_fields = ("user__username", "user__email", "main_goal", "preferred_topic")
    readonly_fields = ("created_at", "updated_at")


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "topic_label", "score", "total", "created_at")
    list_filter = ("topic_id", "created_at")
    search_fields = ("user__username", "user__email", "topic_label")
    readonly_fields = ("created_at",)


@admin.register(BotExchange)
class BotExchangeAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at")
    search_fields = ("user__username", "question", "answer")
    readonly_fields = ("created_at",)


@admin.register(Plan)
class PlanAdmin(AuditAdminMixin, admin.ModelAdmin):
    list_display = ("code", "name", "price_cents", "currency", "interval", "is_premium", "is_active")
    list_filter = ("is_premium", "is_active", "interval", "currency")
    search_fields = ("code", "name", "description", "stripe_price_id", "paypal_plan_id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Subscription)
class SubscriptionAdmin(AuditAdminMixin, admin.ModelAdmin):
    list_display = ("user", "plan", "status", "provider", "current_period_end", "cancel_at_period_end")
    list_filter = ("status", "provider", "plan", "cancel_at_period_end")
    search_fields = ("user__username", "user__email", "provider_subscription_id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "event_id", "status", "received_at")
    list_filter = ("provider", "status", "event_type", "received_at")
    search_fields = ("event_id", "event_type")
    readonly_fields = ("received_at", "processed_at")


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("action", "target_type", "target_id", "actor", "path", "created_at")
    list_filter = ("action", "target_type", "created_at")
    search_fields = ("target_type", "target_id", "actor__username", "actor__email", "path", "request_id")
    readonly_fields = ("actor", "action", "target_type", "target_id", "path", "request_id", "ip_address", "metadata", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("title_de", "title_ru", "slug", "order", "is_published", "updated_at")
    list_filter = ("is_published",)
    search_fields = ("title_de", "title_ru", "description_de", "description_ru")
    prepopulated_fields = {"slug": ("title_de",)}
    readonly_fields = ("created_at", "updated_at")


class SceneLineInline(admin.TabularInline):
    model = SceneLine
    extra = 1


class VocabularyInline(admin.TabularInline):
    model = Vocabulary
    extra = 1
    fields = ("word_de", "translation_ru", "example_de", "order", "is_published")


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ("title", "topic_id", "category", "level", "is_premium", "is_published", "updated_at")
    list_filter = ("category", "topic_id", "level", "is_premium", "is_published")
    search_fields = ("title", "description_de", "description_ru")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [SceneLineInline, VocabularyInline]


@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    list_display = ("word_de", "translation_ru", "category", "scene", "order", "is_published")
    list_filter = ("category", "is_published")
    search_fields = ("word_de", "translation_ru", "example_de", "example_ru", "note_ru")


class QuizAnswerInline(admin.TabularInline):
    model = QuizAnswer
    extra = 3
    fields = ("text", "is_correct", "order")


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("topic_id", "question_type", "points", "is_active", "created_at")
    list_filter = ("topic_id", "question_type", "is_active")
    search_fields = ("prompt_de", "prompt_ru", "correct_answer")
    inlines = [QuizAnswerInline]


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "topic_id", "status", "completed_exercises", "last_activity_at")
    list_filter = ("status", "topic_id")
    search_fields = ("user__username", "topic_id")


@admin.register(UserVocabulary)
class UserVocabularyAdmin(admin.ModelAdmin):
    list_display = ("user", "word_de", "translation_ru", "source_topic_id", "created_at")
    list_filter = ("source_topic_id",)
    search_fields = ("user__username", "word_de", "translation_ru")


@admin.register(WritingExercise)
class WritingExerciseAdmin(admin.ModelAdmin):
    list_display = ("user", "topic_label", "status", "created_at")
    list_filter = ("topic_id", "status", "created_at")
    search_fields = ("user__username", "user__email", "prompt", "user_text", "correction", "explanation")
    readonly_fields = ("created_at",)


@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "mode", "created_at")
    list_filter = ("mode", "created_at")
    search_fields = ("user__username", "user_message", "bot_response", "correction")


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("category", "status", "user", "contact_email", "created_at")
    list_filter = ("status", "category", "created_at")
    search_fields = ("message", "contact_email", "user__username", "user__email", "page_path")
    readonly_fields = ("created_at", "updated_at", "user_agent", "ip_address")
    list_editable = ("status",)
    actions = ["mark_in_review", "mark_resolved", "mark_spam"]

    @admin.action(description="Mark selected feedback as in review")
    def mark_in_review(self, request, queryset):
        queryset.update(status="in_review")

    @admin.action(description="Mark selected feedback as resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(status="resolved")

    @admin.action(description="Mark selected feedback as spam")
    def mark_spam(self, request, queryset):
        queryset.update(status="spam")


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("code", "title")
    search_fields = ("code", "title", "description")
