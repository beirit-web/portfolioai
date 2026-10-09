from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0030_auditevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="theme_preference",
            field=models.CharField(choices=[("system", "System"), ("light", "Light"), ("dark", "Dark")], default="system", max_length=12),
        ),
    ]
