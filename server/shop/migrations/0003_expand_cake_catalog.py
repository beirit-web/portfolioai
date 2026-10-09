from decimal import Decimal

from django.db import migrations, models


PRODUCTS = [
    {
        "sku": "BK-APS-009", "slug": "apfel-streusel-kuchen", "name": "Apfel-Streusel-Kuchen", "category": "kuchen",
        "description": "Saftige Apfelfüllung auf einem feinen Boden, mit goldbraunen Butterstreuseln und einer Prise Zimt.",
        "price": "26.90", "ingredients": "Äpfel, Weizenmehl, Butter, Zucker, Eier, Zimt, Backpulver",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 1,
    },
    {
        "sku": "BK-MAR-010", "slug": "marmorkuchen", "name": "Marmorkuchen", "category": "kuchen",
        "description": "Klassischer Gugelhupf mit lockerem Vanille- und Kakaoteig, fein mit Puderzucker bestäubt.",
        "price": "22.90", "ingredients": "Weizenmehl, Butter, Eier, Zucker, Milch, Kakao, Vanille, Backpulver",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 1,
    },
    {
        "sku": "BK-ZMO-011", "slug": "zitronen-mohn-kuchen", "name": "Zitronen-Mohn-Kuchen", "category": "kuchen",
        "description": "Saftiger Kastenkuchen mit feinem Mohn, frischem Zitronenabrieb und einer hellen Zitronenglasur.",
        "price": "24.90", "ingredients": "Weizenmehl, Butter, Eier, Zucker, Mohn, Zitrone, Milch, Backpulver",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "8-10 Stücke", "lead_time_days": 1,
    },
    {
        "sku": "BK-DON-012", "slug": "donauwellen-kuchen", "name": "Donauwellen-Kuchen", "category": "kuchen",
        "description": "Heller und dunkler Rührteig mit Sauerkirschen, Vanillebuttercreme und einer gewellten Schokoladendecke.",
        "price": "32.90", "ingredients": "Weizenmehl, Butter, Eier, Zucker, Sauerkirschen, Milch, Kakao, dunkle Schokolade (mit Sojalecithin), Vanille, Backpulver",
        "allergens": "Gluten (Weizen), Milch, Eier, Soja", "serves": "12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-BIE-013", "slug": "bienenstich", "name": "Bienenstich", "category": "kuchen",
        "description": "Luftiger Hefekuchen mit Vanillecreme und einer knusprig karamellisierten Honig-Mandel-Decke.",
        "price": "29.90", "ingredients": "Weizenmehl, Milch, Butter, Eier, Zucker, Hefe, Honig, Mandeln, Sahne, Vanille",
        "allergens": "Gluten (Weizen), Milch, Eier, Mandeln", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-PFL-014", "slug": "pflaumen-streusel-kuchen", "name": "Pflaumen-Streusel-Kuchen", "category": "kuchen",
        "description": "Fruchtiger Pflaumenkuchen auf Hefeboden, mit goldenen Streuseln und einem Hauch Zimt.",
        "price": "27.90", "ingredients": "Pflaumen, Weizenmehl, Butter, Milch, Zucker, Eier, Hefe, Zimt",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 1,
    },
    {
        "sku": "BK-NNO-015", "slug": "nuss-nougat-kuchen", "name": "Nuss-Nougat-Kuchen", "category": "kuchen",
        "description": "Saftiger Haselnuss-Kastenkuchen mit Nougatglasur und gerösteten Haselnüssen.",
        "price": "28.90", "ingredients": "Haselnüsse, Weizenmehl, Butter, Eier, Zucker, Milch, Nougat (mit Sojalecithin), Kakao, Backpulver",
        "allergens": "Gluten (Weizen), Milch, Eier, Haselnüsse, Soja", "serves": "8-10 Stücke", "lead_time_days": 1,
    },
    {
        "sku": "BK-SAC-016", "slug": "sachertorte", "name": "Sachertorte", "category": "torte",
        "description": "Feiner Schokoladenkuchen mit Aprikosenkonfitüre und einer glatten, dunklen Schokoladenglasur.",
        "price": "38.90", "ingredients": "Dunkle Schokolade (mit Sojalecithin), Butter, Eier, Zucker, Weizenmehl, Aprikosenkonfitüre, Sahne",
        "allergens": "Gluten (Weizen), Milch, Eier, Soja", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-KSA-017", "slug": "kaese-sahne-torte", "name": "Käse-Sahne-Torte", "category": "torte",
        "description": "Leichte Quark-Sahne-Creme zwischen zwei Biskuitböden, mit einem Hauch Zitrone und Puderzucker.",
        "price": "35.90", "ingredients": "Quark, Sahne, Eier, Zucker, Weizenmehl, Zitrone, Gelatine, Vanille",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-MMA-018", "slug": "mango-maracuja-torte", "name": "Mango-Maracuja-Torte", "category": "torte",
        "description": "Fruchtige Mango-Sahne-Creme auf hellem Biskuit, mit Maracujaspiegel und frischen Mangostücken.",
        "price": "41.90", "ingredients": "Mango, Maracuja, Sahne, Eier, Zucker, Weizenmehl, Gelatine, Vanille",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-PHI-019", "slug": "pistazien-himbeer-torte", "name": "Pistazien-Himbeer-Torte", "category": "torte",
        "description": "Feine Pistaziencreme mit einer fruchtigen Himbeerschicht, hellem Biskuit und gehackten Pistazien.",
        "price": "44.90", "ingredients": "Pistazien, Himbeeren, Sahne, Mascarpone, Eier, Zucker, Weizenmehl, Gelatine",
        "allergens": "Gluten (Weizen), Milch, Eier, Pistazien", "serves": "10-12 Stücke", "lead_time_days": 3,
    },
    {
        "sku": "BK-HJO-020", "slug": "heidelbeer-joghurt-torte", "name": "Heidelbeer-Joghurt-Torte", "category": "torte",
        "description": "Frische Joghurt-Sahne-Creme mit Heidelbeeren auf Biskuit, verfeinert mit einem violetten Beerenspiegel.",
        "price": "37.90", "ingredients": "Heidelbeeren, Joghurt, Sahne, Eier, Zucker, Weizenmehl, Gelatine, Zitrone",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "8-10 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-TIR-021", "slug": "tiramisu-torte", "name": "Tiramisu-Torte", "category": "torte",
        "description": "Mit Espresso getränkter Biskuit, cremige Mascarpone und eine feine Kakaodecke. Ohne zugesetzten Alkohol.",
        "price": "39.90", "ingredients": "Mascarpone, Sahne, Eier, Zucker, Weizenmehl, Espresso, Kakao, Gelatine",
        "allergens": "Gluten (Weizen), Milch, Eier", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
    {
        "sku": "BK-MOK-022", "slug": "mokka-torte", "name": "Mokka-Torte", "category": "torte",
        "description": "Feiner Biskuit mit aromatischer Mokkabuttercreme, Schokoladenbohnen und zarten Creme-Rosetten.",
        "price": "36.90", "ingredients": "Weizenmehl, Eier, Butter, Zucker, Milch, Espresso, dunkle Schokolade (mit Sojalecithin), Vanille",
        "allergens": "Gluten (Weizen), Milch, Eier, Soja", "serves": "10-12 Stücke", "lead_time_days": 2,
    },
]


def add_cake_products(apps, schema_editor):
    products = apps.get_model("shop", "CakeProduct").objects.using(schema_editor.connection.alias)
    for index, product in enumerate(PRODUCTS, start=9):
        defaults = {
            **product,
            "price": Decimal(product["price"]),
            "image_url": f"/static/shop/products/{product['slug']}.webp",
            "stock_status": "Frisch auf Bestellung",
            "is_available": True,
            "is_featured": False,
            "sort_order": index * 10,
        }
        # Preserve product edits when a previously applied seed is run again.
        products.get_or_create(sku=product["sku"], defaults=defaults)


class Migration(migrations.Migration):
    dependencies = [("shop", "0002_cakeorder_city_cakeorder_delivery_address_and_more")]

    operations = [
        migrations.AlterField(
            model_name="cakeproduct",
            name="category",
            field=models.CharField(
                "Kategorie", max_length=24,
                choices=[("torte", "Torten"), ("kuchen", "Kuchen"), ("stueck", "Kuchenstücke"), ("tarte", "Tartes"), ("box", "Geschenkboxen")],
            ),
        ),
        migrations.RunPython(add_cake_products, migrations.RunPython.noop),
    ]
