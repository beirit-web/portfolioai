from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0017_mealplan"),
    ]

    operations = [
        migrations.AddField(
            model_name="interpreterapplication",
            name="specialization",
            field=models.CharField(
                "Fachgebiet (optional)", max_length=200, blank=True, default=""
            ),
        ),
    ]
