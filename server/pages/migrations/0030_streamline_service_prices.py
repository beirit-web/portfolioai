from django.db import migrations


PRICE_ROWS = [
    (
        10,
        "Webseiten-Anpassung",
        "Webseiten-Anpassung",
        "Texte, Bereiche oder Darstellung gezielt anpassen.",
        "ab 120 EUR",
        "Nach Sichtung",
    ),
    (
        20,
        "Fehlerbehebung",
        "Fehlerbehebung",
        "Darstellungs- oder Ladefehler gezielt beheben.",
        "ab 180 EUR",
        "Nach Prüfung",
    ),
    (
        30,
        "Kontakt",
        "Formular / Kontaktlösung",
        "Eingaben, Meldungen und Versand zuverlässig umsetzen.",
        "ab 250 EUR",
        "Nach Prüfung",
    ),
    (
        40,
        "Weblösung",
        "Individuelle Weblösung",
        "Kundenbereiche oder digitale Abläufe passend entwickeln.",
        "ab 1.200 EUR",
        "Individuelles Angebot",
    ),
]


def streamline_service_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    active_titles = [title for _, _, title, _, _, _ in PRICE_ROWS]
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
    ServicePrice.objects.update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0029_rename_localization_serviceprice"),
    ]

    operations = [
        migrations.RunPython(streamline_service_prices, restore_service_prices),
    ]
