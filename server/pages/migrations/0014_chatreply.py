from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0013_interpreterapplication_display_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatReply",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("client_hash", models.CharField(db_index=True, max_length=128)),
                ("text", models.TextField()),
                ("delivered", models.BooleanField(default=False)),
            ],
            options={
                "verbose_name": "Chat-Antwort",
                "verbose_name_plural": "Chat-Antworten",
                "ordering": ["-created_at"],
            },
        ),
    ]
