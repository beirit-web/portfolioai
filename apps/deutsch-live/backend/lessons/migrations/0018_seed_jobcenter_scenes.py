from django.db import migrations


JOBCENTER_SCENES = [
    {
        "slug": "jobcenter-termin-klaeren",
        "title": "Jobcenter 1 - Termin klaeren",
        "description_de": "Einen Termin nennen, warten und ruhig nach dem naechsten Schritt fragen.",
        "description_ru": "Назвать термин, подождать и спокойно спросить о следующем шаге.",
        "lines": [
            ("Kunde", "Guten Tag. Ich habe heute einen Termin.", "Добрый день. У меня сегодня термин.", "Ich habe heute einen Termin — простая фраза на входе."),
            ("Empfang", "Wie ist Ihr Name?", "Как ваша фамилия?", "Часто сначала спрашивают имя или фамилию."),
            ("Kunde", "Mein Name ist Ivan Petrov.", "Меня зовут Иван Петров.", "Mein Name ist ... звучит нейтрально и понятно."),
            ("Empfang", "Bitte warten Sie einen Moment.", "Пожалуйста, подождите немного.", "Einen Moment — немного времени."),
            ("Kunde", "Danke. Was soll ich danach machen?", "Спасибо. Что мне потом делать?", "Was soll ich ...? помогает спросить следующий шаг."),
        ],
    },
    {
        "slug": "jobcenter-unterlagen-abgeben",
        "title": "Jobcenter 2 - Unterlagen abgeben",
        "description_de": "Unterlagen abgeben und freundlich fragen, ob noch etwas fehlt.",
        "description_ru": "Сдать документы и вежливо спросить, чего ещё не хватает.",
        "lines": [
            ("Kunde", "Ich moechte diese Unterlagen abgeben.", "Я хочу сдать эти документы.", "Unterlagen — документы к делу, не название учреждения."),
            ("Mitarbeiterin", "Danke. Haben Sie auch den Antrag dabei?", "Спасибо. У вас также есть заявление?", "Antrag — заявление или формуляр."),
            ("Kunde", "Ja, hier ist der Antrag.", "Да, вот заявление.", "Hier ist ... удобно, когда вы что-то показываете."),
            ("Mitarbeiterin", "Es fehlt noch die Kopie vom Mietvertrag.", "Ещё не хватает копии договора аренды.", "Es fehlt ... значит: не хватает."),
            ("Kunde", "Kann ich die Kopie morgen bringen?", "Могу я принести копию завтра?", "Kann ich ...? — вежливый вопрос о возможности."),
        ],
    },
    {
        "slug": "jobcenter-rueckfrage-verstehen",
        "title": "Jobcenter 3 - Rueckfrage verstehen",
        "description_de": "Nachfragen, wenn eine Rueckfrage unklar ist, und eine einfache Antwort geben.",
        "description_ru": "Переспросить, если вопрос непонятен, и дать простой ответ.",
        "lines": [
            ("Mitarbeiter", "Seit wann wohnen Sie in dieser Wohnung?", "С какого времени вы живёте в этой квартире?", "Seit wann? — с какого времени."),
            ("Kunde", "Koennen Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Diese Frage ist sicher, wenn Sie etwas nicht verstehen."),
            ("Mitarbeiter", "Seit welchem Datum wohnen Sie dort?", "С какой даты вы там живёте?", "Datum — конкретная дата."),
            ("Kunde", "Seit dem 1. Mai.", "С 1 мая.", "Seit dem ... — короткий ответ с датой."),
            ("Mitarbeiter", "Danke, das reicht fuer heute.", "Спасибо, этого достаточно на сегодня.", "Das reicht — этого достаточно."),
        ],
    },
    {
        "slug": "arbeitsagentur-arbeitssuche",
        "title": "Agentur fuer Arbeit 1 - Arbeitssuche",
        "description_de": "Bei der Agentur fuer Arbeit ueber Arbeitssuche und Arbeitslosmeldung sprechen.",
        "description_ru": "В Agentur für Arbeit говорить о поиске работы и регистрации безработицы.",
        "lines": [
            ("Kunde", "Ich suche Arbeit und brauche Hilfe.", "Я ищу работу и мне нужна помощь.", "Ich suche Arbeit — очень прямой и понятный Satz."),
            ("Beraterin", "Sind Sie schon arbeitslos gemeldet?", "Вы уже зарегистрированы как безработный?", "Arbeitslos gemeldet — официально зарегистрирован как безработный."),
            ("Kunde", "Nein, noch nicht. Was muss ich machen?", "Нет, ещё нет. Что мне нужно сделать?", "Was muss ich machen? — простой вопрос о действии."),
            ("Beraterin", "Wir klaeren zuerst Ihre Daten.", "Сначала мы уточним ваши данные.", "Daten — личные данные, например адрес и контакт."),
            ("Kunde", "Bitte sprechen Sie langsam.", "Пожалуйста, говорите медленно.", "Очень полезная фраза в учреждении."),
        ],
    },
]


def seed_jobcenter_scenes(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")

    category, _ = Category.objects.update_or_create(
        slug="jobcenter",
        defaults={
            "title_de": "Jobcenter und Agentur für Arbeit",
            "title_ru": "Jobcenter и Agentur für Arbeit",
            "icon": "🏢",
            "description_de": (
                "Termine, Unterlagen, Rueckfragen und Arbeitssuche beim Jobcenter "
                "und bei der Agentur fuer Arbeit klar trennen."
            ),
            "description_ru": (
                "Jobcenter: Bürgergeld, заявления и документы. Agentur für Arbeit: "
                "поиск работы, регистрация безработицы и ALG I."
            ),
            "order": 4,
            "is_published": True,
        },
    )

    for scene_data in JOBCENTER_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "jobcenter",
                "icon": "🏢",
                "description_de": scene_data["description_de"],
                "description_ru": scene_data["description_ru"],
                "level": "a1",
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


def unseed_jobcenter_scenes(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in JOBCENTER_SCENES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0017_normalize_jobcenter_terms"),
    ]

    operations = [
        migrations.RunPython(seed_jobcenter_scenes, unseed_jobcenter_scenes),
    ]
