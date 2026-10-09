import uuid

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class AnonymousClient(models.Model):
  """
  Anonyme Besucher-ID für clientseitige Anzeigeentscheidungen.
  """

  client_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
  first_seen_at = models.DateTimeField(auto_now_add=True)
  last_seen_at = models.DateTimeField(auto_now=True)
  last_intro_video_played_at = models.DateTimeField(blank=True, null=True)

  class Meta:
    ordering = ["-last_seen_at", "-id"]
    verbose_name = "Anonymer Client"
    verbose_name_plural = "Anonyme Clients"

  def __str__(self):
    return str(self.client_id)


class Profile(models.Model):
  """
  Zusätzliche Profildaten für Benutzer:innen.
  """

  user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
  image_data = models.BinaryField(blank=True, null=True)
  image_mime = models.CharField(max_length=100, blank=True, default="")
  image_name = models.CharField(max_length=255, blank=True, default="")
  last_activity_at = models.DateTimeField(blank=True, null=True)
  session_generation = models.PositiveBigIntegerField(default=0)
  privacy_consent_at = models.DateTimeField("Datenschutz zugestimmt am", blank=True, null=True)
  privacy_consent_version = models.CharField("Datenschutzhinweis-Version", max_length=32, blank=True, default="")
  privacy_consent_source = models.CharField("Quelle der Zustimmung", max_length=32, blank=True, default="")
  callback_phone = models.CharField("Rückrufnummer", max_length=50, blank=True, default="")
  callback_time_windows = models.TextField("Bevorzugte Zeitfenster", blank=True, default="")
  notify_new_reply = models.BooleanField("E-Mail bei neuer Antwort", default=True)
  notify_new_message = models.BooleanField("E-Mail bei neuer Nachricht", default=True)
  notify_appointment_changes = models.BooleanField("E-Mail bei Terminänderung", default=True)

  def __str__(self):
    return f"Profil von {self.user.email or self.user.username}"

  class Meta:
    verbose_name = "Profil"
    verbose_name_plural = "Profile"

  @property
  def image_url(self) -> str:
    if not self.image_data or not self.image_mime:
      return ""
    import base64

    encoded = base64.b64encode(self.image_data).decode("ascii")
    return f"data:{self.image_mime};base64,{encoded}"


class InterpreterApplication(models.Model):
  """
  Bewerbung von Dolmetscher:innen mit Basisdaten.
  """

  STATUS_NEW = "new"
  STATUS_APPROVED = "approved"
  STATUS_REJECTED = "rejected"
  STATUS_CHOICES = (
    (STATUS_NEW, "Neu"),
    (STATUS_APPROVED, "Freigegeben"),
    (STATUS_REJECTED, "Abgelehnt"),
  )

  user = models.ForeignKey(
    "auth.User",
    on_delete=models.CASCADE,
    related_name="interpreter_applications",
    verbose_name="Benutzer",
  )
  display_name = models.CharField(
    "Name oder Firma",
    max_length=200,
    blank=True,
    help_text="Name oder Firmenname für die öffentliche Anzeige",
  )
  languages = models.CharField("Sprachen", max_length=200)
  region = models.CharField("Region / Ort", max_length=200, blank=True)
  specialization = models.CharField("Fachgebiet (optional)", max_length=200, blank=True, default="")
  experience = models.CharField("Erfahrung / Zertifikate", max_length=200, blank=True)
  availability = models.CharField("Verfügbarkeit", max_length=200, blank=True)
  motivation = models.TextField("Kurzbeschreibung")
  status = models.CharField(
    "Status",
    max_length=32,
    choices=STATUS_CHOICES,
    default=STATUS_NEW,
  )
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.email or self.user.username} ({self.languages})"

  class Meta:
    verbose_name = "Dolmetscher-Bewerbung"
    verbose_name_plural = "Dolmetscher-Bewerbungen"


class ServicePrice(models.Model):
  """
  Verwaltbare Preispositionen für die öffentliche Startseite.
  """

  title = models.CharField("Position", max_length=160)
  included = models.TextField("Was enthalten ist")
  price = models.CharField("Richtpreis", max_length=80)
  category = models.CharField("Kategorie", max_length=80, blank=True, default="")
  note = models.CharField("Hinweis", max_length=180, blank=True, default="")
  sort_order = models.PositiveIntegerField("Sortierung", default=100)
  is_active = models.BooleanField("Aktiv anzeigen", default=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["sort_order", "title"]
    verbose_name = "Preisposition"
    verbose_name_plural = "Preispositionen"

  def __str__(self):
    return f"{self.title} - {self.price}"


class Project(models.Model):
  """
  Portfolio-Metadaten für externe oder eigene Projekte.
  Quellcode anderer Projekte wird hier nicht gespeichert.
  """

  STATUS_LIVE = "live"
  STATUS_DEMO = "demo"
  STATUS_DEVELOPMENT = "development"
  STATUS_CONCEPT = "concept"
  STATUS_CHOICES = (
    (STATUS_LIVE, "Live"),
    (STATUS_DEMO, "Demo"),
    (STATUS_DEVELOPMENT, "In Entwicklung"),
    (STATUS_CONCEPT, "Konzept"),
  )

  title = models.CharField("Titel", max_length=200)
  slug = models.SlugField("Slug", unique=True)
  short_description = models.TextField("Kurzbeschreibung")
  description = models.TextField("Ausführliche Beschreibung", blank=True, default="")
  situation = models.TextField("Ausgangssituation", blank=True, default="")
  implementation = models.TextField("Umsetzung", blank=True, default="")
  result = models.TextField("Ergebnis", blank=True, default="")
  image = models.ImageField("Vorschaubild", upload_to="projects/", blank=True)
  image_url = models.CharField("Bestehende Bild-URL", max_length=500, blank=True, default="")
  image_alt = models.CharField("Bildbeschreibung", max_length=240, blank=True, default="")
  technologies = models.CharField("Technologien", max_length=500, blank=True, default="")
  features = models.TextField("Funktionen", blank=True, default="", help_text="Eine Funktion pro Zeile.")
  category = models.CharField("Kategorie", max_length=100, blank=True, default="")
  status = models.CharField("Status", max_length=24, choices=STATUS_CHOICES, default=STATUS_DEMO)
  status_label = models.CharField("Status-Anzeige", max_length=120, blank=True, default="")
  live_url = models.URLField("Live-URL", blank=True, default="")
  github_url = models.URLField("GitHub-URL", blank=True, default="")
  featured = models.BooleanField("Auf Hauptseite hervorheben", default=False)
  published = models.BooleanField("Veröffentlicht", default=True)
  sort_order = models.PositiveIntegerField("Sortierreihenfolge", default=100)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["sort_order", "title"]
    verbose_name = "Portfolio-Projekt"
    verbose_name_plural = "Portfolio-Projekte"

  def __str__(self):
    return self.title

  @property
  def preview_image_url(self) -> str:
    if self.image:
      return self.image.url
    return self.image_url

  @property
  def feature_list(self) -> list[str]:
    return [line.strip() for line in self.features.splitlines() if line.strip()]

  @property
  def technology_list(self) -> list[str]:
    return [item.strip() for item in self.technologies.split(",") if item.strip()]


class PaymentRequest(models.Model):
  """
  Verbindlich festgelegte Zahlungsanforderung für Rechnung, Auftrag oder Angebot.
  Der Betrag wird ausschließlich hier verwaltet und nie aus dem Frontend übernommen.
  """

  STATUS_DRAFT = "draft"
  STATUS_OPEN = "open"
  STATUS_PAID = "paid"
  STATUS_CANCELLED = "cancelled"
  STATUS_EXPIRED = "expired"
  STATUS_CHOICES = (
    (STATUS_DRAFT, "Entwurf"),
    (STATUS_OPEN, "Offen"),
    (STATUS_PAID, "Bezahlt"),
    (STATUS_CANCELLED, "Storniert"),
    (STATUS_EXPIRED, "Abgelaufen"),
  )

  internal_reference = models.CharField("Interne Referenz", max_length=80, unique=True)
  title = models.CharField("Titel", max_length=180)
  description = models.TextField("Beschreibung", blank=True, default="")
  amount = models.DecimalField("Betrag", max_digits=10, decimal_places=2)
  currency = models.CharField("Währung", max_length=3, default="EUR")
  status = models.CharField("Status", max_length=24, choices=STATUS_CHOICES, default=STATUS_DRAFT)
  customer_email = models.EmailField("Kunden-E-Mail", blank=True, default="")
  user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="payment_requests")
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  paid_at = models.DateTimeField(blank=True, null=True)

  class Meta:
    ordering = ["-created_at", "-id"]
    verbose_name = "Zahlungsanforderung"
    verbose_name_plural = "Zahlungsanforderungen"

  def __str__(self):
    return f"{self.internal_reference} - {self.amount} {self.currency}"

  @property
  def is_payable(self) -> bool:
    return self.status == self.STATUS_OPEN and self.currency == "EUR" and self.amount > 0

  def mark_paid(self, paid_at=None):
    self.status = self.STATUS_PAID
    self.paid_at = paid_at or timezone.now()
    self.save(update_fields=["status", "paid_at", "updated_at"])


class PayPalPayment(models.Model):
  """
  Einzelner PayPal-Zahlungslauf zu einer Zahlungsanforderung.
  """

  STATUS_CREATED = "created"
  STATUS_APPROVED = "approved"
  STATUS_COMPLETED = "completed"
  STATUS_FAILED = "failed"
  STATUS_CANCELLED = "cancelled"
  STATUS_CHOICES = (
    (STATUS_CREATED, "Erstellt"),
    (STATUS_APPROVED, "Freigegeben"),
    (STATUS_COMPLETED, "Bezahlt"),
    (STATUS_FAILED, "Fehlgeschlagen"),
    (STATUS_CANCELLED, "Abgebrochen"),
  )

  payment_request = models.ForeignKey(PaymentRequest, on_delete=models.PROTECT, related_name="paypal_payments")
  internal_reference = models.CharField("Interne Referenz", max_length=80, db_index=True)
  paypal_order_id = models.CharField("PayPal-Bestellnummer", max_length=80, unique=True)
  paypal_capture_id = models.CharField("PayPal-Capture-ID", max_length=120, blank=True, default="")
  amount = models.DecimalField("Betrag", max_digits=10, decimal_places=2)
  currency = models.CharField("Währung", max_length=3, default="EUR")
  status = models.CharField("Status", max_length=24, choices=STATUS_CHOICES, default=STATUS_CREATED)
  payer_email = models.EmailField("PayPal-Käufer-E-Mail", blank=True, default="")
  raw_response = models.JSONField("PayPal-Antwort", blank=True, default=dict)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  paid_at = models.DateTimeField(blank=True, null=True)

  class Meta:
    ordering = ["-created_at", "-id"]
    verbose_name = "PayPal-Zahlung"
    verbose_name_plural = "PayPal-Zahlungen"

  def __str__(self):
    return f"{self.paypal_order_id} - {self.status}"


class ChatMessage(models.Model):
  """
  Speichert eingegangene Kontaktanfragen aus dem alten Nachrichtensystem.
  """

  created_at = models.DateTimeField(auto_now_add=True)
  lang = models.CharField(max_length=4, default="de")
  user = models.ForeignKey(
    "auth.User",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    verbose_name="Benutzer",
  )
  contact_email = models.EmailField("E-Mail", max_length=254, blank=True, default="")
  client_hash = models.CharField(max_length=128, db_index=True)
  text = models.TextField()
  handled = models.BooleanField(default=False)
  privacy_consent_at = models.DateTimeField("Datenschutz zugestimmt am", blank=True, null=True)
  privacy_consent_version = models.CharField("Datenschutzhinweis-Version", max_length=32, blank=True, default="")

  class Meta:
    ordering = ["-created_at"]
    verbose_name = "Kontaktanfrage"
    verbose_name_plural = "Kontaktanfragen"

  def __str__(self):
    return f"[{self.lang}] {self.text[:50]}"


class ChatReply(models.Model):
  """
  Manuelle Antworten vom Admin an einen Client (per client_hash).
  Werden beim nächsten Nachrichtenabruf ausgeliefert und dann als zugestellt markiert.
  """

  created_at = models.DateTimeField(auto_now_add=True)
  client_hash = models.CharField(max_length=128, db_index=True)
  text = models.TextField()
  delivered = models.BooleanField(default=False)

  class Meta:
    ordering = ["-created_at"]
    verbose_name = "Kontaktantwort"
    verbose_name_plural = "Kontaktantworten"

  def __str__(self):
    return f"Reply to {self.client_hash[:10]}: {self.text[:50]}"


class AccountDocument(models.Model):
  """
  Gespeicherte Unterlagen eines Kontos für spätere Einsicht und Download.
  """

  user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="account_documents")
  title = models.CharField("Titel", max_length=200, blank=True, default="")
  note = models.TextField("Notiz", blank=True, default="")
  file_data = models.BinaryField()
  file_name = models.CharField("Dateiname", max_length=255)
  file_mime = models.CharField("Dateityp", max_length=100, blank=True, default="")
  file_size = models.PositiveIntegerField("Dateigröße", default=0)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["-created_at", "-id"]
    verbose_name = "Kontodokument"
    verbose_name_plural = "Kontodokumente"

  def __str__(self):
    return self.title or self.file_name


class AccountNotice(models.Model):
  """
  Interne Nachricht oder Hinweis an ein registriertes Konto.
  """

  user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="account_notices")
  title = models.CharField("Titel", max_length=200)
  text = models.TextField("Text")
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["-created_at", "-id"]
    verbose_name = "Kontonachricht"
    verbose_name_plural = "Kontonachrichten"

  def __str__(self):
    return self.title


class CallbackRequest(models.Model):
  """
  Rückruf- oder Terminabstimmung mit bevorzugten Zeitfenstern.
  """

  STATUS_NEW = "new"
  STATUS_CONTACTED = "contacted"
  STATUS_SCHEDULED = "scheduled"
  STATUS_COMPLETED = "completed"
  STATUS_CANCELLED = "cancelled"
  STATUS_CHOICES = (
    (STATUS_NEW, "Neu"),
    (STATUS_CONTACTED, "Kontakt aufgenommen"),
    (STATUS_SCHEDULED, "Termin geplant"),
    (STATUS_COMPLETED, "Abgeschlossen"),
    (STATUS_CANCELLED, "Abgebrochen"),
  )

  user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="callback_requests")
  phone = models.CharField("Rückrufnummer", max_length=50)
  time_windows = models.TextField("Bevorzugte Zeitfenster")
  note = models.TextField("Hinweis", blank=True, default="")
  status = models.CharField("Status", max_length=32, choices=STATUS_CHOICES, default=STATUS_NEW)
  scheduled_for = models.DateTimeField("Geplant für", blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-created_at", "-id"]
    verbose_name = "Rückrufwunsch"
    verbose_name_plural = "Rückrufwünsche"

  def __str__(self):
    return f"{self.user.email or self.user.username}: {self.phone}"


class WeatherSearch(models.Model):
  """
  Gespeicherte Wetter-Ortssuchen pro angemeldetem Konto.
  """

  user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="weather_searches")
  query = models.CharField("Suchbegriff", max_length=200)
  normalized_query = models.CharField("Normalisierter Suchbegriff", max_length=200)
  city_label = models.CharField("Angezeigter Ort", max_length=200, blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-updated_at", "-id"]
    constraints = [
      models.UniqueConstraint(
        fields=["user", "normalized_query"],
        name="unique_weather_search_per_user_query",
      )
    ]
    verbose_name = "Wetter-Suche"
    verbose_name_plural = "Wetter-Suchen"

  def __str__(self):
    return f"{self.user.email or self.user.username}: {self.city_label or self.query}"


class Appointment(models.Model):
  """
  Einzelne Terminblöcke, die im Kalender als belegt erscheinen.
  """

  interpreter = models.ForeignKey(
      "auth.User",
      on_delete=models.CASCADE,
      related_name="appointments",
      null=True,
      blank=True,
      verbose_name="Dolmetscher:in",
  )
  date = models.DateField("Datum")
  start_time = models.TimeField("Beginn", null=True, blank=True)
  end_time = models.TimeField("Ende", null=True, blank=True)
  location = models.CharField("Ort", max_length=200, blank=True)
  subject = models.CharField("Anliegen", max_length=255, blank=True)
  username = models.CharField("Benutzername", max_length=150, blank=True)
  note = models.TextField("Notiz", blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["date", "start_time", "id"]

  def __str__(self):
    time_span = ""
    if self.start_time and self.end_time:
      time_span = f" ({self.start_time}–{self.end_time})"
    elif self.start_time:
      time_span = f" ({self.start_time})"
    return f"{self.date}{time_span}: {self.subject or 'Belegt'}"

  class Meta:
    ordering = ["date", "start_time", "id"]
    verbose_name = "Termin"
    verbose_name_plural = "Termine"


class UnavailableDay(models.Model):
  """
  Markiert ganze Tage als nicht verfügbar (z. B. Urlaub, Fortbildung) je Dolmetscher:in.
  """

  interpreter = models.ForeignKey(
      "auth.User",
      on_delete=models.CASCADE,
      related_name="unavailable_days",
      null=True,
      blank=True,
      verbose_name="Dolmetscher:in",
  )
  date = models.DateField("Datum")
  note = models.CharField("Hinweis", max_length=255, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["date"]
    verbose_name = "Nicht verfügbarer Tag"
    verbose_name_plural = "Nicht verfügbare Tage"
    unique_together = ("interpreter", "date")

  def __str__(self):
    suffix = f" – {self.note}" if self.note else ""
    return f"{self.date}{suffix}"
