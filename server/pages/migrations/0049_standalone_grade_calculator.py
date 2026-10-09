from django.db import migrations


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="notenrechner").update(
        technologies="HTML, CSS, JavaScript",
        live_url="/static/portfolio/test-main/index.html",
        status="demo",
        status_label="Eigenständige Browser-Demo",
        published=True,
        description="Eigenständige Browser-Anwendung mit HTML, CSS und JavaScript zur Berechnung von Durchschnittsnoten mit schrittweiser Eingabe und Validierung.",
        implementation="HTML strukturiert das Formular, CSS gestaltet die responsive Oberfläche und JavaScript prüft Eingaben und berechnet die Durchschnittsnote. Die Anwendung läuft ohne Framework und ohne Backend direkt im Browser.",
        features="Formularvalidierung\nSchrittweise Eingabe\nDirektes Feedback\nResponsive Darstellung",
    )


class Migration(migrations.Migration):
    dependencies = [("pages", "0048_correct_project_technologies")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
