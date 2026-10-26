from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("lessons", "0014_scene_progress_identity")]
    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="interface_language",
            field=models.CharField(
                choices=[("ru", "Russian"), ("de", "German"), ("en", "English"), ("uk", "Ukrainian")],
                default="ru",
                max_length=8,
            ),
        ),
    ]
