from django.db import migrations


MODULE_DESCRIPTION = (
    "Die integrierte Vokabelbox bietet Wortsuche, Artikelfilter, Favoriten, "
    "Gelernt-Markierungen und ein Artikel-Quiz. Lernstand und Favoriten "
    "werden im jeweiligen Browser gespeichert."
)
MODULE_FEATURE = "Vokabelbox: Wortsuche, Artikelfilter, Favoriten und Artikel-Quiz"


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    # Keep the previous record for editing/history; it is no longer a standalone project.
    projects.filter(slug="vokabelbox").update(published=False, featured=False)
    platform = projects.filter(slug="sprachdienstleistungen").first()
    if not platform:
        return
    for field in ("description", "implementation", "result"):
        value = getattr(platform, field) or ""
        if "Vokabelbox" not in value:
            setattr(platform, field, f"{value.rstrip()}\n\n{MODULE_DESCRIPTION}".strip())
    if "Vokabelbox" not in platform.short_description:
        suffix = " Mit integriertem Vokabelbox-Lernmodul."
        platform.short_description = platform.short_description[:500 - len(suffix)].rstrip() + suffix
    if "Vokabelbox" not in platform.features:
        platform.features = f"{platform.features.rstrip()}\n{MODULE_FEATURE}".strip()
    platform.save(update_fields=["short_description", "description", "implementation", "result", "features", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("pages", "0043_shop_preview_image")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
