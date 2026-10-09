from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0020_seed_jobcenter_quiz"),
    ]

    operations = [
        migrations.AlterField(
            model_name="subscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("trialing", "Trialing"),
                    ("active", "Active"),
                    ("past_due", "Past due"),
                    ("canceled", "Canceled"),
                    ("expired", "Expired"),
                ],
                default="active",
                max_length=24,
            ),
        ),
    ]
