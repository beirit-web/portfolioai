from django.db import migrations


PRODUCTS = (
    ("BK-HIM-003", "himbeer-cheesecake", "Himbeer-Cheesecake"),
    ("BK-KAR-006", "karotten-walnuss-kuchen", "Karotten-Walnuss-Kuchen"),
)


def correct_categories(apps, schema_editor):
    products = apps.get_model("shop", "CakeProduct").objects.using(schema_editor.connection.alias)
    for sku, slug, name in PRODUCTS:
        products.filter(sku=sku, slug=slug, name=name, category="torte").update(category="kuchen")


def restore_categories(apps, schema_editor):
    products = apps.get_model("shop", "CakeProduct").objects.using(schema_editor.connection.alias)
    for sku, slug, name in PRODUCTS:
        products.filter(sku=sku, slug=slug, name=name, category="kuchen").update(category="torte")


class Migration(migrations.Migration):
    dependencies = [("shop", "0004_ordersubmissionbudget")]
    operations = [migrations.RunPython(correct_categories, restore_categories)]
