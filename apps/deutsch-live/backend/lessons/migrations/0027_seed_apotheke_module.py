from django.db import migrations


APOTHEKE_SCENES = [
    {
        "slug": "apotheke-medikament-suchen",
        "title": "Apotheke 1 - Medikament suchen",
        "description_de": "In der Apotheke nach einem Medikament fragen.",
        "description_ru": "В аптеке спросить о лекарстве.",
        "lines": [
            ("Kunde", "Guten Tag. Ich suche etwas gegen Kopfschmerzen.", "Добрый день. Я ищу что-нибудь от головной боли.", "Etwas gegen ... ist eine sichere Formulierung."),
            ("Apothekerin", "Seit wann haben Sie Kopfschmerzen?", "С какого времени у вас головная боль?", "Seit wann?"),
            ("Kunde", "Seit gestern Abend.", "Со вчерашнего вечера.", "Kurze Zeitangabe."),
            ("Apothekerin", "Nehmen Sie andere Medikamente?", "Вы принимаете другие лекарства?", "Wichtige Sicherheitsfrage."),
            ("Kunde", "Nein, ich nehme keine anderen Medikamente.", "Нет, я не принимаю другие лекарства.", "Keine + Plural."),
        ],
    },
    {
        "slug": "apotheke-dosierung",
        "title": "Apotheke 2 - Dosierung verstehen",
        "description_de": "Dosierung, Einnahme und Nebenwirkungen verstehen.",
        "description_ru": "Понять дозировку, приём и побочные эффекты.",
        "lines": [
            ("Apotheker", "Nehmen Sie eine Tablette morgens und abends.", "Принимайте одну таблетку утром и вечером.", "Morgens und abends."),
            ("Kunde", "Vor dem Essen oder nach dem Essen?", "До еды или после еды?", "Sehr wichtige Frage."),
            ("Apotheker", "Nach dem Essen, bitte.", "После еды, пожалуйста.", "Nach dem Essen."),
            ("Kunde", "Gibt es Nebenwirkungen?", "Есть побочные эффекты?", "Nebenwirkungen — побочные эффекты."),
            ("Apotheker", "Bitte lesen Sie die Packungsbeilage.", "Пожалуйста, прочитайте инструкцию.", "Packungsbeilage — инструкция в упаковке."),
        ],
    },
    {
        "slug": "apotheke-rezept",
        "title": "Apotheke 3 - Rezept einloesen",
        "description_de": "Ein Rezept abgeben und ein Medikament abholen.",
        "description_ru": "Отдать рецепт и получить лекарство.",
        "lines": [
            ("Kunde", "Ich moechte ein Rezept einloesen.", "Я хочу использовать рецепт.", "Ein Rezept einloesen."),
            ("Apothekerin", "Haben Sie Ihre Gesundheitskarte dabei?", "У вас с собой медицинская карта?", "Gesundheitskarte."),
            ("Kunde", "Ja, hier ist meine Karte.", "Да, вот моя карта.", "Hier ist ..."),
            ("Apothekerin", "Das Medikament ist heute Nachmittag da.", "Лекарство будет сегодня после обеда.", "Heute Nachmittag."),
            ("Kunde", "Wann kann ich es abholen?", "Когда я могу его забрать?", "Abholen — забрать."),
        ],
    },
]


APOTHEKE_VOCABULARY = [
    ("die Apotheke", "аптека", "Ich gehe zur Apotheke.", "Ort."),
    ("das Medikament", "лекарство", "Ich suche ein Medikament.", "Allgemeines Wort."),
    ("die Tablette", "таблетка", "Nehmen Sie eine Tablette.", "Einzelne Tablette."),
    ("der Saft", "сироп", "Der Saft ist fuer Kinder.", "Medizin als Fluessigkeit."),
    ("die Salbe", "мазь", "Ich brauche eine Salbe.", "Fuer Haut."),
    ("das Rezept", "рецепт", "Ich habe ein Rezept.", "Vom Arzt."),
    ("einloesen", "использовать / сдать рецепт", "Ich moechte das Rezept einloesen.", "Mit Rezept."),
    ("die Gesundheitskarte", "медицинская карта", "Hier ist meine Gesundheitskarte.", "Versichertenkarte."),
    ("die Dosierung", "дозировка", "Wie ist die Dosierung?", "Wie viel und wie oft."),
    ("einnehmen", "принимать", "Wie soll ich das Medikament einnehmen?", "Medikamente einnehmen."),
    ("morgens", "по утрам", "Nehmen Sie es morgens.", "Zeitangabe."),
    ("abends", "по вечерам", "Nehmen Sie es abends.", "Zeitangabe."),
    ("vor dem Essen", "до еды", "Vor dem Essen oder nach dem Essen?", "Wichtige Frage."),
    ("nach dem Essen", "после еды", "Nehmen Sie es nach dem Essen.", "Wichtige Antwort."),
    ("die Nebenwirkung", "побочный эффект", "Gibt es Nebenwirkungen?", "Sicherheitsfrage."),
    ("die Packungsbeilage", "инструкция в упаковке", "Bitte lesen Sie die Packungsbeilage.", "Beipackzettel."),
]


APOTHEKE_QUIZ = [
    ("Как спросить: «Я ищу что-нибудь от головной боли»?", ["Ich suche etwas gegen Kopfschmerzen.", "Ich hole mein Kind ab.", "Ich bezahle die Miete."], "Etwas gegen ... nutzt man fuer Beschwerden.", "apotheke-medikament-suchen"),
    ("Что значит „nach dem Essen“?", ["После еды", "До еды", "Без рецепта"], "Nach dem Essen bedeutet после еды.", "apotheke-dosierung"),
    ("Что означает „Rezept einlösen“?", ["Сдать/использовать рецепт", "Перенести термин", "Обменять товар"], "In der Apotheke loest man ein Rezept ein.", "apotheke-rezept"),
]


def seed_apotheke_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="apotheke",
        defaults={
            "title_de": "Apotheke",
            "title_ru": "Аптека",
            "icon": "💊",
            "description_de": "Medikamente suchen, Dosierung verstehen und Rezepte einloesen.",
            "description_ru": "Найти лекарство, понять дозировку и получить лекарство по рецепту.",
            "order": 10,
            "is_published": True,
        },
    )

    for scene_data in APOTHEKE_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "apotheke",
                "icon": "💊",
                "description_de": scene_data["description_de"],
                "description_ru": scene_data["description_ru"],
                "level": "a1",
                "is_premium": False,
                "is_published": True,
            },
        )
        SceneLine.objects.filter(scene=scene).delete()
        for order, (speaker, text_de, text_ru, explanation) in enumerate(scene_data["lines"], start=1):
            SceneLine.objects.create(scene=scene, speaker=speaker, text_de=text_de, text_ru=text_ru, explanation=explanation, order=order)

    default_scene = Scene.objects.filter(slug="apotheke-medikament-suchen").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(APOTHEKE_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="apotheke").delete()
    for prompt_ru, options, explanation_ru, scene_slug in APOTHEKE_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="apotheke",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_apotheke_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in APOTHEKE_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="apotheke").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0026_seed_supermarkt_module"),
    ]

    operations = [
        migrations.RunPython(seed_apotheke_module, unseed_apotheke_module),
    ]
