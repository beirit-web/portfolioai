from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0012_alter_interpreterapplication_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="interpreterapplication",
            name="display_name",
            field=models.CharField(
                blank=True,
                help_text="Name oder Firmenname für die öffentliche Anzeige",
                max_length=200,
            ),
        ),
    ]
