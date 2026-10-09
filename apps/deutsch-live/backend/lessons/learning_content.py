from .data import TOPICS
from .models import Category, QuizQuestion, Scene


def category_summaries_from_db():
    categories = (
        Category.objects.filter(is_published=True, scenes__is_published=True)
        .distinct()
        .prefetch_related("scenes__lines", "vocabulary")
    )
    return [
        {
            "id": category.slug,
            "label": category.title_de,
            "icon": category.icon,
            "ru": category.title_ru,
            "phraseCount": sum(scene.lines.count() for scene in category.scenes.all()),
            "quizCount": QuizQuestion.objects.filter(topic_id=category.slug, is_active=True).count(),
        }
        for category in categories
    ]


def category_detail_from_db(topic_id):
    category = Category.objects.filter(slug=topic_id, is_published=True).first()
    if not category or not category.scenes.filter(is_published=True).exists():
        return None

    scenes = list(category.scenes.filter(is_published=True).prefetch_related("lines", "vocabulary"))
    static_topic = TOPICS.get(category.slug, {})
    return {
        "id": category.slug,
        "label": category.title_de,
        "icon": category.icon,
        "ru": category.title_ru,
        "description": category.description_ru or category.description_de,
        "phrases": [phrase for scene in scenes for phrase in phrases_from_scene(scene)],
        "scenes": [learning_scene_from_db(scene) for scene in scenes],
        "pronunciation": pronunciation_for_topic(category.slug),
        "vocabulary": [
            vocabulary_from_db(item)
            for item in category.vocabulary.filter(is_published=True)
        ],
        "exercises": static_topic.get("exercises", scene_exercises(category.slug)),
        "free_answer": static_topic.get("free_answer"),
        "quiz": [quiz_question_from_db(item) for item in QuizQuestion.objects.filter(topic_id=category.slug, is_active=True).prefetch_related("answers")],
    }


def quiz_question_from_db(item):
    answers = list(item.answers.all())
    options = [answer.text for answer in answers] or item.options
    correct_index = next((index for index, answer in enumerate(answers) if answer.is_correct), 0)
    return {
        "question": item.prompt_ru,
        "options": options,
        "answer": correct_index,
        "explain": item.explanation_ru,
    }


def scene_cards_from_db():
    scenes = Scene.objects.filter(is_published=True).select_related("category").prefetch_related("lines")
    return [scene_card_from_db(scene) for scene in scenes]


def scene_card_from_db(scene):
    return {
        "id": scene.slug,
        "title": scene.title,
        "icon": scene.icon or (scene.category.icon if scene.category else ""),
        "ru": scene.description_ru or scene.title,
        "level": scene.level,
        "isPremium": scene.is_premium,
        "dialogues": phrases_from_scene(scene),
        "pronunciation": pronunciation_for_topic(scene.topic_id),
        "exercises": scene_exercises(scene.topic_id),
    }


def learning_scene_from_db(scene):
    return {
        "id": scene.slug,
        "title": scene.title,
        "ru": scene.description_ru or scene.title,
        "dialogue": [
            {
                "speaker": line.speaker,
                "de": line.text_de,
                "ru": line.text_ru,
            }
            for line in scene.lines.all()
        ],
        "explanation": scene.description_ru or scene.description_de,
        "level": scene.level,
        "isPremium": scene.is_premium,
    }


def phrases_from_scene(scene):
    return [
        {
            "de": line.text_de,
            "ru": line.text_ru,
            "hint": line.explanation or scene.description_ru,
            "scene": scene.slug,
        }
        for line in scene.lines.all()
    ]


def vocabulary_from_db(item):
    return {
        "de": item.word_de,
        "ru": item.translation_ru,
        "example": item.example_de,
        "note": item.note_ru,
    }


def pronunciation_for_topic(topic_id):
    examples = {
        "baeckerei": ["Ich hätte gern ...", "их хэ́тэ гэ́рн"],
        "supermarkt": [
            "Wo finde ich Milch?",
            "во финдэ их мильх",
            "Kann ich das umtauschen?",
            "кан их дас умтаушэн",
        ],
        "apotheke": [
            "Ich suche etwas gegen Kopfschmerzen.",
            "их зухэ этвас геген копфшмерцен",
            "Wie soll ich das Medikament einnehmen?",
            "ви золь их дас медикамент айнемэн",
        ],
        "arzt": ["Ich habe Schmerzen.", "их ха́бэ шмэрцен", "Können Sie das bitte wiederholen?", "кёнэн зи дас битэ видэрхолен"],
        "jobcenter": [
            "Ich möchte diese Unterlagen abgeben.",
            "их мёхтэ дизэ унтэрлагэн апгэбэн",
            "Können Sie das bitte wiederholen?",
            "кёнэн зи дас битэ видэрхолен",
        ],
        "behoerden": [
            "Ich habe einen Termin im Buergeramt.",
            "их хабэ айнэн тэрмин им бюргэрамт",
            "Ich brauche eine Meldebescheinigung.",
            "их браухэ айнэ мельдэбэшайнигунг",
        ],
        "wohnung": [
            "Ich habe einen Termin zur Besichtigung.",
            "их хабэ айнэн тэрмин цур бэзихтигунг",
            "Wie hoch ist die Warmmiete?",
            "ви хох ист ди варммите",
        ],
        "telefonate": [
            "Ich rufe wegen eines Termins an.",
            "их руфэ веген айнэс тэрминс ан",
            "Bitte sprechen Sie langsam.",
            "битэ шпрэхэн зи лангзам",
        ],
        "arbeit": [
            "Ich möchte mich bewerben.",
            "их мёхтэ мих бэвэрбэн",
            "Was soll ich zuerst machen?",
            "вас золь их цуэрст махэн",
        ],
        "schule-kindergarten": [
            "Mein Kind ist krank.",
            "майн кинд ист кранк",
            "Ich hole mein Kind um 14 Uhr ab.",
            "их холэ майн кинд ум фирцен ур ап",
        ],
        "oeffentlicher-verkehr": [
            "Ich brauche ein Ticket nach Helmstedt.",
            "их браухэ айн тикет нах хельмштет",
            "Muss ich umsteigen?",
            "мус их умштайгэн",
        ],
    }
    return examples.get(topic_id, [])


def scene_exercises(topic_id):
    if topic_id == "arzt":
        return [
            {"type": "gap", "prompt": "Дополните фразу для врача.", "template": "Ich habe ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «У меня приём в 10 часов».", "answer": "Ich habe einen Termin um 10 Uhr."},
            {"type": "roleplay", "prompt": "Напишите короткий ответ: где болит и как давно.", "topicId": "arzt"},
        ]
    if topic_id == "supermarkt":
        return [
            {"type": "gap", "prompt": "Дополните вопрос в супермаркете.", "template": "Wo finde ich ________?"},
            {"type": "translation", "prompt": "Переведите на немецкий: «Можно это обменять?»", "answer": "Kann ich das umtauschen?"},
            {"type": "roleplay", "prompt": "Напишите короткий разговор: спросите, где продукт, попросите пакет и оплатите картой.", "topicId": "supermarkt"},
        ]
    if topic_id == "apotheke":
        return [
            {"type": "gap", "prompt": "Дополните фразу в аптеке.", "template": "Ich suche etwas gegen ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Как мне принимать лекарство?»", "answer": "Wie soll ich das Medikament einnehmen?"},
            {"type": "roleplay", "prompt": "Напишите короткий разговор: что вы ищете, как принимать и нужен ли рецепт.", "topicId": "apotheke"},
        ]
    if topic_id == "jobcenter":
        return [
            {"type": "gap", "prompt": "Дополните фразу для сдачи документов.", "template": "Ich möchte diese ________ abgeben."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Каких документов не хватает?»", "answer": "Welche Unterlagen fehlen?"},
            {"type": "roleplay", "prompt": "Напишите короткий ответ: у вас термин, но вы не поняли вопрос.", "topicId": "jobcenter"},
        ]
    if topic_id == "behoerden":
        return [
            {"type": "gap", "prompt": "Дополните фразу в учреждении.", "template": "Ich habe einen Termin im ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Мне нужна справка о регистрации».", "answer": "Ich brauche eine Meldebescheinigung."},
            {"type": "roleplay", "prompt": "Напишите короткое сообщение: термин в Bürgeramt, формуляр и вопрос о недостающих документах.", "topicId": "behoerden"},
        ]
    if topic_id == "wohnung":
        return [
            {"type": "gap", "prompt": "Дополните фразу для просмотра квартиры.", "template": "Ich habe einen Termin zur ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Сколько стоит тёплая аренда?»", "answer": "Wie hoch ist die Warmmiete?"},
            {"type": "roleplay", "prompt": "Напишите короткое сообщение: просмотр квартиры, документы и один вопрос.", "topicId": "wohnung"},
        ]
    if topic_id == "telefonate":
        return [
            {"type": "gap", "prompt": "Дополните телефонную фразу.", "template": "Ich rufe wegen eines ________ an."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Пожалуйста, говорите медленно».", "answer": "Bitte sprechen Sie langsam."},
            {"type": "roleplay", "prompt": "Напишите короткий звонок: имя, причина звонка и просьба повторить.", "topicId": "telefonate"},
        ]
    if topic_id == "arbeit":
        return [
            {"type": "gap", "prompt": "Дополните фразу для Bewerbung.", "template": "Ich möchte mich ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Что мне сначала сделать?»", "answer": "Was soll ich zuerst machen?"},
            {"type": "roleplay", "prompt": "Напишите короткий ответ на собеседовании: опыт, начало работы и один вопрос.", "topicId": "arbeit"},
        ]
    if topic_id == "schule-kindergarten":
        return [
            {"type": "gap", "prompt": "Дополните сообщение в школу.", "template": "Mein Kind ist ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Я заберу моего ребёнка в 14 часов».", "answer": "Ich hole mein Kind um 14 Uhr ab."},
            {"type": "roleplay", "prompt": "Напишите короткое сообщение: ребёнок болеет, не придёт сегодня и вы просите подтвердить.", "topicId": "schule-kindergarten"},
        ]
    if topic_id == "oeffentlicher-verkehr":
        return [
            {"type": "gap", "prompt": "Дополните фразу для билета.", "template": "Ich brauche ein Ticket nach ________."},
            {"type": "translation", "prompt": "Переведите на немецкий: «Мне нужно пересаживаться?»", "answer": "Muss ich umsteigen?"},
            {"type": "roleplay", "prompt": "Напишите короткий разговор: билет, направление и вопрос о задержке.", "topicId": "oeffentlicher-verkehr"},
        ]
    return [
        {"type": "gap", "prompt": "Дополните вежливую фразу.", "template": "Ich hätte gern ________."},
        {"type": "roleplay", "prompt": "Напишите короткий ответ для этой ситуации.", "topicId": topic_id},
    ]
