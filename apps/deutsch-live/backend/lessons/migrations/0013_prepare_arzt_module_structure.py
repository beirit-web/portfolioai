from django.db import migrations


ARZT_DESCRIPTION_DE = (
    "Arzttermin, Anmeldung, Symptome beschreiben, Schmerzen einordnen und ruhig nachfragen."
)
ARZT_DESCRIPTION_RU = (
    "Модуль для визита к врачу: записаться, зарегистрироваться на приёме, описать симптомы, "
    "объяснить боль и спокойно переспросить."
)


def prepare_arzt_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Category.objects.update_or_create(
        slug="arzt",
        defaults={
            "title_de": "Arztbesuch",
            "title_ru": "Врач",
            "icon": "🩺",
            "description_de": ARZT_DESCRIPTION_DE,
            "description_ru": ARZT_DESCRIPTION_RU,
            "order": 2,
            "is_published": True,
        },
    )


def revert_arzt_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Category.objects.filter(slug="arzt").update(
        title_de="Arzt",
        title_ru="Врач",
        icon="🩺",
        description_de="",
        description_ru="",
        order=2,
        is_published=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0012_plan_webhookevent_subscription"),
    ]

    operations = [
        migrations.RunPython(prepare_arzt_module, revert_arzt_module),
    ]
