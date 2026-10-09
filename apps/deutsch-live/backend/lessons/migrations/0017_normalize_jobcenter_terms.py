from django.db import migrations


def normalize_jobcenter_terms(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Category.objects.filter(slug="jobcenter").update(
        title_de="Jobcenter und Agentur für Arbeit",
        title_ru="Jobcenter и Agentur für Arbeit",
        description_de=(
            "Alltagssprache fuer Termine beim Jobcenter und bei der Agentur fuer Arbeit: "
            "Antraege, Unterlagen, Rueckfragen und Arbeitssuche klar trennen."
        ),
        description_ru=(
            "Jobcenter обычно связан с Bürgergeld, заявлениями и документами. "
            "Agentur für Arbeit помогает с поиском работы, регистрацией безработицы и ALG I."
        ),
    )


def restore_jobcenter_terms(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Category.objects.filter(slug="jobcenter").update(
        title_de="Jobcenter",
        title_ru="Jobcenter",
        description_de="",
        description_ru="",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0016_seed_arzt_quiz"),
    ]

    operations = [
        migrations.RunPython(normalize_jobcenter_terms, restore_jobcenter_terms),
    ]
