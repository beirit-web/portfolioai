from django.contrib import admin

from .models import CakeOrder, CakeOrderItem, CakeProduct


@admin.register(CakeProduct)
class CakeProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "price", "stock_status", "is_available", "is_featured", "sort_order")
    list_filter = ("category", "is_available", "is_featured")
    search_fields = ("name", "sku", "description", "ingredients", "allergens")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


class CakeOrderItemInline(admin.TabularInline):
    model = CakeOrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "quantity", "unit_price", "line_total")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(CakeOrder)
class CakeOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_name", "customer_email", "delivery_method", "requested_date", "total", "status", "created_at")
    list_filter = ("status", "delivery_method", "requested_date", "created_at")
    search_fields = ("order_number", "customer_name", "customer_email", "customer_phone")
    readonly_fields = ("order_number", "owner", "request_key", "delivery_method", "subtotal", "delivery_fee", "total", "created_at", "updated_at")
    inlines = (CakeOrderItemInline,)

    def has_add_permission(self, request):
        return False
