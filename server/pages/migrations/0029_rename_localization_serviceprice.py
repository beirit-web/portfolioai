from django.db import migrations


OLD_TITLE = "Lokalisierung DE/RU"
OLD_CATEGORY = "Lokalisierung"
OLD_INCLUDED = "Website-, UI- und JSON-Texte übertragen, glätten und konsistent machen."

NEW_TITLE = "Übersetzung von Web- und Softwaretexten DE/RU"
NEW_CATEGORY = "Übersetzung"
NEW_INCLUDED = (
    "Webseiten-, UI- und Softwaretexte Deutsch/Russisch übersetzen, glätten "
    "und sprachlich anpassen. Die Übersetzung kann auch offline erfolgen."
)


def rename_localization_price(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    ServicePrice.objects.filter(title=OLD_TITLE).update(
        title=NEW_TITLE,
        category=NEW_CATEGORY,
        included=NEW_INCLUDED,
    )


def restore_localization_price(apps, _schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    ServicePrice.objects.filter(title=NEW_TITLE).update(
        title=OLD_TITLE,
        category=OLD_CATEGORY,
        included=OLD_INCLUDED,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0028_privacy_consent_records"),
    ]

    operations = [
        migrations.RunPython(rename_localization_price, restore_localization_price),
    ]
