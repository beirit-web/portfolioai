from django.db import migrations


HALVED_PRICE_ROWS = {
    "Kleine Text- oder Bildänderung": ("ab 49 EUR", "ab 24,50 EUR"),
    "Code-Anpassung / Design-Feinschliff": ("90 EUR/h", "45 EUR/h"),
    "Neue Sektion oder Unterseite": ("ab 150 EUR", "ab 75 EUR"),
    "Individuelle Webfunktion": ("ab 300 EUR", "ab 150 EUR"),
}


def halve_service_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    for title, (old_price, new_price) in HALVED_PRICE_ROWS.items():
        ServicePrice.objects.filter(title=title, price=old_price).update(price=new_price)


def restore_service_prices(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    for title, (old_price, new_price) in HALVED_PRICE_ROWS.items():
        ServicePrice.objects.filter(title=title, price=new_price).update(price=old_price)


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0032_fix_hourly_adjustment_price"),
    ]

    operations = [
        migrations.RunPython(halve_service_prices, restore_service_prices),
    ]
