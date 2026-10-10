from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0006_load_january2026_appointments"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="appointment",
            options={
                "ordering": ["date", "start_time", "id"],
                "verbose_name": "Termin",
                "verbose_name_plural": "Termine",
            },
        ),
        migrations.AlterModelOptions(
            name="chatmessage",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Chat-Nachricht",
                "verbose_name_plural": "Chat-Nachrichten",
            },
        ),
        migrations.AlterModelOptions(
            name="interpreterapplication",
            options={
                "verbose_name": "Dolmetscher-Bewerbung",
                "verbose_name_plural": "Dolmetscher-Bewerbungen",
            },
        ),
        migrations.AlterModelOptions(
            name="pageclient",
            options={
                "verbose_name": "Seiten-Client",
                "verbose_name_plural": "Seiten-Clients",
            },
        ),
        migrations.AlterModelOptions(
            name="pagecounter",
            options={
                "verbose_name": "Seitenzähler",
                "verbose_name_plural": "Seitenzähler",
            },
        ),
    ]
