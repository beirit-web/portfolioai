from django.db import migrations


ARBEIT_SCENES = [
    {
        "slug": "arbeit-bewerbung",
        "title": "Arbeit 1 - Bewerbung schicken",
        "description_de": "Eine Bewerbung schicken und nach Unterlagen fragen.",
        "description_ru": "Отправить заявку на работу и спросить о документах.",
        "lines": [
            ("Bewerber", "Guten Tag. Ich moechte mich bewerben.", "Добрый день. Я хочу подать заявку.", "Sich bewerben — подавать заявку."),
            ("Firma", "Fuer welche Stelle interessieren Sie sich?", "Какая вакансия вас интересует?", "Stelle — вакансия/должность."),
            ("Bewerber", "Ich interessiere mich fuer die Stelle als Verkäufer.", "Меня интересует вакансия продавца.", "Ich interessiere mich fuer ..."),
            ("Firma", "Bitte schicken Sie Ihren Lebenslauf.", "Пожалуйста, отправьте ваше резюме.", "Lebenslauf — резюме."),
            ("Bewerber", "Danke. Ich schicke den Lebenslauf heute.", "Спасибо. Я отправлю резюме сегодня.", "Schicken — отправить."),
        ],
    },
    {
        "slug": "arbeit-vorstellungsgespraech",
        "title": "Arbeit 2 - Vorstellungsgespraech",
        "description_de": "Im Vorstellungsgespraech einfache Antworten geben.",
        "description_ru": "На собеседовании давать простые ответы.",
        "lines": [
            ("Chef", "Erzaehlen Sie bitte kurz von sich.", "Расскажите, пожалуйста, коротко о себе.", "Типичный вопрос на собеседовании."),
            ("Bewerber", "Ich habe Erfahrung im Verkauf.", "У меня есть опыт в продажах.", "Ich habe Erfahrung in/im ..."),
            ("Chef", "Wann koennen Sie anfangen?", "Когда вы можете начать?", "Anfangen — начинать."),
            ("Bewerber", "Ich kann ab naechster Woche anfangen.", "Я могу начать со следующей недели.", "Ab naechster Woche — со следующей недели."),
            ("Chef", "Haben Sie noch Fragen?", "У вас есть вопросы?", "Всегда можно задать простой вопрос."),
        ],
    },
    {
        "slug": "arbeit-arbeitsalltag",
        "title": "Arbeit 3 - Arbeitsalltag",
        "description_de": "Am Arbeitsplatz nach Aufgaben und Pausen fragen.",
        "description_ru": "На работе спросить о задачах и перерывах.",
        "lines": [
            ("Mitarbeiter", "Was soll ich zuerst machen?", "Что мне сначала сделать?", "Sehr nuetzliche Frage am Arbeitsplatz."),
            ("Kollegin", "Bitte sortieren Sie zuerst die Waren.", "Пожалуйста, сначала разберите товары.", "Zuerst — сначала."),
            ("Mitarbeiter", "Wann ist die Pause?", "Когда перерыв?", "Pause — перерыв."),
            ("Kollegin", "Die Pause ist um 12 Uhr.", "Перерыв в 12 часов.", "Kurzer klarer Satz."),
            ("Mitarbeiter", "Danke. Koennen Sie das bitte noch einmal zeigen?", "Спасибо. Можете показать это ещё раз?", "Zeigen — показать."),
        ],
    },
]


ARBEIT_VOCABULARY = [
    ("die Arbeit", "работа", "Ich suche Arbeit.", "Общее слово."),
    ("die Stelle", "вакансия / должность", "Ich interessiere mich fuer die Stelle.", "Часто в объявлениях."),
    ("sich bewerben", "подавать заявку", "Ich moechte mich bewerben.", "Возвратный глагол."),
    ("die Bewerbung", "заявка", "Ich schicke meine Bewerbung.", "Пакет документов."),
    ("der Lebenslauf", "резюме", "Hier ist mein Lebenslauf.", "CV."),
    ("die Erfahrung", "опыт", "Ich habe Erfahrung im Verkauf.", "Полезно на собеседовании."),
    ("das Vorstellungsgespraech", "собеседование", "Ich habe ein Vorstellungsgespraech.", "Длинное, но важное слово."),
    ("anfangen", "начинать", "Ich kann morgen anfangen.", "Синоним starten."),
    ("die Arbeitszeit", "рабочее время", "Wie ist die Arbeitszeit?", "Вопрос о графике."),
    ("die Pause", "перерыв", "Wann ist die Pause?", "На работе важное слово."),
    ("die Aufgabe", "задача", "Was ist meine Aufgabe?", "Что нужно делать."),
    ("zuerst", "сначала", "Was soll ich zuerst machen?", "Для порядка действий."),
    ("zeigen", "показать", "Koennen Sie das bitte zeigen?", "Если не поняли действие."),
    ("der Kollege", "коллега", "Mein Kollege hilft mir.", "Мужской род."),
    ("die Kollegin", "коллега", "Meine Kollegin hilft mir.", "Женский род."),
    ("der Chef", "руководитель", "Der Chef spricht mit mir.", "Разговорное слово."),
]


ARBEIT_QUIZ = [
    ("Что значит „Ich möchte mich bewerben“?", ["Я хочу подать заявку.", "Я хочу оплатить.", "Я ищу квартиру."], "Sich bewerben — подавать заявку.", "arbeit-bewerbung"),
    ("Что означает „Lebenslauf“?", ["Резюме", "Перерыв", "Зарплата"], "Lebenslauf — резюме/CV.", "arbeit-bewerbung"),
    ("Как спросить: «Что мне сначала сделать?»", ["Was soll ich zuerst machen?", "Wie hoch ist die Warmmiete?", "Mit Karte, bitte."], "Zuerst — сначала.", "arbeit-arbeitsalltag"),
]


def seed_arbeit_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="arbeit",
        defaults={
            "title_de": "Arbeit",
            "title_ru": "Работа",
            "icon": "🤝",
            "description_de": "Bewerbung, Vorstellungsgespraech und Arbeitsalltag mit einfachen Saetzen.",
            "description_ru": "Заявка на работу, собеседование и рабочий день простыми фразами.",
            "order": 7,
            "is_published": True,
        },
    )

    for scene_data in ARBEIT_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "arbeit",
                "icon": "🤝",
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

    default_scene = Scene.objects.filter(slug="arbeit-bewerbung").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(ARBEIT_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="arbeit").delete()
    for prompt_ru, options, explanation_ru, scene_slug in ARBEIT_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="arbeit",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_arbeit_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in ARBEIT_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="arbeit").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0023_seed_telefonate_module"),
    ]

    operations = [
        migrations.RunPython(seed_arbeit_module, unseed_arbeit_module),
    ]
