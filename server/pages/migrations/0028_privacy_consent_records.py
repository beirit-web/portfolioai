from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0027_fix_serviceprice_umlauts"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="privacy_consent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Datenschutz zugestimmt am"),
        ),
        migrations.AddField(
            model_name="profile",
            name="privacy_consent_source",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Quelle der Zustimmung"),
        ),
        migrations.AddField(
            model_name="profile",
            name="privacy_consent_version",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Datenschutzhinweis-Version"),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="privacy_consent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Datenschutz zugestimmt am"),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="privacy_consent_version",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Datenschutzhinweis-Version"),
        ),
    ]
