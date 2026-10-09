from django.db import migrations


OLD_URL = "/static/portfolio/vertragsgenerator-main/index.html"
NEW_URL = "/vertragsgenerator/"


def forwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.using(schema_editor.connection.alias).filter(
        slug="vertragsgenerator", live_url=OLD_URL,
    ).update(live_url=NEW_URL)


def backwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.using(schema_editor.connection.alias).filter(
        slug="vertragsgenerator", live_url=NEW_URL,
    ).update(live_url=OLD_URL)


class Migration(migrations.Migration):
    dependencies = [("pages", "0039_update_online_shop_cake_storefront")]
    operations = [migrations.RunPython(forwards, backwards)]
