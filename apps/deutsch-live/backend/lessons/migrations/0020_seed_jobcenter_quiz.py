from django.db import migrations


JOBCENTER_QUIZ = [
    (
        "Что чаще всего означает слово „Unterlagen“ в Jobcenter?",
        ["Документы к делу.", "Название учреждения.", "Деньги наличными."],
        "Unterlagen — это документы или бумаги, которые относятся к вашему делу.",
        "jobcenter-unterlagen-abgeben",
    ),
    (
        "Какая фраза подходит, если вы не поняли вопрос?",
        ["Können Sie das bitte wiederholen?", "Ich hätte gern zwei Brötchen.", "Der Schmerz ist stark."],
        "Können Sie das bitte wiederholen? — безопасная просьба повторить.",
        "jobcenter-rueckfrage-verstehen",
    ),
    (
        "Что обычно относится к Jobcenter?",
        ["Bürgergeld и документы.", "Рецепт в аптеку.", "Билет на автобус."],
        "В этом модуле Jobcenter отделяется от Agentur für Arbeit: Bürgergeld и документы относятся к Jobcenter.",
        "jobcenter-unterlagen-abgeben",
    ),
    (
        "Что обычно относится к Agentur für Arbeit?",
        ["Arbeitssuche, Arbeitslosmeldung и ALG I.", "Заказ хлеба.", "Боль в животе."],
        "Agentur für Arbeit связана с поиском работы, регистрацией безработицы и ALG I.",
        "arbeitsagentur-arbeitssuche",
    ),
    (
        "Как спросить: «Каких документов не хватает?»",
        ["Welche Unterlagen fehlen?", "Wo tut es weh?", "Mit Karte, bitte."],
        "Welche Unterlagen fehlen? — короткий и понятный вопрос по документам.",
        "jobcenter-unterlagen-abgeben",
    ),
    (
        "Какая фраза просит говорить медленнее?",
        ["Bitte sprechen Sie langsam.", "Ich nehme das Medikament.", "Zum Mitnehmen, bitte."],
        "Bitte sprechen Sie langsam. помогает, если сотрудник говорит слишком быстро.",
        "arbeitsagentur-arbeitssuche",
    ),
]


def seed_jobcenter_quiz(apps, schema_editor):
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene = apps.get_model("lessons", "Scene")

    QuizQuestion.objects.filter(topic_id="jobcenter").delete()
    for prompt_ru, options, explanation_ru, scene_slug in JOBCENTER_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="jobcenter",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_jobcenter_quiz(apps, schema_editor):
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    QuizQuestion.objects.filter(topic_id="jobcenter").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0019_seed_jobcenter_vocabulary"),
    ]

    operations = [
        migrations.RunPython(seed_jobcenter_quiz, unseed_jobcenter_quiz),
    ]
