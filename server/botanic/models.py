from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Species(models.Model):
    taxon_id = models.PositiveIntegerField(primary_key=True)
    name = models.CharField(max_length=200)
    scientific_name = models.CharField(max_length=200)
    rank = models.CharField(max_length=30, default="species")
    image_url = models.URLField(max_length=500, blank=True)
    image_attribution = models.CharField(max_length=500, blank=True)
    image_license = models.CharField(max_length=20, blank=True)
    image_source_url = models.URLField(max_length=500, blank=True)
    fetched_at = models.DateTimeField(default=timezone.now)
    details_fetched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Pflanzenart"
        verbose_name_plural = "Pflanzenarten"

    def __str__(self):
        return self.name

    @property
    def source_url(self):
        return f"https://www.inaturalist.org/taxa/{self.taxon_id}"

    @property
    def license_url(self):
        return {
            "cc0": "https://creativecommons.org/publicdomain/zero/1.0/",
            "cc-by": "https://creativecommons.org/licenses/by/4.0/",
        }.get(self.image_license, "")


class Plant(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="botanic_plants")
    species = models.ForeignKey(Species, on_delete=models.PROTECT, related_name="plants")
    nickname = models.CharField("Name deiner Pflanze", max_length=80, blank=True)
    location = models.CharField("Standort", max_length=80, blank=True)
    notes = models.TextField("Notizen", max_length=3000, blank=True)
    watering_interval = models.PositiveSmallIntegerField(
        "Intervall in Tagen", default=7, validators=[MinValueValidator(1), MaxValueValidator(365)],
    )
    next_watering = models.DateField("Nächster Gießtermin", default=timezone.localdate, null=True, blank=True)
    paused = models.BooleanField("Gießplan pausieren", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["next_watering", "nickname", "id"]
        verbose_name = "Eigene Pflanze"
        verbose_name_plural = "Eigene Pflanzen"
        constraints = [models.CheckConstraint(
            check=models.Q(watering_interval__gte=1, watering_interval__lte=365), name="botanic_valid_interval",
        )]
        indexes = [models.Index(fields=["owner", "paused", "next_watering"])]

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        return self.nickname or self.species.name

    @property
    def status(self):
        if self.paused or self.next_watering is None:
            return "paused"
        today = timezone.localdate()
        if self.next_watering < today:
            return "overdue"
        if self.next_watering == today:
            return "today"
        return "upcoming"

    @property
    def status_label(self):
        return {"paused": "Pausiert", "overdue": "Überfällig", "today": "Heute fällig", "upcoming": "Geplant"}[self.status]

    @property
    def days_overdue(self):
        return max(0, (timezone.localdate() - self.next_watering).days) if self.next_watering else 0

    def schedule_after(self, day):
        self.next_watering = day + timedelta(days=self.watering_interval)
        self.save(update_fields=["next_watering", "updated_at"])


class Watering(models.Model):
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name="waterings")
    watered_on = models.DateField(default=timezone.localdate)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-watered_on", "-id"]
        constraints = [models.UniqueConstraint(fields=["plant", "watered_on"], name="botanic_one_watering_per_day")]
        verbose_name = "Gießvorgang"
        verbose_name_plural = "Gießprotokoll"


class ApiBudget(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    day = models.DateField(default=timezone.localdate)
    requests = models.PositiveIntegerField(default=0)
    next_request_at = models.DateTimeField(default=timezone.now)
