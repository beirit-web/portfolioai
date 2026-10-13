from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("lessons", "0012_plan_webhookevent_subscription")]

    operations = [
        migrations.AddField(
            model_name="quizattempt",
            name="quiz_token_hash",
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="quizattempt",
            name="submission_hash",
            field=models.CharField(blank=True, default="", editable=False, max_length=64),
        ),
    ]
