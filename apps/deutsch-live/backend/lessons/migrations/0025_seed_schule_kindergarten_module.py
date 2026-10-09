from django.db import migrations


SCHULE_KINDERGARTEN_SCENES = [
    {
        "slug": "schule-kindergarten-krankmelden",
        "title": "Schule 1 - Kind krankmelden",
        "description_de": "Ein Kind in Schule oder Kindergarten krankmelden.",
        "description_ru": "Сообщить в школу или детский сад, что ребёнок болеет.",
        "lines": [
            ("Elternteil", "Guten Morgen. Mein Kind ist krank.", "Доброе утро. Мой ребёнок болеет.", "Kurzer sicherer Start."),
            ("Sekretariat", "Wie heisst Ihr Kind?", "Как зовут вашего ребёнка?", "Heissen — зваться."),
            ("Elternteil", "Mein Kind heisst Mila Petrov.", "Моего ребёнка зовут Мила Петров.", "Name langsam sagen."),
            ("Sekretariat", "In welche Klasse geht sie?", "В какой класс она ходит?", "Klasse — класс."),
            ("Elternteil", "Sie geht in die Klasse 1b.", "Она ходит в класс 1b.", "In die Klasse ... gehen."),
        ],
    },
    {
        "slug": "schule-kindergarten-elterngespraech",
        "title": "Schule 2 - Elterngespraech",
        "description_de": "Einen Termin fuer ein Elterngespraech vereinbaren.",
        "description_ru": "Договориться о встрече с учителем или воспитателем.",
        "lines": [
            ("Elternteil", "Ich moechte einen Termin fuer ein Elterngespraech.", "Я хочу термин для родительской встречи.", "Elterngespraech — разговор с родителями."),
            ("Lehrerin", "Passt Ihnen Mittwoch um 15 Uhr?", "Вам подходит среда в 15 часов?", "Passt Ihnen ...? — Вам подходит?"),
            ("Elternteil", "Ja, das passt. Vielen Dank.", "Да, подходит. Большое спасибо.", "Sehr kurze Zusage."),
            ("Lehrerin", "Bitte bringen Sie das Heft mit.", "Пожалуйста, принесите тетрадь.", "Mitbringen — принести с собой."),
            ("Elternteil", "Koennen Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Sicher nachfragen."),
        ],
    },
    {
        "slug": "schule-kindergarten-abholen",
        "title": "Schule 3 - Abholen",
        "description_de": "Abholen, Betreuung und kurze Mitteilungen verstehen.",
        "description_ru": "Забрать ребёнка, спросить о присмотре и понять короткое сообщение.",
        "lines": [
            ("Erzieher", "Heute endet die Betreuung um 14 Uhr.", "Сегодня присмотр заканчивается в 14 часов.", "Betreuung — присмотр."),
            ("Elternteil", "Ich hole mein Kind um 14 Uhr ab.", "Я заберу моего ребёнка в 14 часов.", "Abholen — забирать."),
            ("Erzieher", "Bitte geben Sie die Telefonnummer ab.", "Пожалуйста, передайте номер телефона.", "Abgeben — сдать/передать."),
            ("Elternteil", "Hier ist meine Telefonnummer.", "Вот мой номер телефона.", "Kurzer Satz mit Nummer."),
            ("Erzieher", "Morgen ist ein Ausflug.", "Завтра экскурсия.", "Ausflug — экскурсия."),
        ],
    },
]


SCHULE_KINDERGARTEN_VOCABULARY = [
    ("die Schule", "школа", "Mein Kind geht in die Schule.", "Allgemeines Wort."),
    ("der Kindergarten", "детский сад", "Mein Kind geht in den Kindergarten.", "Mit Artikel der."),
    ("die Lehrerin", "учительница", "Die Lehrerin ruft an.", "Schule."),
    ("der Erzieher", "воспитатель", "Der Erzieher spricht mit mir.", "Kindergarten."),
    ("das Kind", "ребёнок", "Mein Kind ist krank.", "Sehr wichtig."),
    ("krankmelden", "сообщить о болезни", "Ich moechte mein Kind krankmelden.", "Ein Wort fuer die Meldung."),
    ("fehlen", "отсутствовать", "Mein Kind fehlt heute.", "Wenn das Kind nicht kommt."),
    ("abholen", "забирать", "Ich hole mein Kind ab.", "Trennbares Verb."),
    ("bringen", "приводить / приносить", "Ich bringe mein Kind um 8 Uhr.", "Auch fuer Sachen."),
    ("das Elterngespraech", "родительская беседа", "Ich habe ein Elterngespraech.", "Wichtiger Termin."),
    ("die Entschuldigung", "объяснительная", "Ich schreibe eine Entschuldigung.", "Schule."),
    ("die Hausaufgabe", "домашнее задание", "Hat mein Kind Hausaufgaben?", "Oft im Heft."),
    ("der Ausflug", "экскурсия", "Morgen ist ein Ausflug.", "Kita und Schule."),
    ("die Brotdose", "ланчбокс", "Die Brotdose ist im Rucksack.", "Alltag im Kindergarten."),
    ("die Betreuung", "присмотр", "Die Betreuung endet um 14 Uhr.", "Nach Schule/Kita."),
    ("die Telefonnummer", "номер телефона", "Hier ist meine Telefonnummer.", "Kontakt."),
]


SCHULE_KINDERGARTEN_QUIZ = [
    ("Что значит „Mein Kind ist krank“?", ["Мой ребёнок болеет.", "Мой ребёнок в школе.", "Мой ребёнок ест хлеб."], "Krank bedeutet болен.", "schule-kindergarten-krankmelden"),
    ("Как сказать «Я заберу моего ребёнка»?", ["Ich hole mein Kind ab.", "Ich bezahle mit Karte.", "Ich suche Arbeit."], "Abholen ist ein trennbares Verb.", "schule-kindergarten-abholen"),
    ("Что означает „Elterngespräch“?", ["Родительская беседа", "Квитанция", "Тёплая аренда"], "Ein Elterngespraech ist ein Termin mit Lehrerin oder Erzieher.", "schule-kindergarten-elterngespraech"),
]


def seed_schule_kindergarten_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="schule-kindergarten",
        defaults={
            "title_de": "Schule und Kindergarten",
            "title_ru": "Школа и детский сад",
            "icon": "🎒",
            "description_de": "Krankmeldung, Elterngespraech, Abholen und Betreuung mit einfachen Saetzen.",
            "description_ru": "Болезнь ребёнка, родительская беседа, забрать ребёнка и присмотр простыми фразами.",
            "order": 8,
            "is_published": True,
        },
    )

    for scene_data in SCHULE_KINDERGARTEN_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "schule-kindergarten",
                "icon": "🎒",
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

    default_scene = Scene.objects.filter(slug="schule-kindergarten-krankmelden").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(SCHULE_KINDERGARTEN_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="schule-kindergarten").delete()
    for prompt_ru, options, explanation_ru, scene_slug in SCHULE_KINDERGARTEN_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="schule-kindergarten",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_schule_kindergarten_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in SCHULE_KINDERGARTEN_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="schule-kindergarten").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0024_seed_arbeit_module"),
    ]

    operations = [
        migrations.RunPython(seed_schule_kindergarten_module, unseed_schule_kindergarten_module),
    ]
