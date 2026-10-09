from django.db import migrations


OLD_URL = "/static/images/portfolio-online-shop-desktop.webp"
NEW_URL = "/static/images/portfolio-online-shop-desktop-v2.webp"
OLD_ALT = "Beirit Backstube React/Django-Shop mit Torten und Kuchen"
NEW_ALT = "Beirit Backstube Django-Shop mit 22 Kuchen- und Tortenartikeln"


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="online-shop", image="", image_url=OLD_URL).update(image_url=NEW_URL)
    projects.filter(slug="online-shop", image="", image_url=NEW_URL, image_alt=OLD_ALT).update(image_alt=NEW_ALT)


def backwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="online-shop", image="", image_url=NEW_URL, image_alt=NEW_ALT).update(image_alt=OLD_ALT)
    projects.filter(slug="online-shop", image="", image_url=NEW_URL).update(image_url=OLD_URL)


class Migration(migrations.Migration):
    dependencies = [("pages", "0042_shop_storefront_url")]
    operations = [migrations.RunPython(forwards, backwards)]
