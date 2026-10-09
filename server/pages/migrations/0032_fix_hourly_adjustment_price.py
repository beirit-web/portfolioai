from django.db import migrations


def fix_hourly_adjustment_price(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    ServicePrice.objects.filter(
        title="Code-Anpassung / Design-Feinschliff",
        price="90-110 EUR/h",
    ).update(price="90 EUR/h")


def restore_hourly_adjustment_price(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    ServicePrice.objects.filter(
        title="Code-Anpassung / Design-Feinschliff",
        price="90 EUR/h",
    ).update(price="90-110 EUR/h")


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0031_update_no_cms_service_prices"),
    ]

    operations = [
        migrations.RunPython(fix_hourly_adjustment_price, restore_hourly_adjustment_price),
    ]
