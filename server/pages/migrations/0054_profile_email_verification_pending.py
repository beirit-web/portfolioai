from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("pages", "0053_loginattemptbucket")]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="email_verification_pending",
            field=models.BooleanField(default=False),
        ),
    ]
