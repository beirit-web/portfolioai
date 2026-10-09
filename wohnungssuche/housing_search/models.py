from django.conf import settings
from django.db import models
from django.db.models import Q
from django.urls import reverse


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SearchProfile(TimestampedModel):
    PROPERTY_APARTMENT = "apartment"
    PROPERTY_HOUSE = "house"
    PROPERTY_ROOM = "room"
    PROPERTY_CHOICES = [
        (PROPERTY_APARTMENT, "Wohnung"),
        (PROPERTY_HOUSE, "Haus"),
        (PROPERTY_ROOM, "Zimmer"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="search_profiles")
    name = models.CharField(max_length=120)
    region = models.CharField(max_length=120, default="Bodensee")
    cities = models.TextField(help_text="Kommagetrennte Staedte")
    min_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_rooms = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    max_rooms = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    min_size = models.PositiveIntegerField(null=True, blank=True)
    max_size = models.PositiveIntegerField(null=True, blank=True)
    property_type = models.CharField(max_length=30, choices=PROPERTY_CHOICES, default=PROPERTY_APARTMENT)
    pets_allowed = models.BooleanField(default=False)
    balcony = models.BooleanField(default=False)
    garden = models.BooleanField(default=False)
    elevator = models.BooleanField(default=False)
    barrier_free = models.BooleanField(default=False)
    max_distance_km = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("housing_search:search_profile_list")

    def city_list(self):
        return [city.strip() for city in self.cities.split(",") if city.strip()]


class Listing(models.Model):
    PROPERTY_APARTMENT = "apartment"
    PROPERTY_HOUSE = "house"
    PROPERTY_ROOM = "room"
    PROPERTY_CHOICES = SearchProfile.PROPERTY_CHOICES

    title = models.CharField(max_length=220)
    description = models.TextField(blank=True)
    rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    warm_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cold_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    additional_costs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deposit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rooms = models.DecimalField(max_digits=4, decimal_places=1)
    size = models.PositiveIntegerField(help_text="Wohnflaeche in m2")
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    source_name = models.CharField(max_length=120)
    source_url = models.URLField(max_length=500, blank=True)
    external_id = models.CharField(max_length=160, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    property_type = models.CharField(max_length=30, choices=PROPERTY_CHOICES, default=PROPERTY_APARTMENT)
    pets_allowed = models.BooleanField(default=False)
    balcony = models.BooleanField(default=False)
    garden = models.BooleanField(default=False)
    elevator = models.BooleanField(default=False)
    barrier_free = models.BooleanField(default=False)
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    found_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-found_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_name", "external_id"],
                condition=~Q(external_id=""),
                name="unique_listing_external_id_per_source",
            ),
            models.UniqueConstraint(
                fields=["source_url"],
                condition=~Q(source_url=""),
                name="unique_listing_source_url",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.city})"

    @property
    def warm_rent_per_sqm(self):
        if not self.warm_rent or not self.size:
            return None
        return round(self.warm_rent / self.size, 2)

    @property
    def cold_rent_per_sqm(self):
        if not self.cold_rent or not self.size:
            return None
        return round(self.cold_rent / self.size, 2)


class ListingStatus(TimestampedModel):
    STATUS_NEW = "new"
    STATUS_SEEN = "seen"
    STATUS_FAVORITE = "favorite"
    STATUS_IGNORED = "ignored"
    STATUS_CONTACTED = "contacted"
    STATUS_DOCUMENTS_SENT = "documents_sent"
    STATUS_APPLIED = "applied"
    STATUS_VIEWING = "viewing"
    STATUS_WAITING_RESPONSE = "waiting_response"
    STATUS_REJECTED = "rejected"
    STATUS_ACCEPTED = "accepted"
    STATUS_CHOICES = [
        (STATUS_NEW, "Neu"),
        (STATUS_SEEN, "Gesehen"),
        (STATUS_FAVORITE, "Favorit"),
        (STATUS_IGNORED, "Uninteressant"),
        (STATUS_CONTACTED, "Kontaktiert"),
        (STATUS_DOCUMENTS_SENT, "Unterlagen gesendet"),
        (STATUS_APPLIED, "Beworben"),
        (STATUS_VIEWING, "Besichtigung"),
        (STATUS_WAITING_RESPONSE, "Wartet auf Antwort"),
        (STATUS_REJECTED, "Abgelehnt"),
        (STATUS_ACCEPTED, "Zugesagt"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listing_statuses")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="statuses")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NEW)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "listing"], name="unique_listing_status_per_user"),
        ]

    def __str__(self):
        return f"{self.user} - {self.listing} - {self.status}"


class Notification(models.Model):
    TYPE_EMAIL = "email"
    STATUS_PREPARED = "prepared"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=40, default=TYPE_EMAIL)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, default=STATUS_PREPARED)

    class Meta:
        ordering = ["-sent_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing", "notification_type"],
                name="unique_notification_per_listing_user_type",
            ),
        ]

    def __str__(self):
        return f"{self.notification_type} {self.user} {self.listing_id}"


class Provider(TimestampedModel):
    TYPE_API = "api"
    TYPE_RSS = "rss"
    TYPE_EMAIL = "email"
    TYPE_MANUAL = "manual"
    TYPE_FAKE = "fake"
    TYPE_CHOICES = [
        (TYPE_API, "API"),
        (TYPE_RSS, "RSS"),
        (TYPE_EMAIL, "E-Mail-Suchauftrag"),
        (TYPE_MANUAL, "Manueller Import"),
        (TYPE_FAKE, "Testanbieter"),
    ]

    STATUS_ALLOWED = "allowed"
    STATUS_REVIEW = "review"
    STATUS_BLOCKED = "blocked"
    STATUS_CHOICES = [
        (STATUS_ALLOWED, "erlaubt"),
        (STATUS_REVIEW, "pruefen"),
        (STATUS_BLOCKED, "nicht angebunden"),
    ]

    name = models.CharField(max_length=160, unique=True)
    provider_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_MANUAL)
    homepage = models.URLField(max_length=500, blank=True)
    data_source = models.CharField(max_length=255, blank=True)
    api_available = models.BooleanField(default=False)
    rss_available = models.BooleanField(default=False)
    email_import_available = models.BooleanField(default=False)
    documented_interface_available = models.BooleanField(default=False)
    terms_allow_automation = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_REVIEW)
    active = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ContactLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contact_logs")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="contact_logs")
    contact_name = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    contact_date = models.DateTimeField(null=True, blank=True)
    next_follow_up = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ApplicantProfile(TimestampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applicant_profile")
    full_name = models.CharField(max_length=180)
    phone = models.CharField(max_length=80, blank=True)
    email = models.EmailField()
    current_city = models.CharField(max_length=120, blank=True)
    occupation = models.CharField(max_length=160, blank=True)
    income = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    persons_count = models.PositiveSmallIntegerField(default=1)
    pets = models.CharField(max_length=160, blank=True)
    smoking = models.BooleanField(default=False)
    schufa_available = models.BooleanField(default=False)
    documents_available = models.BooleanField(default=False)
    short_intro = models.TextField(blank=True)


class WorkLocation(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="work_locations")
    name = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.city})"


class RentLimit(models.Model):
    city_or_county = models.CharField(max_length=160)
    persons_count = models.PositiveSmallIntegerField()
    max_rent = models.DecimalField(max_digits=10, decimal_places=2)
    max_size = models.PositiveIntegerField(null=True, blank=True)
    heating_cost_note = models.TextField(blank=True)
    valid_from = models.DateField(null=True, blank=True)
    source_note = models.TextField(blank=True)

    class Meta:
        ordering = ["city_or_county", "persons_count"]

    def __str__(self):
        return f"{self.city_or_county}: {self.persons_count} Pers."

# Create your models here.
