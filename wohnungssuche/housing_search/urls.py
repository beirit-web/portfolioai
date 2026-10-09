from django.urls import path

from . import views

app_name = "housing_search"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("suchprofile/", views.SearchProfileListView.as_view(), name="search_profile_list"),
    path("suchprofile/neu/", views.SearchProfileCreateView.as_view(), name="search_profile_create"),
    path("suchprofile/<int:pk>/bearbeiten/", views.SearchProfileUpdateView.as_view(), name="search_profile_update"),
    path("suchprofile/<int:pk>/loeschen/", views.SearchProfileDeleteView.as_view(), name="search_profile_delete"),
    path("suchprofile/<int:pk>/umschalten/", views.SearchProfileToggleView.as_view(), name="search_profile_toggle"),
    path("treffer/", views.ListingListView.as_view(), name="listing_list"),
    path("treffer/<int:pk>/", views.ListingDetailView.as_view(), name="listing_detail"),
    path("treffer/<int:pk>/status/", views.ListingStatusUpdateView.as_view(), name="listing_status_update"),
    path("treffer/<int:pk>/status/<slug:status>/", views.ListingQuickStatusView.as_view(), name="listing_quick_status"),
    path("treffer/<int:pk>/kontakt/", views.ContactLogCreateView.as_view(), name="contact_log_create"),
    path("treffer/<int:pk>/anschreiben/", views.CoverLetterPreviewView.as_view(), name="cover_letter_preview"),
    path("bewerberprofil/", views.ApplicantProfileUpdateView.as_view(), name="applicant_profile_update"),
]
