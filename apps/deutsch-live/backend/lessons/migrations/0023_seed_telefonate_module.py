from django.db import migrations


TELEFONATE_SCENES = [
    {
        "slug": "telefonate-anrufen",
        "title": "Telefonate 1 - Anrufen",
        "description_de": "Am Telefon starten, Namen nennen und den Grund kurz sagen.",
        "description_ru": "Начать телефонный разговор, назвать имя и коротко сказать причину.",
        "lines": [
            ("Anrufer", "Guten Tag. Mein Name ist Ivan Petrov.", "Добрый день. Меня зовут Иван Петров.", "Am Telefon zuerst ruhig den Namen sagen."),
            ("Praxis", "Guten Tag. Wie kann ich Ihnen helfen?", "Добрый день. Чем я могу вам помочь?", "Стандартный вопрос в начале."),
            ("Anrufer", "Ich rufe wegen eines Termins an.", "Я звоню по поводу термина.", "Ich rufe wegen ... an — полезная телефонная фраза."),
            ("Praxis", "Einen Moment bitte.", "Одну минуту, пожалуйста.", "Einen Moment — немного подождать."),
            ("Anrufer", "Danke, ich warte.", "Спасибо, я подожду.", "Короткий спокойный ответ."),
        ],
    },
    {
        "slug": "telefonate-termin-verschieben",
        "title": "Telefonate 2 - Termin verschieben",
        "description_de": "Einen Termin absagen oder verschieben und einen neuen Termin erfragen.",
        "description_ru": "Отменить или перенести термин и спросить новый.",
        "lines": [
            ("Anrufer", "Ich kann heute leider nicht kommen.", "К сожалению, я не могу прийти сегодня.", "Leider macht die Absage höflicher."),
            ("Mitarbeiterin", "Moechten Sie den Termin verschieben?", "Вы хотите перенести термин?", "Verschieben — перенести."),
            ("Anrufer", "Ja, bitte. Haben Sie naechste Woche einen Termin frei?", "Да, пожалуйста. У вас есть свободный термин на следующей неделе?", "Termin frei — свободное время."),
            ("Mitarbeiterin", "Am Dienstag um 10 Uhr ist etwas frei.", "Во вторник в 10 часов есть свободное время.", "So wird ein neuer Termin angeboten."),
            ("Anrufer", "Das passt. Vielen Dank.", "Мне подходит. Большое спасибо.", "Das passt — подходит."),
        ],
    },
    {
        "slug": "telefonate-nachricht-hinterlassen",
        "title": "Telefonate 3 - Nachricht hinterlassen",
        "description_de": "Nicht verstanden werden, Telefonnummer nennen und um Rueckruf bitten.",
        "description_ru": "Если вас не поняли: назвать номер телефона и попросить перезвонить.",
        "lines": [
            ("Anrufer", "Koennen Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Sichere Frage, wenn es zu schnell ist."),
            ("Büro", "Bitte nennen Sie Ihre Telefonnummer.", "Пожалуйста, назовите ваш номер телефона.", "Telefonnummer — номер телефона."),
            ("Anrufer", "Meine Telefonnummer ist 0176 123456.", "Мой номер телефона 0176 123456.", "Meine Telefonnummer ist ..."),
            ("Büro", "Wir rufen Sie zurueck.", "Мы вам перезвоним.", "Zurueckrufen — перезвонить."),
            ("Anrufer", "Danke. Wann ungefaehr?", "Спасибо. Примерно когда?", "Ungefähr — примерно."),
        ],
    },
]


TELEFONATE_VOCABULARY = [
    ("anrufen", "звонить", "Ich rufe wegen eines Termins an.", "Глагол разделяется: ich rufe ... an."),
    ("der Anruf", "звонок", "Danke fuer Ihren Anruf.", "Существительное к anrufen."),
    ("das Telefonat", "телефонный разговор", "Das Telefonat war kurz.", "Общее слово для разговора."),
    ("die Telefonnummer", "номер телефона", "Meine Telefonnummer ist ...", "Называйте цифры медленно."),
    ("zurueckrufen", "перезвонить", "Wir rufen Sie zurueck.", "Разделяемый глагол."),
    ("verbinden", "соединить", "Ich verbinde Sie.", "Так говорят, когда переводят звонок."),
    ("warten", "ждать", "Ich warte.", "Короткий ответ."),
    ("wiederholen", "повторить", "Koennen Sie das bitte wiederholen?", "Безопасная фраза при непонимании."),
    ("langsam", "медленно", "Bitte sprechen Sie langsam.", "Очень важно по телефону."),
    ("der Termin", "термин / запись", "Ich rufe wegen eines Termins an.", "Подходит для врача, учреждения и встреч."),
    ("verschieben", "перенести", "Ich moechte den Termin verschieben.", "Для изменения времени."),
    ("absagen", "отменить", "Ich muss den Termin absagen.", "Если совсем не можете прийти."),
    ("frei", "свободный", "Haben Sie einen Termin frei?", "Свободное время."),
    ("leider", "к сожалению", "Ich kann leider nicht kommen.", "Делает отказ вежливее."),
    ("die Nachricht", "сообщение", "Ich moechte eine Nachricht hinterlassen.", "Если человек недоступен."),
    ("ungefaehr", "примерно", "Wann ungefaehr?", "Вопрос о примерном времени."),
]


TELEFONATE_QUIZ = [
    ("Что значит „Ich rufe wegen eines Termins an“?", ["Я звоню по поводу термина.", "Я покупаю хлеб.", "Я ищу квартиру."], "Ich rufe wegen ... an — телефонная фраза.", "telefonate-anrufen"),
    ("Как попросить повторить по телефону?", ["Koennen Sie das bitte wiederholen?", "Was kostet das?", "Mit Karte, bitte."], "Фраза безопасна в любом телефонном разговоре.", "telefonate-nachricht-hinterlassen"),
    ("Что значит „verschieben“?", ["перенести", "заплатить", "ждать"], "Termin verschieben — перенести термин.", "telefonate-termin-verschieben"),
]


def seed_telefonate_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="telefonate",
        defaults={
            "title_de": "Telefonate",
            "title_ru": "Телефонные разговоры",
            "icon": "☎️",
            "description_de": "Anrufen, Termine verschieben, langsam sprechen lassen und Rueckruf klaeren.",
            "description_ru": "Позвонить, перенести термин, попросить говорить медленно и договориться о перезвоне.",
            "order": 6,
            "is_published": True,
        },
    )

    for scene_data in TELEFONATE_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "telefonate",
                "icon": "☎️",
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

    default_scene = Scene.objects.filter(slug="telefonate-anrufen").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(TELEFONATE_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="telefonate").delete()
    for prompt_ru, options, explanation_ru, scene_slug in TELEFONATE_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="telefonate",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_telefonate_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in TELEFONATE_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="telefonate").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0022_seed_wohnung_module"),
    ]

    operations = [
        migrations.RunPython(seed_telefonate_module, unseed_telefonate_module),
    ]
