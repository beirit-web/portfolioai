"""Admin for portfolio projects, contact messages and demo accounts."""
from django.contrib import admin
from django.utils.html import format_html
from .models import ChatMessage, Profile, Project, WeatherSearch

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "sort_order",
        "title",
        "category",
        "status",
        "published",
        "featured",
        "live_link",
        "github_link",
        "updated_at",
    )
    list_display_links = ("title",)
    list_editable = ("sort_order", "published", "featured")
    list_filter = ("published", "featured", "status", "category")
    search_fields = ("title", "slug", "short_description", "description", "technologies", "category")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("image_preview", "created_at", "updated_at")
    ordering = ("sort_order", "title")
    list_per_page = 50
    fieldsets = (
        ("Basis", {
            "fields": (
                "title",
                "slug",
                "short_description",
                "description",
                "category",
                "status",
                "status_label",
            )
        }),
        ("Darstellung", {
            "fields": ("image", "image_url", "image_alt", "image_preview", "technologies", "features")
        }),
        ("Projektbeschreibung", {
            "fields": ("situation", "implementation", "result")
        }),
        ("Links", {
            "fields": ("live_url", "github_url")
        }),
        ("Veröffentlichung", {
            "fields": ("published", "featured", "sort_order", "created_at", "updated_at")
        }),
    )

    @admin.display(description="Vorschau")
    def image_preview(self, obj):
        image_url = obj.preview_image_url if obj else ""
        if not image_url:
            return "Kein Bild"
        return format_html(
            '<img src="{}" alt="" style="max-width: 260px; max-height: 150px; object-fit: contain; border-radius: 8px;" />',
            image_url,
        )

    @admin.display(description="Live")
    def live_link(self, obj):
        if not obj.live_url:
            return "-"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">öffnen</a>', obj.live_url)

    @admin.display(description="GitHub")
    def github_link(self, obj):
        if not obj.github_url:
            return "-"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">öffnen</a>', obj.github_url)


@admin.register(ChatMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("contact_email", "lang", "handled", "created_at")
    list_filter = ("handled", "lang")
    search_fields = ("contact_email", "text")
    readonly_fields = ("created_at", "privacy_consent_at", "privacy_consent_version")
    fields = ("user", "contact_email", "lang", "text", "handled", "created_at", "privacy_consent_at", "privacy_consent_version")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "last_activity_at")
    fields = ("user", "last_activity_at", "session_generation", "privacy_consent_at", "privacy_consent_version", "privacy_consent_source")
    readonly_fields = ("last_activity_at", "session_generation")


@admin.register(WeatherSearch)
class WeatherSearchAdmin(admin.ModelAdmin):
    list_display = ("user", "query", "created_at")
