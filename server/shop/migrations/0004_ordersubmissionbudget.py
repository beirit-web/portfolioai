from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [("shop", "0003_expand_cake_catalog")]

    operations = [
        migrations.CreateModel(
            name="OrderSubmissionBudget",
            fields=[
                ("key", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("window_started_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ("submissions", models.PositiveIntegerField(default=0)),
            ],
        ),
    ]
