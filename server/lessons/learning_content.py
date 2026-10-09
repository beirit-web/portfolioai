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
    }


def pronunciation_for_topic(topic_id):
    examples = {
        "baeckerei": ["Ich hätte gern ...", "их хэ́тэ гэ́рн"],
        "supermarkt": ["Wo finde ich ...?", "во финдэ их"],
        "arzt": ["Ich habe Schmerzen.", "их ха́бэ шмэрцен"],
        "jobcenter": ["Können Sie das bitte wiederholen?", "кёнэн зи дас битэ видэрхолен"],
    }
    return examples.get(topic_id, [])


def scene_exercises(topic_id):
    return [
        {"type": "gap", "prompt": "Дополните вежливую фразу.", "template": "Ich hätte gern ________."},
        {"type": "roleplay", "prompt": "Напишите короткий ответ для этой ситуации.", "topicId": topic_id},
    ]
