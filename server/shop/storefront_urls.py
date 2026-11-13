from django.urls import path

from . import views

app_name = "storefront"
urlpatterns = [
    path("", views.catalog, name="catalog"),
    path("artikel/<slug:slug>/", views.product_detail, name="product"),
    path("warenkorb/", views.cart, name="cart"),
    path("warenkorb/<int:pk>/hinzufuegen/", views.cart_add, name="add"),
    path("warenkorb/<int:pk>/aendern/", views.cart_update, name="update"),
    path("anfrage/", views.checkout, name="checkout"),
    path("anfragen/", views.orders, name="orders"),
    path("anfragen/<str:number>/", views.confirmation, name="confirmation"),
]
