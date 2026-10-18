from decimal import Decimal
from uuid import uuid4

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


class CakeProduct(models.Model):
    CATEGORY_CAKE = "torte"
    CATEGORY_WHOLE_CAKE = "kuchen"
    CATEGORY_SLICES = "stueck"
    CATEGORY_TART = "tarte"
    CATEGORY_BOX = "box"
    CATEGORY_CHOICES = (
        (CATEGORY_CAKE, "Torten"),
        (CATEGORY_WHOLE_CAKE, "Kuchen"),
        (CATEGORY_SLICES, "Kuchenstücke"),
        (CATEGORY_TART, "Tartes"),
        (CATEGORY_BOX, "Geschenkboxen"),
    )

    sku = models.CharField("Artikelnummer", max_length=40, unique=True)
    slug = models.SlugField("Slug", unique=True)
    name = models.CharField("Name", max_length=160)
    category = models.CharField("Kategorie", max_length=24, choices=CATEGORY_CHOICES)
    description = models.TextField("Beschreibung")
    price = models.DecimalField("Preis", max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    image_url = models.CharField("Bild-URL", max_length=500)
    ingredients = models.TextField("Zutaten", blank=True, default="")
    allergens = models.CharField("Allergene", max_length=240, blank=True, default="")
    serves = models.CharField("Portionen", max_length=80, blank=True, default="")
    lead_time_days = models.PositiveSmallIntegerField("Vorlaufzeit in Tagen", default=1)
    stock_status = models.CharField("Verfügbarkeit", max_length=120, default="Auf Bestellung")
    is_available = models.BooleanField("Bestellbar", default=True)
    is_featured = models.BooleanField("Empfohlen", default=False)
    sort_order = models.PositiveIntegerField("Sortierung", default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Kuchenprodukt"
        verbose_name_plural = "Kuchenprodukte"

    def __str__(self):
        return f"{self.name} ({self.sku})"


class CakeOrder(models.Model):
    STATUS_NEW = "new"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_NEW, "Neu"),
        (STATUS_CONFIRMED, "Bestätigt"),
        (STATUS_CANCELLED, "Storniert"),
    )
    DELIVERY_PICKUP = "pickup"
    DELIVERY_LOCAL = "local_delivery"
    DELIVERY_CHOICES = (
        (DELIVERY_PICKUP, "Abholung"),
        (DELIVERY_LOCAL, "Lokale Lieferung"),
    )

    order_number = models.CharField("Bestellnummer", max_length=32, unique=True, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="cake_orders")
    request_key = models.UUIDField(unique=True, null=True, blank=True, editable=False)
    status = models.CharField("Status", max_length=24, choices=STATUS_CHOICES, default=STATUS_NEW)
    customer_name = models.CharField("Name", max_length=160)
    customer_email = models.EmailField("E-Mail")
    customer_phone = models.CharField("Telefon", max_length=80, blank=True, default="")
    delivery_method = models.CharField("Übergabe", max_length=24, choices=DELIVERY_CHOICES)
    requested_date = models.DateField("Wunschdatum", blank=True, null=True)
    delivery_address = models.CharField("Straße und Hausnummer", max_length=240, blank=True)
    postal_code = models.CharField("Postleitzahl", max_length=10, blank=True)
    city = models.CharField("Ort", max_length=100, blank=True)
    customer_note = models.TextField("Hinweis", blank=True, default="")
    subtotal = models.DecimalField("Zwischensumme", max_digits=9, decimal_places=2)
    delivery_fee = models.DecimalField("Liefergebühr", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField("Gesamt", max_digits=9, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Kuchenbestellung"
        verbose_name_plural = "Kuchenbestellungen"

    def save(self, *args, **kwargs):
        if not self.order_number:
            stamp = timezone.localdate().strftime("%Y%m%d")
            self.order_number = f"BK-{stamp}-{uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.customer_name}"


class CakeOrderItem(models.Model):
    order = models.ForeignKey(CakeOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(CakeProduct, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField("Produktname", max_length=160)
    unit_price = models.DecimalField("Einzelpreis", max_digits=8, decimal_places=2)
    quantity = models.PositiveSmallIntegerField("Menge", validators=[MinValueValidator(1), MaxValueValidator(20)])
    line_total = models.DecimalField("Positionssumme", max_digits=9, decimal_places=2)

    class Meta:
        verbose_name = "Bestellposition"
        verbose_name_plural = "Bestellpositionen"

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"


class OrderSubmissionBudget(models.Model):
    """Shared, short-lived counters; keys contain no raw IP or session data."""

    key = models.CharField(max_length=64, primary_key=True)
    window_started_at = models.DateTimeField(default=timezone.now, db_index=True)
    submissions = models.PositiveIntegerField(default=0)
