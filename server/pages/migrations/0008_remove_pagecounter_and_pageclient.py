from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0007_alter_appointment_options_alter_chatmessage_options_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="PageClient",
        ),
        migrations.DeleteModel(
            name="PageCounter",
        ),
    ]
