from django.db import migrations


PRICE_ROWS = [
    (
        10,
        "Pflege",
        "Kleine Text- oder Bildänderung",
        "Einzelne Inhalte direkt im Code sauber austauschen oder korrigieren.",
        "ab 49 EUR",
        "Für kleine Eingriffe",
    ),
    (
        20,
        "Anpassung",
        "Code-Anpassung / Design-Feinschliff",
        "Darstellung, Abstände, Bereiche oder mobile Ansicht gezielt verbessern.",
        "90 EUR/h",
        "Nach Sichtung",
    ),
    (
        30,
        "Erweiterung",
        "Neue Sektion oder Unterseite",
        "Einen neuen Bereich oder eine einfache Unterseite passend zur bestehenden Website umsetzen.",
        "ab 150 EUR",
        "Mehrsprachigkeit nach Aufwand",
    ),
    (
        40,
        "Funktion",
        "Individuelle Webfunktion",
        "Formulare, Kundenbereiche oder digitale Abläufe passend entwickeln.",
        "ab 300 EUR",
        "Individuelles Angebot",
    ),
]


OLD_TITLES = [
    "Webseiten-Anpassung",
    "Fehlerbehebung",
    "Formular / Kontaktlösung",
    "Individuelle Weblösung",
]


def update_service_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    active_titles = [title for _, _, title, _, _, _ in PRICE_ROWS]
    ServicePrice.objects.filter(title__in=OLD_TITLES).exclude(title__in=active_titles).update(is_active=False)
    ServicePrice.objects.exclude(title__in=active_titles).update(is_active=False)
    for sort_order, category, title, included, price, note in PRICE_ROWS:
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


def restore_service_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    ServicePrice.objects.filter(title__in=[title for _, _, title, _, _, _ in PRICE_ROWS]).delete()
    ServicePrice.objects.filter(title__in=OLD_TITLES).update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0030_streamline_service_prices"),
    ]

    operations = [
        migrations.RunPython(update_service_prices, restore_service_prices),
    ]
