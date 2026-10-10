from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0011_unavailableday"),
    ]

    operations = [
        migrations.AlterField(
            model_name="interpreterapplication",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "Neu"),
                    ("approved", "Freigegeben"),
                    ("rejected", "Abgelehnt"),
                ],
                default="new",
                max_length=32,
            ),
        ),
    ]
