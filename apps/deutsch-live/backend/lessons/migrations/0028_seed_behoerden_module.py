from django.db import migrations


BEHOERDEN_SCENES = [
    {
        "slug": "behoerden-termin-anmelden",
        "title": "Behoerden 1 - Termin im Buergeramt",
        "description_de": "Einen Termin im Buergeramt bestaetigen und den Grund nennen.",
        "description_ru": "Подтвердить термин в Bürgeramt и назвать причину.",
        "lines": [
            ("Besucher", "Guten Tag. Ich habe einen Termin im Buergeramt.", "Добрый день. У меня термин в Bürgeramt.", "Termin im Buergeramt."),
            ("Mitarbeiterin", "Wofuer ist der Termin?", "Для чего этот термин?", "Wofuer? — для чего?"),
            ("Besucher", "Ich moechte meine Adresse anmelden.", "Я хочу зарегистрировать адрес.", "Adresse anmelden."),
            ("Mitarbeiterin", "Haben Sie Ihren Ausweis dabei?", "У вас с собой удостоверение личности?", "Ausweis — документ."),
            ("Besucher", "Ja, hier ist mein Ausweis.", "Да, вот мой документ.", "Hier ist ..."),
        ],
    },
    {
        "slug": "behoerden-formular-abgeben",
        "title": "Behoerden 2 - Formular abgeben",
        "description_de": "Ein Formular abgeben und fehlende Unterlagen klaeren.",
        "description_ru": "Сдать формуляр и уточнить недостающие документы.",
        "lines": [
            ("Besucher", "Ich moechte dieses Formular abgeben.", "Я хочу сдать этот формуляр.", "Formular abgeben."),
            ("Mitarbeiter", "Bitte unterschreiben Sie hier.", "Пожалуйста, подпишите здесь.", "Unterschreiben — подписать."),
            ("Besucher", "Fehlen noch Unterlagen?", "Ещё не хватает документов?", "Kurze Frage."),
            ("Mitarbeiter", "Ja, wir brauchen eine Kopie vom Ausweis.", "Да, нам нужна копия удостоверения.", "Kopie vom Ausweis."),
            ("Besucher", "Kann ich die Kopie nachreichen?", "Могу я донести копию позже?", "Nachreichen — донести позже."),
        ],
    },
    {
        "slug": "behoerden-bescheinigung",
        "title": "Behoerden 3 - Bescheinigung beantragen",
        "description_de": "Eine Bescheinigung beantragen und Gebuehren verstehen.",
        "description_ru": "Запросить справку и понять оплату.",
        "lines": [
            ("Besucher", "Ich brauche eine Meldebescheinigung.", "Мне нужна справка о регистрации.", "Meldebescheinigung."),
            ("Mitarbeiterin", "Die Gebuehr betraegt zehn Euro.", "Пошлина составляет десять евро.", "Gebuehr — пошлина."),
            ("Besucher", "Kann ich mit Karte bezahlen?", "Можно оплатить картой?", "Bezahlen bei Behoerde."),
            ("Mitarbeiterin", "Ja, bitte am Automaten bezahlen.", "Да, пожалуйста, оплатите в автомате.", "Automat."),
            ("Besucher", "Koennen Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Sicher nachfragen."),
        ],
    },
]


BEHOERDEN_VOCABULARY = [
    ("die Behoerde", "учреждение / ведомство", "Ich habe einen Termin bei der Behoerde.", "Allgemeines Wort."),
    ("das Buergeramt", "Bürgeramt / гражданское ведомство", "Ich gehe zum Buergeramt.", "Oft fuer Anmeldung."),
    ("der Termin", "термин / запись", "Ich habe einen Termin.", "Mit Uhrzeit."),
    ("der Ausweis", "удостоверение личности", "Hier ist mein Ausweis.", "Personalausweis oder Pass."),
    ("die Adresse", "адрес", "Ich moechte meine Adresse anmelden.", "Wohnadresse."),
    ("anmelden", "зарегистрировать", "Ich moechte meine Adresse anmelden.", "Bei Umzug."),
    ("das Formular", "формуляр", "Ich fuelle das Formular aus.", "Papier oder online."),
    ("abgeben", "сдать", "Ich moechte das Formular abgeben.", "Dokumente abgeben."),
    ("unterschreiben", "подписать", "Bitte unterschreiben Sie hier.", "Mit Unterschrift."),
    ("die Unterlagen", "документы", "Welche Unterlagen fehlen?", "Allgemein."),
    ("die Kopie", "копия", "Wir brauchen eine Kopie.", "Dokumentenkopie."),
    ("nachreichen", "донести позже", "Kann ich die Kopie nachreichen?", "Spaeter bringen."),
    ("die Bescheinigung", "справка", "Ich brauche eine Bescheinigung.", "Offizielles Dokument."),
    ("die Meldebescheinigung", "справка о регистрации", "Ich brauche eine Meldebescheinigung.", "Nach Anmeldung."),
    ("die Gebuehr", "пошлина", "Die Gebuehr betraegt zehn Euro.", "Kosten bei Behoerde."),
    ("der Automat", "автомат", "Bitte am Automaten bezahlen.", "Zahlungsautomat."),
]


BEHOERDEN_QUIZ = [
    ("Как сказать: «У меня термин в Bürgeramt»?", ["Ich habe einen Termin im Buergeramt.", "Ich suche ein Medikament.", "Ich hole mein Kind ab."], "Termin im Buergeramt ist die passende Form.", "behoerden-termin-anmelden"),
    ("Что значит „unterschreiben“?", ["Подписать", "Оплатить", "Обменять"], "Unterschreiben bedeutet подписать.", "behoerden-formular-abgeben"),
    ("Что означает „Meldebescheinigung“?", ["Справка о регистрации", "Рецепт", "Чек"], "Eine Meldebescheinigung bestaetigt die Anmeldung.", "behoerden-bescheinigung"),
]


def seed_behoerden_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="behoerden",
        defaults={
            "title_de": "Behoerden",
            "title_ru": "Госучреждения",
            "icon": "🏛️",
            "description_de": "Termine, Formulare, Ausweis, Bescheinigungen und Gebuehren im Buergeramt.",
            "description_ru": "Термины, формуляры, удостоверение, справки и пошлины в Bürgeramt.",
            "order": 11,
            "is_published": True,
        },
    )

    for scene_data in BEHOERDEN_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "behoerden",
                "icon": "🏛️",
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

    default_scene = Scene.objects.filter(slug="behoerden-termin-anmelden").first()
    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(BEHOERDEN_VOCABULARY, start=1):
        Vocabulary.objects.create(category=category, scene=default_scene, word_de=word_de, translation_ru=translation_ru, example_de=example_de, note_ru=note_ru, order=order, is_published=True)

    QuizQuestion.objects.filter(topic_id="behoerden").delete()
    for prompt_ru, options, explanation_ru, scene_slug in BEHOERDEN_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="behoerden",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_behoerden_module(apps, schema_editor):
    Scene = apps.get_model("lessons", "Scene")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene.objects.filter(slug__in=[scene["slug"] for scene in BEHOERDEN_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="behoerden").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0027_seed_apotheke_module"),
    ]

    operations = [
        migrations.RunPython(seed_behoerden_module, unseed_behoerden_module),
    ]
