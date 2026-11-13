# Generated for EPIC 5 bakery MVP content

from django.db import migrations


BAKERY_PHRASES = [
    ("begrussung", "Verkäuferin", "Guten Morgen. Was darf es sein?", "Доброе утро. Что вам положить?", "Так продавец часто начинает разговор."),
    ("begrussung", "Kunde", "Guten Morgen. Ich hätte gern zwei Brötchen.", "Доброе утро. Я бы хотел/хотела две булочки.", "Вежливая форма заказа: Ich hätte gern ..."),
    ("erster-einkauf", "Kunde", "Ich hätte gern ein Croissant.", "Я бы хотел/хотела круассан.", "Ich hätte gern ... звучит мягко и вежливо."),
    ("erster-einkauf", "Verkäuferin", "Sonst noch etwas?", "Ещё что-нибудь?", "Так продавец спрашивает, закончен ли заказ."),
    ("erster-einkauf", "Kunde", "Nein, danke. Das ist alles.", "Нет, спасибо. Это всё.", "Короткий спокойный ответ в конце заказа."),
    ("kaffee-bestellen", "Kunde", "Ich nehme einen Kaffee mit Milch, bitte.", "Я возьму кофе с молоком, пожалуйста.", "Ich nehme ... естественно для короткого заказа."),
    ("kaffee-bestellen", "Verkäuferin", "Zum Mitnehmen?", "С собой?", "Очень частый вопрос в пекарне."),
    ("kaffee-bestellen", "Kunde", "Ja, bitte. Ohne Zucker.", "Да, пожалуйста. Без сахара.", "Mit/ohne помогают быстро уточнить заказ."),
    ("kaffee-bestellen", "Verkäuferin", "Möchten Sie noch etwas dazu?", "Хотите ещё что-нибудь к этому?", "Dazu значит дополнительно к заказу."),
    ("kaffee-bestellen", "Kunde", "Ein Stück Käsekuchen, bitte.", "Один кусок чизкейка, пожалуйста.", "Ein Stück используют для торта или пирога."),
    ("bezahlen", "Verkäuferin", "Das macht 5 Euro 40.", "С вас 5 евро 40.", "Так называют итоговую сумму."),
    ("bezahlen", "Kunde", "Kann ich mit Karte bezahlen?", "Можно оплатить картой?", "Вежливый вопрос перед оплатой."),
    ("bezahlen", "Kunde", "Mit Karte, bitte.", "Картой, пожалуйста.", "Короткий естественный ответ при оплате."),
    ("bezahlen", "Kunde", "Bar, bitte.", "Наличными, пожалуйста.", "Bar значит наличными."),
    ("bezahlen", "Verkäuferin", "Brauchen Sie den Kassenbon?", "Вам нужен чек?", "Так часто спрашивают после оплаты."),
    ("preise", "Kunde", "Was kostet das?", "Сколько это стоит?", "Универсальный вопрос о цене."),
    ("preise", "Kunde", "Wie viel macht das zusammen?", "Сколько это вместе?", "Подходит для нескольких товаров."),
    ("nachfragen", "Kunde", "Entschuldigung, ich verstehe nicht.", "Извините, я не понимаю.", "Спокойная фраза, если стало трудно."),
    ("nachfragen", "Kunde", "Können Sie das bitte wiederholen?", "Можете, пожалуйста, повторить?", "Безопасная фраза, если вы не поняли."),
    ("nachfragen", "Kunde", "Können Sie bitte langsamer sprechen?", "Можете, пожалуйста, говорить медленнее?", "Langsamer sprechen снижает стресс."),
    ("abschluss", "Kunde", "Vielen Dank.", "Большое спасибо.", "Вежливое завершение покупки."),
    ("abschluss", "Verkäuferin", "Schönen Tag noch.", "Хорошего дня.", "Так часто прощаются в магазине."),
]

BAKERY_SCENES = [
    {
        "slug": "baeckerei-erster-einkauf",
        "group": "erster-einkauf",
        "title": "Szene 1 - Erster Einkauf",
        "description_de": "Begrüßung, erste Bestellung und ruhiger Abschluss.",
        "description_ru": "Первый заказ: поздороваться, заказать и спокойно завершить разговор.",
        "level": "a1",
        "order_groups": ["begrussung", "erster-einkauf", "abschluss"],
    },
    {
        "slug": "baeckerei-kaffee-bestellen",
        "group": "kaffee-bestellen",
        "title": "Szene 2 - Kaffee bestellen",
        "description_de": "Kaffee, Milch, Zucker, zum Mitnehmen und kleine Ergänzungen.",
        "description_ru": "Кофе, молоко, сахар, с собой и маленькие уточнения.",
        "level": "a1",
        "order_groups": ["kaffee-bestellen"],
    },
    {
        "slug": "baeckerei-bezahlen",
        "group": "bezahlen",
        "title": "Szene 3 - Bezahlen",
        "description_de": "Preise verstehen, mit Karte oder bar bezahlen und nach dem Kassenbon reagieren.",
        "description_ru": "Понять цену, оплатить картой или наличными и ответить про чек.",
        "level": "a1",
        "order_groups": ["preise", "bezahlen", "nachfragen"],
    },
]

BAKERY_VOCABULARY = [
    ("die Bäckerei", "пекарня", "Ich gehe zur Bäckerei."),
    ("das Brötchen", "булочка", "Ich hätte gern zwei Brötchen."),
    ("das Brot", "хлеб", "Haben Sie frisches Brot?"),
    ("das Vollkornbrot", "цельнозерновой хлеб", "Haben Sie Vollkornbrot?"),
    ("das Croissant", "круассан", "Ein Croissant, bitte."),
    ("der Kuchen", "пирог/торт", "Ein Stück Kuchen, bitte."),
    ("der Käsekuchen", "чизкейк", "Ein Stück Käsekuchen, bitte."),
    ("der Kaffee", "кофе", "Ich nehme einen Kaffee."),
    ("die Milch", "молоко", "Mit Milch, bitte."),
    ("der Zucker", "сахар", "Ohne Zucker, bitte."),
    ("der Preis", "цена", "Was ist der Preis?"),
    ("kosten", "стоить", "Was kostet das?"),
    ("bezahlen", "платить", "Ich möchte bezahlen."),
    ("die Karte", "карта", "Mit Karte, bitte."),
    ("bar", "наличными", "Ich bezahle bar."),
    ("der Kassenbon", "чек", "Brauchen Sie den Kassenbon?"),
    ("zum Mitnehmen", "с собой", "Zum Mitnehmen, bitte."),
    ("sonst", "ещё/иначе", "Sonst noch etwas?"),
    ("wiederholen", "повторить", "Können Sie das bitte wiederholen?"),
    ("langsam", "медленно", "Bitte langsamer sprechen."),
]

BAKERY_QUIZ = [
    ("Что означает: „Was darf es sein?“", ["Что вам положить?", "Где вы живёте?", "Сколько это стоит?"], "В пекарне так часто начинают заказ: „Что вам положить?“"),
    ("Как вежливо заказать кофе?", ["Ich hätte gern einen Kaffee.", "Ich bin Kaffee.", "Ich gehe Kaffee."], "„Ich hätte gern ...“ — очень вежливая и безопасная форма заказа."),
    ("Что ответить, если продавец спрашивает: „Zum Mitnehmen?“", ["Ja, bitte.", "Nein, ich heiße Eugen.", "Morgen früh."], "„Ja, bitte“ значит: да, пожалуйста, с собой."),
    ("Как сказать «Картой, пожалуйста»?", ["Mit Karte, bitte.", "Ohne Karte, bitte.", "Was kostet die Karte?"], "Mit Karte, bitte. — короткий естественный ответ при оплате."),
    ("Что означает „Können Sie das bitte wiederholen?“", ["Можете повторить?", "Можно оплатить?", "Это свежее?"], "Это вежливая просьба повторить, если вы не поняли."),
    ("Как спросить цену?", ["Was kostet das?", "Was darf es sein?", "Wie heißen Sie?"], "Was kostet das? — универсальная фраза для вопроса о цене."),
]


def seed_bakery_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    SceneLine = apps.get_model("lessons", "SceneLine")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")

    category, _ = Category.objects.update_or_create(
        slug="baeckerei",
        defaults={
            "title_de": "Bäckerei",
            "title_ru": "Пекарня",
            "icon": "🥐",
            "description_de": "Bestellen, Kaffee, Preise, Bezahlen und höflich nachfragen.",
            "description_ru": "Первый полный MVP-модуль: приветствие, заказ, кофе, цены, оплата и спокойные уточнения.",
            "order": 3,
            "is_published": True,
        },
    )

    phrase_by_group = {}
    for group, speaker, text_de, text_ru, explanation in BAKERY_PHRASES:
        phrase_by_group.setdefault(group, []).append((speaker, text_de, text_ru, explanation))

    scene_by_group = {}
    for scene_data in BAKERY_SCENES:
        scene, _ = Scene.objects.update_or_create(
            slug=scene_data["slug"],
            defaults={
                "category": category,
                "title": scene_data["title"],
                "topic_id": "baeckerei",
                "icon": "🥐",
                "description_de": scene_data["description_de"],
                "description_ru": scene_data["description_ru"],
                "level": scene_data["level"],
                "is_premium": False,
                "is_published": True,
            },
        )
        scene_by_group[scene_data["group"]] = scene
        SceneLine.objects.filter(scene=scene).delete()
        order = 1
        for group in scene_data["order_groups"]:
            for speaker, text_de, text_ru, explanation in phrase_by_group.get(group, []):
                SceneLine.objects.create(
                    scene=scene,
                    speaker=speaker,
                    text_de=text_de,
                    text_ru=text_ru,
                    explanation=explanation,
                    order=order,
                )
                order += 1

    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de) in enumerate(BAKERY_VOCABULARY, start=1):
        Vocabulary.objects.create(
            category=category,
            scene=scene_by_group.get("erster-einkauf"),
            word_de=word_de,
            translation_ru=translation_ru,
            example_de=example_de,
            order=order,
            is_published=True,
        )

    QuizQuestion.objects.filter(topic_id="baeckerei").delete()
    for prompt_ru, options, explanation_ru in BAKERY_QUIZ:
        QuizQuestion.objects.create(
            scene=scene_by_group.get("erster-einkauf"),
            topic_id="baeckerei",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_bakery_module(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    category = Category.objects.filter(slug="baeckerei").first()
    if category:
        Vocabulary.objects.filter(category=category).delete()
    Scene.objects.filter(slug__in=[scene["slug"] for scene in BAKERY_SCENES]).delete()
    QuizQuestion.objects.filter(topic_id="baeckerei").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0007_category_vocabulary_alter_sceneline_options_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_bakery_module, unseed_bakery_module),
    ]
