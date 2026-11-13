from django.db import migrations


def update_online_shop_cake_storefront(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.update_or_create(
        slug="online-shop",
        defaults={
            "title": "Torten- und Kuchen-Shop",
            "short_description": (
                "Shop-Konzept für Torten und Kuchen mit Django-Produktdaten, "
                "React-Storefront, Warenkorb, Wunschdatum und Bestellanfrage."
            ),
            "description": (
                "React- und Django-Webapp für einen ausbaufähigen Konditorei-Onlineshop "
                "mit Produktverwaltung, Warenkorb und Bestellanfragen."
            ),
            "situation": (
                "Aus einer einfachen Shop-Demo sollte ein realistisch ausbaufähiger "
                "Onlineshop entstehen, der später tatsächlich für Torten und Kuchen "
                "betrieben werden kann."
            ),
            "implementation": (
                "Umsetzung als React/Vite-Storefront mit Django-App, Produkt- und "
                "Bestellmodellen, Admin-Verwaltung, Produkt-API, Bestell-API und "
                "lokalen Artikelbildern für Torten, Kuchenstücke, Tartes und Geschenkboxen."
            ),
            "result": (
                "Die Storefront zeigt ein Konditorei-Sortiment mit passenden Produktbildern, "
                "Suche, Kategorien, Warenkorb, Abholung oder lokaler Lieferung, Wunschdatum "
                "und serverseitig berechneter Bestellanfrage."
            ),
            "image_url": "/static/images/portfolio-online-shop-desktop.webp",
            "image_alt": "Beirit Backstube React/Django-Shop mit Torten und Kuchen",
            "technologies": "React, Vite, Django, Python, SQLite, HTML, CSS",
            "features": "\n".join(
                [
                    "Konditorei-Sortiment",
                    "React-Storefront",
                    "Django-Shop-App",
                    "Produkt- und Bestellmodelle",
                    "Admin-Verwaltung",
                    "Produkt-API",
                    "Bestell-API",
                    "Bestellanfragen im Backend",
                ]
            ),
            "category": "React- und Django-Webapp",
            "status": "demo",
            "status_label": "Portfolio-Projekt / Beirit Backstube",
            "live_url": "/static/portfolio/online-shop/index.html",
            "github_url": "",
            "featured": True,
            "published": True,
            "sort_order": 30,
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0038_update_sprachdienstleistungen_case_study"),
    ]

    operations = [
        migrations.RunPython(update_online_shop_cake_storefront, migrations.RunPython.noop),
    ]
