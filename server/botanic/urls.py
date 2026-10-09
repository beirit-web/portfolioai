from django.urls import path

from . import views

app_name = "botanic"
urlpatterns = [
    path("", views.index, name="index"),
    path("wetter/", views.weather, name="weather"),
    path("api/suche/", views.search_api, name="search"),
    path("arten/<int:taxon_id>/", views.species_detail, name="species"),
    path("arten/<int:taxon_id>/speichern/", views.add_plant, name="add"),
    path("pflanzen/<int:pk>/", views.edit_plant, name="edit"),
    path("pflanzen/<int:pk>/giessen/", views.water_plant, name="water"),
    path("pflanzen/<int:pk>/verschieben/", views.snooze_plant, name="snooze"),
    path("pflanzen/<int:pk>/entfernen/", views.delete_plant, name="delete"),
]
