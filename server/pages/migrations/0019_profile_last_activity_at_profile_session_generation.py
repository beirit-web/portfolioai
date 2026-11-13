from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0018_interpreterapplication_specialization"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="last_activity_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="session_generation",
            field=models.PositiveBigIntegerField(default=0),
        ),
    ]
