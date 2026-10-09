from django.db import migrations


OEPNV_SCENES = [
    {
        "slug": "oeffentlicher-verkehr-ticket-kaufen",
        "title": "OePNV 1 - Ticket kaufen",
        "description_de": "Ein Ticket fuer Bus oder Bahn kaufen und den Preis klaeren.",
        "description_ru": "Купить билет на автобус или поезд и уточнить цену.",
        "lines": [
            ("Fahrgast", "Guten Tag. Ich brauche ein Ticket nach Helmstedt.", "Добрый день. Мне нужен билет до Helmstedt.", "Ticket nach ..."),
            ("Mitarbeiter", "Einfach oder hin und zurueck?", "В одну сторону или туда и обратно?", "Einfach — в одну сторону."),
            ("Fahrgast", "Einfach, bitte. Was kostet das?", "В одну сторону, пожалуйста. Сколько это стоит?", "Preisfrage."),
            ("Mitarbeiter", "Das kostet 4 Euro 80.", "Это стоит 4 евро 80.", "Preis verstehen."),
            ("Fahrgast", "Kann ich mit Karte bezahlen?", "Можно оплатить картой?", "Zahlungsfrage."),
        ],
    },
    {
        "slug": "oeffentlicher-verkehr-richtung",
        "title": "OePNV 2 - Richtung und Haltestelle",
        "description_de": "Nach Richtung, Haltestelle und Ausstieg fragen.",
        "description_ru": "Спросить направление, остановку и где выйти.",
        "lines": [
            ("Fahrgast", "Faehrt dieser Bus zum Bahnhof?", "Этот автобус едет к вокзалу?", "Faehrt dieser Bus ...?"),
            ("Fahrer", "Ja, steigen Sie an der dritten Haltestelle aus.", "Да, выйдите на третьей остановке.", "Aussteigen."),
            ("Fahrgast", "Wie heisst die Haltestelle?", "Как называется остановка?", "Haltestelle."),
            ("Fahrer", "Die Haltestelle heisst Bahnhof.", "Остановка называется Bahnhof.", "Name der Haltestelle."),
            ("Fahrgast", "Danke. Sagen Sie mir bitte Bescheid?", "Спасибо. Скажите мне, пожалуйста?", "Bitte um Hinweis."),
        ],
    },
    {
        "slug": "oeffentlicher-verkehr-verspaetung",
        "title": "OePNV 3 - Verspaetung und Umstieg",
        "description_de": "Verspaetung verstehen und nach dem Umstieg fragen.",
        "description_ru": "Понять задержку и спросить о пересадке.",
        "lines": [
            ("Fahrgast", "Hat der Zug Verspaetung?", "Поезд опаздывает?", "Verspaetung."),
            ("Mitarbeiterin", "Ja, der Zug hat zehn Minuten Verspaetung.", "Да, поезд опаздывает на десять минут.", "Minutenangabe."),
            ("Fahrgast", "Muss ich umsteigen?", "Мне нужно пересаживаться?", "Umsteigen."),
            ("Mitarbeiterin", "Ja, bitte steigen Sie in Braunschweig um.", "Да, пожалуйста, пересядьте в Braunschweig.", "In ... umsteigen."),
            ("Fahrgast", "Auf welchem Gleis faehrt der Zug?", "С какого пути отправляется поезд?", "Gleis — путь."),
        ],
    },
]


OEPNV_VOCABULARY = [
    ("der Bus", "автобус", "Der Bus kommt um 8 Uhr.", "Bus."),
    ("die Bahn", "поезд / транспорт", "Ich fahre mit der Bahn.", "Bahn."),
    ("der Zug", "поезд", "Der Zug hat Verspaetung.", "Zug."),
    ("das Ticket", "билет", "Ich brauche ein Ticket.", "Fahrkarte."),
    ("die Fahrkarte", "билет", "Ich kaufe eine Fahrkarte.", "Anderes Wort fuer Ticket."),
    ("einfach", "в одну сторону", "Einfach, bitte.", "Ticketart."),
    ("hin und zurueck", "туда и обратно", "Ein Ticket hin und zurueck.", "Ticketart."),
    ("die Haltestelle", "остановка", "Wie heisst die Haltestelle?", "Bus und Tram."),
    ("der Bahnhof", "вокзал", "Ich fahre zum Bahnhof.", "Zug."),
    ("das Gleis", "путь / платформа", "Auf welchem Gleis?", "Am Bahnhof."),
    ("die Richtung", "направление", "Welche Richtung ist richtig?", "Orientierung."),
    ("einsteigen", "садиться", "Ich steige in den Bus ein.", "Trennbares Verb."),
    ("aussteigen", "выходить", "Ich steige an der Haltestelle aus.", "Trennbares Verb."),
    ("umsteigen", "пересаживаться", "Muss ich umsteigen?", "Trennbares Verb."),
    ("die Verspaetung", "задержка / опоздание", "Der Zug hat Verspaetung.", "Delay."),
    ("Bescheid sagen", "сообщить", "Sagen Sie mir bitte Bescheid.", "Bitte um Hinweis."),
]


OEPNV_QUIZ = [
    ("Как сказать: «Мне нужен билет до Helmstedt»?", ["Ich brauche ein Ticket nach Helmstedt.", "Ich brauche eine Salbe.", "Ich habe einen Termin im Buergeramt."], "Ticket nach ... ist fuer ein Ziel.", "oeffentlicher-verkehr-ticket-kaufen"),
    ("Что значит „Muss ich umsteigen?“", ["Мне нужно пересаживаться?", "Мне нужно платить?", "Мне нужно подписать?"], "Umsteigen bedeutet пересаживаться.", "oeffentlicher-verkehr-verspaetung"),
    ("Что означает „Haltestelle“?", ["Остановка", "Чек", "Рецепт"], "Haltestelle ist die Bus- oder Tram-Station.", "oeffentlicher-verkehr-richtung"),
]


def seed_oeffentlicher_verkehr_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="oeffentlicher-verkehr",
        defaults={
            "title_de": "Oeffentlicher Verkehr",
            "title_ru": "Общественный транспорт",
            "icon": "🚌",
            "description_de": "Tickets, Richtung, Haltestellen, Umstieg und Verspaetung in Bus und Bahn.",
            "description_ru": "Билеты, направление, остановки, пересадка и задержки в автобусе и поезде.",
            "order": 12,
            "is_published": True,
        },
    )

    for scene_data in OEPNV_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "oeffentlicher-verkehr",
                "icon": "🚌",
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

    default_scene = Scene.objects.filter(slug="oeffentlicher-verkehr-ticket-kaufen").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(OEPNV_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="oeffentlicher-verkehr").delete()
    for prompt_ru, options, explanation_ru, scene_slug in OEPNV_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="oeffentlicher-verkehr",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_oeffentlicher_verkehr_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in OEPNV_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="oeffentlicher-verkehr").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0028_seed_behoerden_module"),
    ]

    operations = [
        migrations.RunPython(seed_oeffentlicher_verkehr_module, unseed_oeffentlicher_verkehr_module),
    ]
