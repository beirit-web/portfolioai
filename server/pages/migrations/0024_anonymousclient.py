import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0023_weathersearch"),
    ]

    operations = [
        migrations.CreateModel(
            name="AnonymousClient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("last_intro_video_played_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Anonymer Client",
                "verbose_name_plural": "Anonyme Clients",
                "ordering": ["-last_seen_at", "-id"],
            },
        ),
    ]
