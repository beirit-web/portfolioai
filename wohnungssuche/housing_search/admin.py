from django.contrib import admin

from .models import (
    ApplicantProfile,
    ContactLog,
    Listing,
    ListingStatus,
    Notification,
    Provider,
    RentLimit,
    SearchProfile,
    WorkLocation,
)


@admin.register(SearchProfile)
class SearchProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "region", "cities", "max_rent", "is_active", "updated_at")
    list_filter = ("region", "is_active", "pets_allowed", "balcony", "garden", "elevator", "barrier_free")
    search_fields = ("name", "cities", "user__username", "user__email")


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "city", "warm_rent", "rooms", "size", "source_name", "score", "found_at")
    list_filter = ("city", "source_name", "property_type", "pets_allowed", "balcony", "garden", "elevator", "barrier_free")
    search_fields = ("title", "description", "city", "source_name", "external_id", "source_url")


@admin.register(ListingStatus)
class ListingStatusAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "status", "updated_at")
    list_filter = ("status", "created_at", "updated_at")
    search_fields = ("user__username", "user__email", "listing__title", "listing__city")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "notification_type", "status", "sent_at")
    list_filter = ("notification_type", "status", "sent_at")
    search_fields = ("user__username", "listing__title")


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "provider_type",
        "status",
        "active",
        "api_available",
        "rss_available",
        "email_import_available",
        "updated_at",
    )
    list_filter = (
        "provider_type",
        "status",
        "active",
        "api_available",
        "rss_available",
        "email_import_available",
        "terms_allow_automation",
    )
    search_fields = ("name", "homepage", "data_source", "notes")


@admin.register(ContactLog)
class ContactLogAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "contact_name", "email", "contact_date", "next_follow_up")
    list_filter = ("contact_date", "next_follow_up")
    search_fields = ("user__username", "listing__title", "contact_name", "email")


@admin.register(ApplicantProfile)
class ApplicantProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "email", "current_city", "occupation", "persons_count")
    search_fields = ("full_name", "user__username", "email", "current_city")


@admin.register(WorkLocation)
class WorkLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "city", "address")
    list_filter = ("city",)
    search_fields = ("name", "city", "address", "user__username")


@admin.register(RentLimit)
class RentLimitAdmin(admin.ModelAdmin):
    list_display = ("city_or_county", "persons_count", "max_rent", "max_size", "valid_from")
    list_filter = ("city_or_county", "persons_count", "valid_from")
    search_fields = ("city_or_county", "source_note")

# Register your models here.
