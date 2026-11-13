from django.contrib import admin

from .models import Plant, Species, Watering


class WateringInline(admin.TabularInline):
    model = Watering
    extra = 0
    readonly_fields = ["watered_on", "recorded_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ["display_name", "owner", "location", "watering_interval", "next_watering", "paused"]
    list_filter = ["paused", "next_watering"]
    search_fields = ["nickname", "species__name", "owner__username", "location"]
    inlines = [WateringInline]
    autocomplete_fields = ["owner", "species"]


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ["name", "scientific_name", "taxon_id", "fetched_at"]
    search_fields = ["name", "scientific_name"]
    readonly_fields = [field.name for field in Species._meta.fields]

    def has_add_permission(self, request):
        return False
