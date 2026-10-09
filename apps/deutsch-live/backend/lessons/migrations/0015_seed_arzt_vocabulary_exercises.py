from django.db import migrations


ARZT_VOCABULARY = [
    ("der Arzttermin", "приём у врача", "Ich habe einen Arzttermin."),
    ("die Praxis", "врачебная практика/кабинет", "Ich bin in der Praxis."),
    ("die Rezeption", "регистратура", "Ich melde mich an der Rezeption."),
    ("die Gesundheitskarte", "медицинская карта", "Hier ist meine Gesundheitskarte."),
    ("das Wartezimmer", "зал ожидания", "Ich warte im Wartezimmer."),
    ("die Beschwerden", "жалобы", "Ich habe Beschwerden."),
    ("die Schmerzen", "боли", "Ich habe Schmerzen."),
    ("der Kopfschmerz", "головная боль", "Ich habe Kopfschmerzen."),
    ("der Husten", "кашель", "Ich habe Husten."),
    ("das Fieber", "температура", "Ich habe kein Fieber."),
    ("der Bauch", "живот", "Der Schmerz ist im Bauch."),
    ("der Rücken", "спина", "Mein Rücken tut weh."),
    ("seit", "с/уже", "Seit drei Tagen."),
    ("akut", "острый/срочный", "Es ist nicht akut."),
    ("leicht", "слабый", "Der Schmerz ist leicht."),
    ("mittel", "средний", "Der Schmerz ist mittel."),
    ("stark", "сильный", "Der Schmerz ist stark."),
    ("manchmal", "иногда", "Nur manchmal."),
    ("das Rezept", "рецепт", "Ich bekomme ein Rezept."),
    ("die Apotheke", "аптека", "Ich gehe zur Apotheke."),
    ("das Medikament", "лекарство", "Ich nehme das Medikament."),
    ("wiederholen", "повторить", "Können Sie das bitte wiederholen?"),
]


def seed_arzt_vocabulary(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    Vocabulary = apps.get_model("lessons", "Vocabulary")

    category = Category.objects.filter(slug="arzt").first()
    if category is None:
        return
    default_scene = Scene.objects.filter(slug="arzt-symptome-beschreiben").first()

    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de) in enumerate(ARZT_VOCABULARY, start=1):
        Vocabulary.objects.create(
            category=category,
            scene=default_scene,
            word_de=word_de,
            translation_ru=translation_ru,
            example_de=example_de,
            order=order,
            is_published=True,
        )


def unseed_arzt_vocabulary(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    category = Category.objects.filter(slug="arzt").first()
    if category:
        Vocabulary.objects.filter(category=category, word_de__in=[item[0] for item in ARZT_VOCABULARY]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0014_seed_arzt_scenes"),
    ]

    operations = [
        migrations.RunPython(seed_arzt_vocabulary, unseed_arzt_vocabulary),
    ]
