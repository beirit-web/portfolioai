from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0009_profile"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="profile",
            name="image",
        ),
        migrations.AddField(
            model_name="profile",
            name="image_data",
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="image_mime",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="profile",
            name="image_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
