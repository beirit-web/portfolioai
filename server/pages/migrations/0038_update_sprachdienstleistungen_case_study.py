from django.db import migrations


def update_sprachdienstleistungen_case_study(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    project = Project.objects.filter(slug="sprachdienstleistungen").first()
    if not project:
        return

    project.title = "Webplattform für Sprachdienstleistungen"
    project.short_description = (
        "Mehrsprachige Webplattform zur professionellen Verwaltung von "
        "Sprachdienstleistungen - mit Nutzerbereich, Kontaktverwaltung und "
        "geschützten Bereichen."
    )
    project.description = project.short_description
    project.situation = (
        "Für einen Anbieter von Sprachdienstleistungen sollte eine zentrale "
        "digitale Plattform entstehen, die Informationen, Anfragen und interne "
        "Abläufe an einem Ort zusammenführt.\n\n"
        "Besonderer Fokus lag dabei auf einer mehrsprachigen Darstellung sowie "
        "klar getrennten öffentlichen und geschützten Bereichen."
    )
    project.implementation = (
        "Die Plattform wurde als individuelle Django-Webanwendung umgesetzt. "
        "Neben den öffentlichen Seiten wurden Benutzerkonten und persönliche "
        "Profilbereiche integriert."
    )
    project.result = (
        "Entstanden ist eine moderne und zentral organisierte Webplattform, die "
        "öffentliche Informationen mit individuellen Nutzerbereichen und "
        "internen Verwaltungsprozessen verbindet.\n\n"
        "Dadurch lassen sich Anfragen, Nutzer und relevante Abläufe strukturiert "
        "über eine gemeinsame Plattform verwalten."
    )
    project.category = "Webentwicklung"
    project.status = "live"
    project.status_label = "Live"
    project.image_alt = "Desktop"
    project.technologies = "Python, Django, JavaScript, HTML, CSS"
    project.features = "\n".join(
        [
            "Benutzerregistrierung und Login",
            "Persönlicher Profilbereich",
            "Bewerbungs- und Kontaktformulare",
            "Verwaltung eingehender Anfragen",
            "Geschützte Nutzerbereiche",
            "Mehrsprachige Inhalte und Lokalisierung",
            "Strukturierte Verwaltung über den internen Bereich",
        ]
    )
    project.live_url = ""
    project.github_url = ""
    project.save(
        update_fields=[
            "title",
            "short_description",
            "description",
            "situation",
            "implementation",
            "result",
            "category",
            "status",
            "status_label",
            "image_alt",
            "technologies",
            "features",
            "live_url",
            "github_url",
            "updated_at",
        ]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("pages", "0037_restore_home_featured_gallery_selection"),
    ]

    operations = [
        migrations.RunPython(update_sprachdienstleistungen_case_study, migrations.RunPython.noop),
    ]
