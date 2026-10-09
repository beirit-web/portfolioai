from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0020_rename_chat_model_labels"),
    ]

    operations = [
        migrations.DeleteModel(
            name="MealPlan",
        ),
    ]
