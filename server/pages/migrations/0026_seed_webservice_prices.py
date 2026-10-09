from django.db import migrations


WEB_SERVICE_PRICES = [
    (
        70,
        "React",
        "React-Oberfläche",
        "Interaktive Seite oder kleiner App-Bereich mit Komponenten, Formularen und responsiver Darstellung.",
        "ab 250 EUR",
        "Kleines Modul",
    ),
    (
        80,
        "Django",
        "Django-Funktion",
        "Datenmodell, Adminverwaltung, Formular, E-Mail-Versand oder geschützter Arbeitsbereich.",
        "ab 300 EUR",
        "Backend-Baustein",
    ),
    (
        90,
        "Fullstack",
        "React + Django Projekt",
        "Frontend, Backend, Adminbereich, Datenfluss und Deployment-Grundstruktur in einem Projekt.",
        "ab 900 EUR",
        "Nach Konzept",
    ),
    (
        100,
        "Beratung",
        "Projektanalyse",
        "Anforderung prüfen, technische Optionen vergleichen und Aufwand mit nächsten Schritten einschätzen.",
        "80-180 EUR",
        "Vor Umsetzung",
    ),
]


def seed_webservice_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    for sort_order, category, title, included, price, note in WEB_SERVICE_PRICES:
        ServicePrice.objects.update_or_create(
            title=title,
            defaults={
                "included": included,
                "price": price,
                "category": category,
                "note": note,
                "sort_order": sort_order,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0025_serviceprice"),
    ]

    operations = [
        migrations.RunPython(seed_webservice_prices, migrations.RunPython.noop),
    ]
