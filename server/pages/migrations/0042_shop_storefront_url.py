from django.db import migrations

OLD_URL = "/static/portfolio/online-shop/index.html"
NEW_URL = "/shop/"


def forwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    projects = Project.objects.using(schema_editor.connection.alias).filter(slug="online-shop", live_url=OLD_URL)
    projects.update(live_url=NEW_URL)
    Project.objects.using(schema_editor.connection.alias).filter(
        slug="online-shop", live_url=NEW_URL,
        description="React- und Django-Webapp für einen ausbaufähigen Konditorei-Onlineshop mit Produktverwaltung, Warenkorb und Bestellanfragen.",
    ).update(
        short_description="Django-Shop für Torten und Kuchen mit Session-Warenkorb, Wunschdatum und gespeicherten Bestellanfragen.",
        description="Beirit Backstube ist eine Django-Anwendung mit Produktverwaltung, mobile-first Storefront, Session-Warenkorb und serverseitig geprüften Bestellanfragen.",
        implementation="Django-Templates, Produkt- und Bestellmodelle, sichere Session-Warenkörbe, gemeinsame HTML-/API-Validierung und Admin-Verwaltung.",
        technologies="Django, Python, SQLite, HTML, CSS, JavaScript",
        features="Konditorei-Sortiment\nDjango-Storefront\nSession-Warenkorb\nGespeicherte Bestellanfragen\nPrivate Anfragehistorie\nAdmin-Verwaltung",
        category="Django-Webanwendung",
    )


def backwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.using(schema_editor.connection.alias).filter(slug="online-shop", live_url=NEW_URL).update(live_url=OLD_URL)


class Migration(migrations.Migration):
    dependencies = [("pages", "0041_botanic_url")]
    operations = [migrations.RunPython(forwards, backwards)]
