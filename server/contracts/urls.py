from django.urls import path

from . import views

app_name = "contracts"

urlpatterns = [
    path("", views.generator, name="generator"),
    path("vorschau/", views.preview, name="preview"),
    path("download/", views.download, name="download"),
]
