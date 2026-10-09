from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("lessons", "0029_seed_oeffentlicher_verkehr_module"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("admin_model_created", "Admin model created"),
                            ("admin_model_updated", "Admin model updated"),
                            ("admin_model_deleted", "Admin model deleted"),
                            ("role_changed", "Role changed"),
                            ("premium_status_changed", "Premium status changed"),
                            ("subscription_changed", "Subscription changed"),
                            ("plan_changed", "Plan changed"),
                            ("permission_denied", "Permission denied"),
                            ("billing_webhook_processed", "Billing webhook processed"),
                        ],
                        max_length=64,
                    ),
                ),
                ("target_type", models.CharField(max_length=120)),
                ("target_id", models.CharField(blank=True, max_length=120)),
                ("path", models.CharField(blank=True, max_length=240)),
                ("request_id", models.CharField(blank=True, max_length=100)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_events", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditevent",
            index=models.Index(fields=["action", "created_at"], name="lessons_aud_action_a1fadf_idx"),
        ),
        migrations.AddIndex(
            model_name="auditevent",
            index=models.Index(fields=["actor", "created_at"], name="lessons_aud_actor_i_772d3d_idx"),
        ),
        migrations.AddIndex(
            model_name="auditevent",
            index=models.Index(fields=["target_type", "target_id"], name="lessons_aud_target__d42b9f_idx"),
        ),
    ]
