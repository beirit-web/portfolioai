from django.db import migrations


SUPERMARKT_SCENES = [
    {
        "slug": "supermarkt-produkte-finden",
        "title": "Supermarkt 1 - Produkte finden",
        "description_de": "Im Supermarkt nach Produkten und Regalen fragen.",
        "description_ru": "В супермаркете спросить, где находятся продукты и отделы.",
        "lines": [
            ("Kunde", "Entschuldigung, wo finde ich Milch?", "Извините, где я найду молоко?", "Wo finde ich ...? ist eine sichere Frage."),
            ("Mitarbeiterin", "Milch ist hinten links im Kuehlregal.", "Молоко сзади слева в холодильном отделе.", "Hinten links — сзади слева."),
            ("Kunde", "Danke. Und wo ist das Brot?", "Спасибо. А где хлеб?", "Und wo ist ...?"),
            ("Mitarbeiterin", "Das Brot ist vorne bei der Baeckerei.", "Хлеб впереди у пекарни.", "Vorne — впереди."),
            ("Kunde", "Vielen Dank fuer Ihre Hilfe.", "Большое спасибо за вашу помощь.", "Hoeflich abschliessen."),
        ],
    },
    {
        "slug": "supermarkt-kasse",
        "title": "Supermarkt 2 - An der Kasse",
        "description_de": "An der Kasse bezahlen, Tüte und Kassenbon klären.",
        "description_ru": "На кассе оплатить, спросить пакет и чек.",
        "lines": [
            ("Kassiererin", "Haben Sie eine Kundenkarte?", "У вас есть клиентская карта?", "Kundenkarte — карта магазина."),
            ("Kunde", "Nein, ich habe keine Kundenkarte.", "Нет, у меня нет клиентской карты.", "Keine + Akkusativ."),
            ("Kassiererin", "Brauchen Sie eine Tuete?", "Вам нужен пакет?", "Tuete — пакет."),
            ("Kunde", "Ja, eine Tuete bitte.", "Да, один пакет, пожалуйста.", "Kurzer Antwortsatz."),
            ("Kunde", "Mit Karte, bitte. Brauche ich den Kassenbon?", "Картой, пожалуйста. Нужен ли мне чек?", "Kassenbon — чек."),
        ],
    },
    {
        "slug": "supermarkt-reklamation",
        "title": "Supermarkt 3 - Problem mit einem Produkt",
        "description_de": "Ein Problem mit einem Produkt ruhig erklären.",
        "description_ru": "Спокойно объяснить проблему с продуктом.",
        "lines": [
            ("Kunde", "Entschuldigung, dieses Produkt ist kaputt.", "Извините, этот товар сломан.", "Kaputt — сломан."),
            ("Mitarbeiter", "Haben Sie den Kassenbon?", "У вас есть чек?", "Bei Reklamation oft wichtig."),
            ("Kunde", "Ja, hier ist der Kassenbon.", "Да, вот чек.", "Hier ist ..."),
            ("Mitarbeiter", "Moechten Sie das Produkt umtauschen?", "Вы хотите обменять товар?", "Umtauschen — обменять."),
            ("Kunde", "Ja, bitte. Kann ich es umtauschen?", "Да, пожалуйста. Могу я это обменять?", "Hoefliche Frage."),
        ],
    },
]


SUPERMARKT_VOCABULARY = [
    ("der Supermarkt", "супермаркет", "Ich gehe in den Supermarkt.", "Ort."),
    ("das Regal", "полка / стеллаж", "Das Brot ist im Regal.", "Im Regal."),
    ("das Kuehlregal", "холодильный отдел", "Milch ist im Kuehlregal.", "Kuehl + Regal."),
    ("die Kasse", "касса", "Ich gehe zur Kasse.", "Zur Kasse gehen."),
    ("die Kassiererin", "кассирша", "Die Kassiererin fragt nach der Kundenkarte.", "Person an der Kasse."),
    ("der Einkaufswagen", "тележка", "Ich brauche einen Einkaufswagen.", "Groesser als Korb."),
    ("der Korb", "корзина", "Ich nehme einen Korb.", "Kleiner Einkauf."),
    ("die Tuete", "пакет", "Eine Tuete bitte.", "An der Kasse."),
    ("der Kassenbon", "чек", "Hier ist der Kassenbon.", "Wichtig bei Rueckgabe."),
    ("die Kundenkarte", "клиентская карта", "Ich habe keine Kundenkarte.", "Viele Supermaerkte fragen."),
    ("das Angebot", "акция / предложение", "Gibt es ein Angebot?", "Preisaktion."),
    ("der Preis", "цена", "Was ist der Preis?", "Preisfrage."),
    ("finden", "найти", "Wo finde ich Milch?", "Sehr nuetzlich."),
    ("bezahlen", "платить", "Ich bezahle mit Karte.", "An der Kasse."),
    ("umtauschen", "обменять", "Kann ich das umtauschen?", "Bei Problem."),
    ("kaputt", "сломанный", "Das Produkt ist kaputt.", "Einfaches Wort fuer Problem."),
]


SUPERMARKT_QUIZ = [
    ("Как спросить: «Где я найду молоко?»", ["Wo finde ich Milch?", "Was kostet Milch?", "Ich bin Milch."], "Wo finde ich ...? ist die Standardfrage im Laden.", "supermarkt-produkte-finden"),
    ("Что значит „Kassenbon“?", ["Чек", "Пакет", "Корзина"], "Kassenbon ist der Beleg nach dem Bezahlen.", "supermarkt-kasse"),
    ("Как сказать: «Можно обменять товар?»", ["Kann ich das umtauschen?", "Kann ich das essen?", "Wo ist die Schule?"], "Umtauschen bedeutet обменять.", "supermarkt-reklamation"),
]


def seed_supermarkt_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="supermarkt",
        defaults={
            "title_de": "Supermarkt",
            "title_ru": "Супермаркет",
            "icon": "🛒",
            "description_de": "Produkte finden, an der Kasse bezahlen und Probleme ruhig klaeren.",
            "description_ru": "Найти продукты, оплатить на кассе и спокойно объяснить проблему.",
            "order": 9,
            "is_published": True,
        },
    )

    for scene_data in SUPERMARKT_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "supermarkt",
                "icon": "🛒",
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

    default_scene = Scene.objects.filter(slug="supermarkt-produkte-finden").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(SUPERMARKT_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="supermarkt").delete()
    for prompt_ru, options, explanation_ru, scene_slug in SUPERMARKT_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="supermarkt",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_supermarkt_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in SUPERMARKT_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="supermarkt").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0025_seed_schule_kindergarten_module"),
    ]

    operations = [
        migrations.RunPython(seed_supermarkt_module, unseed_supermarkt_module),
    ]
