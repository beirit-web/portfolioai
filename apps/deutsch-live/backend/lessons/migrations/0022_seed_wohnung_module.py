from django.db import migrations


WOHNUNG_SCENES = [
    {
        "slug": "wohnung-besichtigung",
        "title": "Wohnung 1 - Besichtigung",
        "description_de": "Bei einer Besichtigung ankommen und einfache Fragen stellen.",
        "description_ru": "Прийти на просмотр квартиры и задать простые вопросы.",
        "lines": [
            ("Interessent", "Guten Tag. Ich habe einen Termin zur Besichtigung.", "Добрый день. У меня термин на просмотр.", "Besichtigung — просмотр квартиры."),
            ("Vermieterin", "Guten Tag. Kommen Sie bitte herein.", "Добрый день. Пожалуйста, заходите.", "Herein — внутрь."),
            ("Interessent", "Wie hoch ist die Warmmiete?", "Сколько стоит тёплая аренда?", "Warmmiete включает Nebenkosten."),
            ("Vermieterin", "Die Warmmiete ist 850 Euro.", "Тёплая аренда 850 евро.", "Так часто называют общую месячную сумму."),
            ("Interessent", "Ab wann ist die Wohnung frei?", "С какого времени квартира свободна?", "Ab wann? — с какого момента?"),
        ],
    },
    {
        "slug": "wohnung-unterlagen",
        "title": "Wohnung 2 - Unterlagen schicken",
        "description_de": "Nach benoetigten Unterlagen fragen und eine Bewerbung schicken.",
        "description_ru": "Спросить о нужных документах и отправить заявку.",
        "lines": [
            ("Interessent", "Welche Unterlagen brauchen Sie?", "Какие документы вам нужны?", "Unterlagen — документы к заявке."),
            ("Vermieter", "Wir brauchen Gehaltsnachweise und eine Schufa-Auskunft.", "Нам нужны справки о доходах и справка Schufa.", "Schufa-Auskunft — кредитная справка в Германии."),
            ("Interessent", "Kann ich die Unterlagen per E-Mail schicken?", "Могу я отправить документы по E-Mail?", "Per E-Mail schicken — отправить по электронной почте."),
            ("Vermieter", "Ja, bitte schicken Sie alles bis morgen.", "Да, пожалуйста, отправьте всё до завтра.", "Bis morgen — до завтра."),
            ("Interessent", "Danke. Ich schicke die Bewerbung heute.", "Спасибо. Я отправлю заявку сегодня.", "Bewerbung — заявка на квартиру."),
        ],
    },
    {
        "slug": "wohnung-reparatur",
        "title": "Wohnung 3 - Reparatur melden",
        "description_de": "Ein Problem in der Wohnung melden und einen Termin vereinbaren.",
        "description_ru": "Сообщить о проблеме в квартире и договориться о термине.",
        "lines": [
            ("Mieter", "Guten Tag. Die Heizung funktioniert nicht.", "Добрый день. Отопление не работает.", "Funktioniert nicht — не работает."),
            ("Hausverwaltung", "Seit wann gibt es das Problem?", "С какого времени есть проблема?", "Seit wann? — с какого времени?"),
            ("Mieter", "Seit gestern Abend.", "С вчерашнего вечера.", "Короткий ответ достаточен."),
            ("Hausverwaltung", "Ein Handwerker kann morgen kommen.", "Мастер может прийти завтра.", "Handwerker — мастер."),
            ("Mieter", "Passt es um 10 Uhr?", "Подойдёт в 10 часов?", "Passt es ...? — подходит ли ...?"),
        ],
    },
]


WOHNUNG_VOCABULARY = [
    ("die Wohnung", "квартира", "Die Wohnung ist frei.", "Основное слово для жилья."),
    ("die Besichtigung", "просмотр квартиры", "Ich habe einen Termin zur Besichtigung.", "Термин для просмотра."),
    ("die Warmmiete", "аренда с коммунальными расходами", "Wie hoch ist die Warmmiete?", "Warmmiete обычно важнее Kaltmiete."),
    ("die Kaltmiete", "аренда без коммунальных расходов", "Die Kaltmiete ist 700 Euro.", "Без Nebenkosten."),
    ("die Nebenkosten", "коммунальные/дополнительные расходы", "Sind die Nebenkosten enthalten?", "Часто часть Warmmiete."),
    ("die Kaution", "залог", "Wie hoch ist die Kaution?", "Обычно платится перед въездом."),
    ("der Mietvertrag", "договор аренды", "Wann bekomme ich den Mietvertrag?", "Важный документ."),
    ("die Unterlagen", "документы", "Welche Unterlagen brauchen Sie?", "Документы для заявки."),
    ("die Schufa-Auskunft", "справка Schufa", "Ich brauche eine Schufa-Auskunft.", "Кредитная справка."),
    ("der Gehaltsnachweis", "справка о доходах", "Hier ist mein Gehaltsnachweis.", "Документ о зарплате."),
    ("die Bewerbung", "заявка", "Ich schicke die Bewerbung heute.", "Заявка на квартиру."),
    ("frei", "свободный", "Ab wann ist die Wohnung frei?", "Когда можно въехать."),
    ("einziehen", "въехать", "Ich kann ab Mai einziehen.", "Переезд в квартиру."),
    ("die Heizung", "отопление", "Die Heizung funktioniert nicht.", "Частая проблема зимой."),
    ("der Handwerker", "мастер", "Ein Handwerker kommt morgen.", "Человек для ремонта."),
    ("die Hausverwaltung", "управляющая компания", "Ich rufe die Hausverwaltung an.", "Контакт при проблемах."),
]


WOHNUNG_QUIZ = [
    ("Что значит „Warmmiete“?", ["Аренда с коммунальными расходами.", "Залог.", "Просмотр квартиры."], "Warmmiete включает Nebenkosten.", "wohnung-besichtigung"),
    ("Как спросить: «Какие документы вам нужны?»", ["Welche Unterlagen brauchen Sie?", "Wo tut es weh?", "Mit Karte, bitte."], "Unterlagen — документы.", "wohnung-unterlagen"),
    ("Что означает „Die Heizung funktioniert nicht“?", ["Отопление не работает.", "Квартира свободна.", "Я отправлю заявку."], "Funktioniert nicht — не работает.", "wohnung-reparatur"),
]


def seed_wohnung_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="wohnung",
        defaults={
            "title_de": "Wohnung",
            "title_ru": "Квартира",
            "icon": "🏠",
            "description_de": "Besichtigung, Unterlagen, Mietvertrag und Reparaturen einfach besprechen.",
            "description_ru": "Просмотр квартиры, документы, договор аренды и ремонт простыми фразами.",
            "order": 5,
            "is_published": True,
        },
    )

    for scene_data in WOHNUNG_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "wohnung",
                "icon": "🏠",
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

    default_scene = Scene.objects.filter(slug="wohnung-besichtigung").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(WOHNUNG_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="wohnung").delete()
    for prompt_ru, options, explanation_ru, scene_slug in WOHNUNG_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="wohnung",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_wohnung_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in WOHNUNG_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="wohnung").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0021_subscription_pending_status"),
    ]

    operations = [
        migrations.RunPython(seed_wohnung_module, unseed_wohnung_module),
    ]
