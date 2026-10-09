from django.urls import path

from . import views

app_name = "shop"

urlpatterns = [
    path("products/", views.product_list, name="product_list"),
    path("orders/", views.create_order, name="create_order"),
]
