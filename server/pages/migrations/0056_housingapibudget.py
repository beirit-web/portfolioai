from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("pages", "0055_housing_django_url")]
    operations = [
        migrations.CreateModel(
            name="HousingApiBudget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month", models.DateField(unique=True)),
                ("requests", models.PositiveIntegerField(default=0)),
                ("next_request_at", models.DateTimeField()),
            ],
        ),
    ]
