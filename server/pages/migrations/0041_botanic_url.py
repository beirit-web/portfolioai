from django.db import migrations

OLD_URL = "/static/portfolio/enbt-botanic/index.html"
NEW_URL = "/botanic/"


def forwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    projects = Project.objects.using(schema_editor.connection.alias).filter(slug="enbt-botanic", live_url=OLD_URL)
    projects.update(live_url=NEW_URL)
    Project.objects.using(schema_editor.connection.alias).filter(
        slug="enbt-botanic", live_url=NEW_URL,
        description="Statische React/Vite-App für Pflanzensuche ohne externe API-Abhängigkeit.",
    ).update(
        short_description="Django-App mit öffentlicher Pflanzensuche, persönlicher Sammlung und individuellem Gießplan.",
        description="ENBT Botanic verbindet die kostenlose iNaturalist-Pflanzensuche mit benutzergetrennten Sammlungen, Standorten, Notizen und Gießprotokollen.",
        technologies="Django, Python, SQLite, iNaturalist API, JavaScript",
        features="Pflanzensuche\nPersönliche Sammlung\nIndividuelle Gießtermine\nGießprotokoll\nMobile-first-Oberfläche",
    )


def backwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.using(schema_editor.connection.alias).filter(slug="enbt-botanic", live_url=NEW_URL).update(live_url=OLD_URL)


class Migration(migrations.Migration):
    dependencies = [("pages", "0040_contract_generator_url")]
    operations = [migrations.RunPython(forwards, backwards)]
