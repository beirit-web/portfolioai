from django.db import migrations


ARZT_QUIZ = [
    (
        "Что означает: „Ich brauche einen Termin“?",
        ["Мне нужен приём.", "У меня есть рецепт.", "Я жду в аптеке."],
        "Так можно спокойно попросить запись к врачу.",
        "arzt-termin-vereinbaren",
    ),
    (
        "Как сказать на регистрации: «У меня приём в 10 часов»?",
        ["Ich habe einen Termin um 10 Uhr.", "Ich habe Schmerzen um 10 Uhr.", "Ich bin die Gesundheitskarte."],
        "Ich habe einen Termin um ... — безопасная фраза на стойке регистрации.",
        "arzt-anmeldung",
    ),
    (
        "Что спрашивает врач фразой „Seit wann?“",
        ["С какого времени?", "Где болит?", "Как вас зовут?"],
        "Seit wann? — вопрос о том, как давно есть проблема.",
        "arzt-symptome-beschreiben",
    ),
    (
        "Как коротко сказать: «У меня нет температуры»?",
        ["Ich habe kein Fieber.", "Ich habe keine Praxis.", "Ich bin nicht akut."],
        "Kein Fieber значит: нет температуры.",
        "arzt-symptome-beschreiben",
    ),
    (
        "Что значит „Der Schmerz ist mittel“?",
        ["Боль средняя.", "Боль здесь.", "Боли нет."],
        "Mittel — средний уровень боли между leicht и stark.",
        "arzt-schmerzen-einordnen",
    ),
    (
        "Какая фраза подходит, если вы не поняли врача?",
        ["Können Sie das bitte wiederholen?", "Das macht 5 Euro 40.", "Zum Mitnehmen, bitte."],
        "Können Sie das bitte wiederholen? — вежливая просьба повторить.",
        "arzt-nachfragen",
    ),
]


def seed_arzt_quiz(apps, schema_editor):
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    Scene = apps.get_model("lessons", "Scene")

    QuizQuestion.objects.filter(topic_id="arzt").delete()
    for prompt_ru, options, explanation_ru, scene_slug in ARZT_QUIZ:
        QuizQuestion.objects.create(
            scene=Scene.objects.filter(slug=scene_slug).first(),
            topic_id="arzt",
            question_type="choice",
            prompt_ru=prompt_ru,
            options=options,
            correct_answer=options[0],
            explanation_ru=explanation_ru,
            points=1,
            is_active=True,
        )


def unseed_arzt_quiz(apps, schema_editor):
    QuizQuestion = apps.get_model("lessons", "QuizQuestion")
    QuizQuestion.objects.filter(topic_id="arzt").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0015_seed_arzt_vocabulary_exercises"),
    ]

    operations = [
        migrations.RunPython(seed_arzt_quiz, unseed_arzt_quiz),
    ]
