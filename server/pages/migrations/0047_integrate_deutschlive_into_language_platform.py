from django.db import migrations


MODULE_DESCRIPTION = (
    "DeutschLive ist als Lernbereich der Webplattform für Sprachdienstleistungen integriert: "
    "Dialoge, Übungen, Quiz und Lernfortschritt mit dem Plattformkonto. "
    "Der Audioplayer für eigene Aufnahmen speichert Dateien ausschließlich lokal im Browser; "
    "es findet kein Audio-Upload statt."
)
MODULE_FEATURE = "DeutschLive: Dialoge, Übungen, Quiz und Audioplayer für lokale Aufnahmen"


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="deutschlive").update(published=False, featured=False)
    platform = projects.filter(slug="sprachdienstleistungen").first()
    if not platform:
        return
    for field in ("description", "implementation", "result"):
        value = getattr(platform, field) or ""
        if "DeutschLive" not in value:
            setattr(platform, field, f"{value.rstrip()}\n\n{MODULE_DESCRIPTION}".strip())
    if "DeutschLive" not in platform.short_description:
        suffix = " Mit DeutschLive und lokalem Audioplayer."
        platform.short_description = platform.short_description[:500 - len(suffix)].rstrip() + suffix
    if "DeutschLive" not in platform.features:
        platform.features = f"{platform.features.rstrip()}\n{MODULE_FEATURE}".strip()
    platform.save(update_fields=["short_description", "description", "implementation", "result", "features", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("pages", "0046_integrate_music_player_into_deutschlive")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
