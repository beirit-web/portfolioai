from django.db import migrations


# Update only the former sample descriptions; individually edited content stays intact.
CONTRACT_FIELDS = {
    "description": (
        "Statische Generator-Demo für mehrere Vertragsvorlagen ohne externe CDN-Abhängigkeit.",
        "Django-Demo für Vertragsentwürfe mit serverseitig geprüften Formularen, interaktiver Vorschau und TXT-Export.",
    ),
    "situation": (
        "Mehrere einzelne HTML-Vertragsseiten sollten zu einer zentralen Generator-Oberfläche zusammengeführt werden.",
        "Mehrere Vertragsvorlagen sollten über eine gemeinsame Oberfläche ausgefüllt, geprüft und als Entwurf ausgegeben werden.",
    ),
    "implementation": (
        "Umsetzung als HTML-, CSS- und JavaScript-App mit Vertragstypen, dynamischen Formularfeldern, Pflichtfeldprüfung und Export.",
        "Django-Formulare prüfen Pflichtfelder, Datums- und Geldwerte auf dem Server. JavaScript aktualisiert die Vorschau über einen CSRF-geschützten Endpunkt; Django-Templates erzeugen Vorschau und TXT-Download. Ohne JavaScript bleiben Formular und Download nutzbar.",
    ),
    "features": (
        "Dynamische Formulare\nVertragsvorlagen\nLive Preview\nText-Export\nPrint-Layout",
        "Django-Formulare\nServerseitige Validierung\nVertragsvorlagen\nInteraktive Vorschau\nTXT-Export\nDruck/PDF über den Browser",
    ),
}

OLD_PLATFORM_INTRO = (
    "Mehrsprachige Webplattform zur professionellen Verwaltung von "
    "Sprachdienstleistungen - mit Nutzerbereich, Kontaktverwaltung und "
    "geschützten Bereichen."
)
NEW_PLATFORM_INTRO = (
    "Technische Portfolio-Fallstudie einer mehrsprachigen Django-Plattform "
    "mit Nutzerkonten und geschützten Bereichen. Sprachdienstleistungen "
    "werden über die Demo nicht angeboten oder gebucht."
)


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    for field, (old, new) in CONTRACT_FIELDS.items():
        projects.filter(slug="vertragsgenerator", **{field: old}).update(**{field: new})
    projects.filter(slug="sprachdienstleistungen", status="live", status_label="Live").update(
        status="demo", status_label="Portfolio-Fallstudie",
    )
    projects.filter(slug="sprachdienstleistungen", title="Webplattform für Sprachdienstleistungen").update(
        title="Sprachplattform mit Lernmodulen",
    )
    platform = projects.filter(slug="sprachdienstleistungen").first()
    if not platform:
        return
    updated = []
    for field in ("short_description", "description"):
        current = getattr(platform, field)
        if current.startswith(OLD_PLATFORM_INTRO):
            setattr(platform, field, NEW_PLATFORM_INTRO + current[len(OLD_PLATFORM_INTRO):])
            updated.append(field)
    if updated:
        platform.save(update_fields=updated + ["updated_at"])


class Migration(migrations.Migration):
    dependencies = [("pages", "0049_standalone_grade_calculator")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
