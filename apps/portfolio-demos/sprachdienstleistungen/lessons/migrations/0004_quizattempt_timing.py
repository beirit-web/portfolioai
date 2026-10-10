from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0003_scene_quizresult_achievement_chathistory_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="quizattempt",
            name="difficulty",
            field=models.CharField(
                choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
                default="easy",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="quizattempt",
            name="duration_seconds",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
