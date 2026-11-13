from django.db import migrations


MODULE_DESCRIPTION = (
    "Das integrierte Wettermodul bietet Ortssuche, aktuelle Wetterdaten, Regenfenster, "
    "Sonnenzeiten, einen 24-Stunden-Verlauf und eine 5-Tage-Vorhersage mit Open-Meteo. "
    "Zuletzt gesuchte Orte und Wetterdaten bleiben im jeweiligen Browser gespeichert."
)
MODULE_FEATURE = "Wettermodul: Ortssuche, Regenfenster, Sonnenzeiten und Vorhersage"


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    projects.filter(slug="wetter").update(published=False, featured=False)
    botanic = projects.filter(slug="enbt-botanic").first()
    if not botanic:
        return
    for field in ("description", "implementation", "result"):
        value = getattr(botanic, field) or ""
        if "Wettermodul" not in value:
            setattr(botanic, field, f"{value.rstrip()}\n\n{MODULE_DESCRIPTION}".strip())
    if "Wetter" not in botanic.short_description:
        suffix = " Mit integriertem Wettermodul und Vorhersage."
        botanic.short_description = botanic.short_description[:500 - len(suffix)].rstrip() + suffix
    if "Wettermodul" not in botanic.features:
        botanic.features = f"{botanic.features.rstrip()}\n{MODULE_FEATURE}".strip()
    botanic.save(update_fields=["short_description", "description", "implementation", "result", "features", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("pages", "0044_integrate_vokabelbox_into_language_platform")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
