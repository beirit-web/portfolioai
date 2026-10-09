from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

  dependencies = [
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ("pages", "0022_alter_profile_options_profile_callback_phone_and_more"),
  ]

  operations = [
    migrations.CreateModel(
      name="WeatherSearch",
      fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("query", models.CharField(max_length=200, verbose_name="Suchbegriff")),
        ("normalized_query", models.CharField(max_length=200, verbose_name="Normalisierter Suchbegriff")),
        ("city_label", models.CharField(blank=True, default="", max_length=200, verbose_name="Angezeigter Ort")),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
        (
          "user",
          models.ForeignKey(
            on_delete=django.db.models.deletion.CASCADE,
            related_name="weather_searches",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "verbose_name": "Wetter-Suche",
        "verbose_name_plural": "Wetter-Suchen",
        "ordering": ["-updated_at", "-id"],
      },
    ),
    migrations.AddConstraint(
      model_name="weathersearch",
      constraint=models.UniqueConstraint(
        fields=("user", "normalized_query"),
        name="unique_weather_search_per_user_query",
      ),
    ),
  ]
