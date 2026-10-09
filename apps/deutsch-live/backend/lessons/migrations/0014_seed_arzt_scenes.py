from django.db import migrations


ARZT_SCENES = [
    {
        "slug": "arzt-termin-vereinbaren",
        "title": "Arzt 1 - Termin vereinbaren",
        "description_de": "Einen Termin anfragen und einen passenden Zeitpunkt bestätigen.",
        "description_ru": "Записаться на приём и спокойно подтвердить время.",
        "level": "a1",
        "lines": [
            ("Patient", "Guten Tag. Ich brauche einen Termin.", "Добрый день. Мне нужен приём.", "Ich brauche ... — безопасная фраза, когда вам что-то нужно."),
            ("Praxis", "Haben Sie akute Beschwerden?", "У вас острые жалобы?", "Если не понимаете слово, можно сразу переспросить."),
            ("Patient", "Nein, es ist nicht akut.", "Нет, это не срочно.", "Nicht akut значит: не срочно, но всё равно нужен приём."),
            ("Praxis", "Wir haben am Donnerstag um 10 Uhr einen Termin frei.", "У нас есть свободное время в четверг в 10 часов.", "Termin frei — свободное время для приёма."),
            ("Patient", "Ja, das passt. Vielen Dank.", "Да, мне подходит. Большое спасибо.", "Das passt — короткий ответ: мне подходит."),
        ],
    },
    {
        "slug": "arzt-anmeldung",
        "title": "Arzt 2 - Anmeldung in der Praxis",
        "description_de": "An der Rezeption ankommen, Termin nennen und Gesundheitskarte zeigen.",
        "description_ru": "Подойти к стойке, назвать время приёма и показать медицинскую карту.",
        "level": "a1",
        "lines": [
            ("Patient", "Guten Tag. Ich habe einen Termin um 10 Uhr.", "Добрый день. У меня приём в 10 часов.", "Ich habe einen Termin um ... — важная фраза на регистрации."),
            ("Rezeption", "Wie ist Ihr Name?", "Как ваша фамилия?", "В Германии часто сначала спрашивают имя или фамилию."),
            ("Patient", "Mein Name ist Ivan Petrov.", "Меня зовут Иван Петров.", "Mein Name ist ... звучит нейтрально и понятно."),
            ("Rezeption", "Haben Sie Ihre Gesundheitskarte dabei?", "У вас с собой медицинская карта?", "Gesundheitskarte — карточка медицинского страхования."),
            ("Patient", "Ja, hier ist meine Gesundheitskarte.", "Да, вот моя медицинская карта.", "Hier ist ... — вот, когда вы что-то показываете."),
            ("Rezeption", "Bitte nehmen Sie im Wartezimmer Platz.", "Пожалуйста, проходите в зал ожидания.", "Wartezimmer — зал ожидания."),
        ],
    },
    {
        "slug": "arzt-symptome-beschreiben",
        "title": "Arzt 3 - Symptome beschreiben",
        "description_de": "Einfache Symptome nennen und sagen, seit wann sie da sind.",
        "description_ru": "Назвать простые симптомы и сказать, как давно они есть.",
        "level": "a1",
        "lines": [
            ("Arzt", "Was fehlt Ihnen?", "Что вас беспокоит?", "Так врач часто начинает вопрос о проблеме."),
            ("Patient", "Ich habe Kopfschmerzen und Husten.", "У меня головная боль и кашель.", "Ich habe ... подходит для многих симптомов."),
            ("Arzt", "Seit wann haben Sie die Beschwerden?", "С каких пор у вас жалобы?", "Seit wann? — с какого времени?"),
            ("Patient", "Seit drei Tagen.", "Уже три дня.", "Seit drei Tagen — короткий полный ответ."),
            ("Arzt", "Haben Sie auch Fieber?", "У вас также есть температура?", "Auch значит также."),
            ("Patient", "Nein, ich habe kein Fieber.", "Нет, температуры нет.", "Kein Fieber — нет температуры."),
        ],
    },
    {
        "slug": "arzt-schmerzen-einordnen",
        "title": "Arzt 4 - Schmerzen einordnen",
        "description_de": "Sagen, wo der Schmerz ist und wie stark er ist.",
        "description_ru": "Сказать, где болит и насколько сильно.",
        "level": "a1",
        "lines": [
            ("Arzt", "Wo tut es weh?", "Где болит?", "Wo? — где. Tut weh — болит."),
            ("Patient", "Der Schmerz ist hier im Bauch.", "Боль здесь, в животе.", "Hier im Bauch — здесь в животе."),
            ("Arzt", "Ist der Schmerz leicht, mittel oder stark?", "Боль слабая, средняя или сильная?", "Leicht, mittel, stark — простая шкала боли."),
            ("Patient", "Der Schmerz ist mittel.", "Боль средняя.", "Можно отвечать очень коротко."),
            ("Arzt", "Ist der Schmerz immer da?", "Боль постоянная?", "Immer da — всё время есть."),
            ("Patient", "Nein, nur manchmal.", "Нет, только иногда.", "Nur manchmal — только иногда."),
        ],
    },
    {
        "slug": "arzt-nachfragen",
        "title": "Arzt 5 - Nachfragen und nächste Schritte",
        "description_de": "Nachfragen, wenn etwas unklar ist, und den nächsten Schritt verstehen.",
        "description_ru": "Переспросить, если непонятно, и понять следующий шаг.",
        "level": "a1",
        "lines": [
            ("Arzt", "Ich schreibe Ihnen ein Rezept.", "Я выпишу вам рецепт.", "Rezept — рецепт для аптеки."),
            ("Patient", "Können Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Эта фраза безопасна в любой ситуации."),
            ("Arzt", "Sie bekommen ein Rezept für die Apotheke.", "Вы получите рецепт для аптеки.", "Apotheke — аптека."),
            ("Patient", "Was soll ich jetzt machen?", "Что мне теперь делать?", "Was soll ich ...? — что мне следует ...?"),
            ("Arzt", "Nehmen Sie das Medikament wie besprochen.", "Принимайте лекарство, как мы обсудили.", "Это учебная фраза, не медицинская рекомендация."),
            ("Patient", "Danke. Ich frage nach, wenn ich etwas nicht verstehe.", "Спасибо. Я переспрошу, если что-то не пойму.", "Nachfragen — переспросить."),
        ],
    },
]


def seed_arzt_scenes(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")

    category, _ = Category.objects.update_or_create(
        slug="arzt",
        defaults={
            "title_de": "Arztbesuch",
            "title_ru": "Врач",
            "icon": "🩺",
            "description_de": "Arzttermin, Anmeldung, Symptome beschreiben, Schmerzen einordnen und ruhig nachfragen.",
            "description_ru": "Модуль для визита к врачу: записаться, зарегистрироваться на приёме, описать симптомы, объяснить боль и спокойно переспросить.",
            "order": 2,
            "is_published": True,
        },
    )

    for scene_data in ARZT_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "arzt",
                "icon": "🩺",
                "description_de": scene_data["description_de"],
                "description_ru": scene_data["description_ru"],
                "level": scene_data["level"],
                "is_premium": False,
                "is_published": True,
            },
        )
        SceneLine.objects.filter(scene=scene).delete()
        for order, (speaker, text_de, text_ru, explanation) in enumerate(scene_data["lines"], start=1):
            SceneLine.objects.create(
                scene=scene,
                speaker=speaker,
                text_de=text_de,
                text_ru=text_ru,
                explanation=explanation,
                order=order,
            )


def unseed_arzt_scenes(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in ARZT_SCENES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0013_prepare_arzt_module_structure"),
    ]

    operations = [
        migrations.RunPython(seed_arzt_scenes, unseed_arzt_scenes),
    ]
