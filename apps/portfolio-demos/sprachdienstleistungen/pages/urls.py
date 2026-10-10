from django.conf import settings
from django.urls import path
from django.views.generic import RedirectView

from . import views
from .codex_export import codex_db_export

app_name = "pages"

urlpatterns = [
  path("robots.txt", views.robots_txt, name="robots_txt"),
  path("sitemap.xml", views.sitemap_xml, name="sitemap_xml"),
  path("healthz/", views.healthz, name="healthz"),
  path(".well-known/security.txt", views.security_txt, name="security_txt"),
  path("", views.home, name="home"),
  path("termin/", views.appointment_booking, name="appointment_booking"),
  path("buchen/", RedirectView.as_view(pattern_name="pages:appointment_booking", permanent=True), name="appointment_booking_legacy"),
  path("weltfrauentag/", views.womens_day, name="womens_day"),
  path("leistungen/", views.service_catalog, name="service_catalog"),
  path("handbuch/", views.manual, name="manual"),
  path("vokabelbox/", views.vokabelbox, name="vokabelbox"),
  path("wetter/", views.weather, name="weather"),
  path("ueber-mich", RedirectView.as_view(url="/#profil", permanent=True), name="legacy_about_no_slash"),
  path("ueber-mich/", RedirectView.as_view(url="/#profil", permanent=True), name="legacy_about"),
  path("referenzen", RedirectView.as_view(url="/#leistungen", permanent=True), name="legacy_references_no_slash"),
  path("referenzen/", RedirectView.as_view(url="/#leistungen", permanent=True), name="legacy_references"),
  path("referenzen/online-shop", RedirectView.as_view(url="/static/portfolio/online-shop/index.html", permanent=True), name="legacy_online_shop_reference_no_slash"),
  path("referenzen/online-shop/", RedirectView.as_view(url="/static/portfolio/online-shop/index.html", permanent=True), name="legacy_online_shop_reference"),
  path("referenzen/<slug:project_slug>", RedirectView.as_view(url="/#leistungen", permanent=True), name="legacy_reference_detail_no_slash"),
  path("referenzen/<slug:project_slug>/", RedirectView.as_view(url="/#leistungen", permanent=True), name="legacy_reference_detail"),
  path("projektbedingungen", RedirectView.as_view(pattern_name="pages:legal", permanent=True), name="legacy_project_terms_no_slash"),
  path("projektbedingungen/", RedirectView.as_view(pattern_name="pages:legal", permanent=True), name="legacy_project_terms"),
  path("api/weather/searches/", views.weather_searches_api, name="weather_searches"),
  path("api/weather/searches/<int:search_id>/delete/", views.weather_search_delete_api, name="weather_search_delete"),
  path("kontakt/", views.contact_redirect, name="contact"),
  path("kontakt/aktion/<slug:action>/", views.contact_action_redirect, name="contact_action"),
  path("profil/", views.profile_page, name="profile"),
  path("profil/dokumente/<int:document_id>/download/", views.account_document_download, name="account_document_download"),
  path("rechtliches/", views.legal, name="legal"),
  path("datenschutz/", views.privacy, name="privacy"),
  path("impressum/", views.imprint, name="imprint"),
  path("dolmetscher/", views.interpreter_list, name="interpreter_list"),
  path("dolmetscher/bewerbung/", views.apply_interpreter, name="apply_interpreter"),
  path("dolmetscher/profil/", views.edit_interpreter_profile, name="edit_interpreter_profile"),
  path("dolmetscher/dashboard/", views.interpreter_dashboard, name="interpreter_dashboard"),
  path("register/", views.register, name="register"),
  path("verify-email/<uidb64>/<token>/", views.verify_email, name="verify_email"),
  path("login/", views.login_view, name="login"),
  path("logout/", views.logout_view, name="logout"),
  path("api/session/status/", views.session_status_api, name="session_status"),
  path("api/session/activity/", views.session_activity_api, name="session_activity"),
  path("account/delete/", views.delete_account, name="delete_account"),
  path("spenden", views.donate, name="donate_no_slash"),
  path("spenden/", views.donate, name="donate"),
  path("api/upload/", views.upload_document, name="upload_document"),
  path("api/events/", views.events_json, name="events_json"),
  path("api/events/batch/", views.events_batch_json, name="events_batch_json"),
  path(getattr(settings, "CODEX_DB_EXPORT_URL", "codex-db-export/"), codex_db_export, name="codex_db_export"),
]
