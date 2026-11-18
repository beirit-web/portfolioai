from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("pages", "0056_housingapibudget"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(
        name="EmailChangeRequest",
        fields=[
            ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, serialize=False, to=settings.AUTH_USER_MODEL)),
            ("current_email", models.EmailField(max_length=254)),
            ("new_email", models.EmailField(max_length=254)),
            ("token_digest", models.CharField(max_length=64)),
            ("auth_hash", models.CharField(max_length=64)),
            ("expires_at", models.DateTimeField()),
        ],
    )]
