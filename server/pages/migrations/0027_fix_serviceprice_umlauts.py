from django.db import migrations


REPLACEMENTS = [
    ("React-Oberflaeche", "React-Oberfläche"),
    (
        "Datenmodell, Adminverwaltung, Formular, E-Mail-Versand oder geschuetzter Arbeitsbereich.",
        "Datenmodell, Adminverwaltung, Formular, E-Mail-Versand oder geschützter Arbeitsbereich.",
    ),
    (
        "Anforderung pruefen, technische Optionen vergleichen und Aufwand mit naechsten Schritten einschaetzen.",
        "Anforderung prüfen, technische Optionen vergleichen und Aufwand mit nächsten Schritten einschätzen.",
    ),
]


def fix_serviceprice_umlauts(apps, schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    for old, new in REPLACEMENTS:
        ServicePrice.objects.filter(title=old).update(title=new)
        ServicePrice.objects.filter(included=old).update(included=new)


def restore_serviceprice_ascii(apps, schema_editor):
    ServicePrice = apps.get_model("pages", "ServicePrice")
    for old, new in REPLACEMENTS:
        ServicePrice.objects.filter(title=new).update(title=old)
        ServicePrice.objects.filter(included=new).update(included=old)


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0026_seed_webservice_prices"),
    ]

    operations = [
        migrations.RunPython(fix_serviceprice_umlauts, restore_serviceprice_ascii),
    ]
