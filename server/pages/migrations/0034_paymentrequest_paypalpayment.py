from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0033_halve_service_prices"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PaymentRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("internal_reference", models.CharField(max_length=80, unique=True, verbose_name="Interne Referenz")),
                ("title", models.CharField(max_length=180, verbose_name="Titel")),
                ("description", models.TextField(blank=True, default="", verbose_name="Beschreibung")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10, verbose_name="Betrag")),
                ("currency", models.CharField(default="EUR", max_length=3, verbose_name="Währung")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Entwurf"),
                            ("open", "Offen"),
                            ("paid", "Bezahlt"),
                            ("cancelled", "Storniert"),
                            ("expired", "Abgelaufen"),
                        ],
                        default="draft",
                        max_length=24,
                        verbose_name="Status",
                    ),
                ),
                ("customer_email", models.EmailField(blank=True, default="", max_length=254, verbose_name="Kunden-E-Mail")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payment_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Zahlungsanforderung",
                "verbose_name_plural": "Zahlungsanforderungen",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="PayPalPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("internal_reference", models.CharField(db_index=True, max_length=80, verbose_name="Interne Referenz")),
                ("paypal_order_id", models.CharField(max_length=80, unique=True, verbose_name="PayPal-Bestellnummer")),
                ("paypal_capture_id", models.CharField(blank=True, default="", max_length=120, verbose_name="PayPal-Capture-ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10, verbose_name="Betrag")),
                ("currency", models.CharField(default="EUR", max_length=3, verbose_name="Währung")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("created", "Erstellt"),
                            ("approved", "Freigegeben"),
                            ("completed", "Bezahlt"),
                            ("failed", "Fehlgeschlagen"),
                            ("cancelled", "Abgebrochen"),
                        ],
                        default="created",
                        max_length=24,
                        verbose_name="Status",
                    ),
                ),
                ("payer_email", models.EmailField(blank=True, default="", max_length=254, verbose_name="PayPal-Käufer-E-Mail")),
                ("raw_response", models.JSONField(blank=True, default=dict, verbose_name="PayPal-Antwort")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                (
                    "payment_request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="paypal_payments",
                        to="pages.paymentrequest",
                    ),
                ),
            ],
            options={
                "verbose_name": "PayPal-Zahlung",
                "verbose_name_plural": "PayPal-Zahlungen",
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
