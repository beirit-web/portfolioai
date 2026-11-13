from django.db import migrations


MODULE_DESCRIPTION = (
    "Der integrierte Audioplayer unter /deutschlive/recordings ermöglicht das Hinzufügen, "
    "Abspielen und Herunterladen eigener Aufnahmen. Die Audiodateien bleiben lokal im "
    "Browser auf dem Gerät des Nutzers und werden nicht auf den Server hochgeladen. "
    "Die lokale Sammlung ist je Nutzerkonto beziehungsweise Gastmodus getrennt."
)
MODULE_FEATURE = "Audioplayer: eigene Aufnahmen lokal speichern, abspielen und herunterladen"


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="musikplayer").update(published=False, featured=False)
    deutschlive = projects.filter(slug="deutschlive").first()
    if not deutschlive:
        return
    for field in ("description", "implementation", "result"):
        value = getattr(deutschlive, field) or ""
        if "Audioplayer" not in value:
            setattr(deutschlive, field, f"{value.rstrip()}\n\n{MODULE_DESCRIPTION}".strip())
    if "Aufnahmen" not in deutschlive.short_description:
        suffix = " Mit Audioplayer für lokal gespeicherte Aufnahmen."
        deutschlive.short_description = deutschlive.short_description[:500 - len(suffix)].rstrip() + suffix
    if "Audioplayer" not in deutschlive.features:
        deutschlive.features = f"{deutschlive.features.rstrip()}\n{MODULE_FEATURE}".strip()
    deutschlive.save(update_fields=["short_description", "description", "implementation", "result", "features", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("pages", "0045_integrate_weather_into_botanic")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
