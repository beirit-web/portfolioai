from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0019_profile_last_activity_at_profile_session_generation"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="chatmessage",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Kontaktanfrage",
                "verbose_name_plural": "Kontaktanfragen",
            },
        ),
        migrations.AlterModelOptions(
            name="chatreply",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Kontaktantwort",
                "verbose_name_plural": "Kontaktantworten",
            },
        ),
    ]
