from django.db import models
from django.contrib.auth.models import User


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

  STATUS_PENDING = "pending"
  STATUS_CONFIRMED = "confirmed"
  STATUS_CANCELLED = "cancelled"
  STATUS_REJECTED = "rejected"
  STATUS_CHOICES = (
    (STATUS_PENDING, "Anfrage offen"),
    (STATUS_CONFIRMED, "Bestätigt"),
    (STATUS_CANCELLED, "Storniert"),
    (STATUS_REJECTED, "Abgelehnt"),
  )
  ACTIVE_STATUSES = (STATUS_PENDING, STATUS_CONFIRMED)

  APPOINTMENT_TYPE_PHONE = "phone"
  APPOINTMENT_TYPE_ONLINE = "online"
  APPOINTMENT_TYPE_ONSITE = "onsite"
  APPOINTMENT_TYPE_OTHER = "other"
  APPOINTMENT_TYPE_CHOICES = (
    (APPOINTMENT_TYPE_PHONE, "Telefonische Sprachmittlung"),
    (APPOINTMENT_TYPE_ONLINE, "Online-Sprachmittlung"),
    (APPOINTMENT_TYPE_ONSITE, "Persönliche Begleitung"),
    (APPOINTMENT_TYPE_OTHER, "Sonstiger Termin"),
  )

  interpreter = models.ForeignKey(
      "auth.User",
      on_delete=models.CASCADE,
      related_name="appointments",
      null=True,
      blank=True,
      verbose_name="Dolmetscher:in",
  )
  name = models.CharField("Name", max_length=200, blank=True, default="")
  email = models.EmailField("E-Mail", max_length=254, blank=True, default="")
  phone = models.CharField("Mobilnummer", max_length=50, blank=True, default="")
  date = models.DateField("Datum")
  preferred_time = models.TimeField("Gewünschte Uhrzeit", null=True, blank=True)
  appointment_type = models.CharField(
    "Terminart",
    max_length=32,
    choices=APPOINTMENT_TYPE_CHOICES,
    blank=True,
    default="",
  )
  start_time = models.TimeField("Beginn", null=True, blank=True)
  end_time = models.TimeField("Ende", null=True, blank=True)
  location = models.CharField("Ort", max_length=200, blank=True)
  subject = models.CharField("Anliegen", max_length=255, blank=True)
  username = models.CharField("Benutzername", max_length=150, blank=True)
  note = models.TextField("Notiz", blank=True)
  message = models.TextField("Nachricht", blank=True, default="")
  status = models.CharField(
    "Status",
    max_length=32,
    choices=STATUS_CHOICES,
    default=STATUS_CONFIRMED,
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self):
    time_span = ""
    display_time = self.preferred_time or self.start_time
    if display_time and self.end_time:
      time_span = f" ({display_time}–{self.end_time})"
    elif display_time:
      time_span = f" ({display_time})"
    title = self.name or self.subject or "Belegt"
    return f"{self.date}{time_span}: {title}"

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
