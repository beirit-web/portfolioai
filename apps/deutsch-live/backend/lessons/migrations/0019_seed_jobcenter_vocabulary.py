from django.db import migrations


JOBCENTER_VOCABULARY = [
    ("der Termin", "термин / назначенное время", "Ich habe heute einen Termin.", "Не путать с Arzttermin: слово Termin подходит везде."),
    ("der Antrag", "заявление / формуляр", "Hier ist der Antrag.", "Antrag часто означает заполненный формуляр."),
    ("die Unterlagen", "документы к делу", "Ich moechte diese Unterlagen abgeben.", "Unterlagen — бумаги, не учреждение."),
    ("die Kopie", "копия", "Es fehlt noch eine Kopie.", "Часто просят Kopie vom Mietvertrag или Pass."),
    ("der Mietvertrag", "договор аренды", "Hier ist die Kopie vom Mietvertrag.", "Mietvertrag нужен для жилья и расходов."),
    ("die Rueckfrage", "дополнительный вопрос", "Ich habe eine Rueckfrage.", "Rueckfrage — когда нужно уточнить."),
    ("fehlen", "не хватать", "Welche Unterlagen fehlen?", "Es fehlt ... значит: чего-то не хватает."),
    ("abgeben", "сдать / передать", "Ich moechte den Antrag abgeben.", "Abgeben используют для документов."),
    ("bringen", "принести", "Kann ich die Kopie morgen bringen?", "Подходит, если документа сейчас нет."),
    ("wiederholen", "повторить", "Koennen Sie das bitte wiederholen?", "Безопасная фраза, если вы не поняли."),
    ("langsam", "медленно", "Bitte sprechen Sie langsam.", "Очень полезно в учреждении."),
    ("das Jobcenter", "Jobcenter", "Ich habe einen Termin beim Jobcenter.", "Jobcenter обычно связан с Bürgergeld и документами."),
    ("die Agentur für Arbeit", "Agentur für Arbeit", "Ich habe einen Termin bei der Agentur für Arbeit.", "Agentur für Arbeit связана с работой, регистрацией безработицы и ALG I."),
    ("das Bürgergeld", "Bürgergeld", "Ich habe eine Frage zum Bürgergeld.", "Bürgergeld относится к Jobcenter."),
    ("das Arbeitslosengeld I", "пособие по безработице ALG I", "Ich habe eine Frage zum Arbeitslosengeld I.", "ALG I обычно тема Agentur für Arbeit."),
    ("arbeitslos gemeldet", "зарегистрирован как безработный", "Sind Sie schon arbeitslos gemeldet?", "Фраза про официальную регистрацию."),
    ("die Arbeitssuche", "поиск работы", "Ich brauche Hilfe bei der Arbeitssuche.", "Нейтральная фраза для консультации."),
    ("die Daten", "данные", "Wir klaeren zuerst Ihre Daten.", "Daten — имя, адрес, контакт и другие данные."),
    ("die Adresse", "адрес", "Meine Adresse hat sich geaendert.", "Адрес часто нужно сообщать отдельно."),
    ("das Schreiben", "письмо / официальный документ", "Ich habe ein Schreiben bekommen.", "Schreiben — письмо от учреждения."),
    ("die Frist", "срок", "Wann ist die Frist?", "Frist — до какого числа нужно ответить."),
    ("der Bescheid", "официальное решение", "Ich habe einen Bescheid bekommen.", "Bescheid — официальное решение по делу."),
]


def seed_jobcenter_vocabulary(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Scene = apps.get_model("lessons", "Scene")
    Vocabulary = apps.get_model("lessons", "Vocabulary")

    category = Category.objects.filter(slug="jobcenter").first()
    if category is None:
        return
    default_scene = Scene.objects.filter(slug="jobcenter-unterlagen-abgeben").first()

    Vocabulary.objects.filter(category=category).delete()
    for order, (word_de, translation_ru, example_de, note_ru) in enumerate(JOBCENTER_VOCABULARY, start=1):
        Vocabulary.objects.create(
            category=category,
            scene=default_scene,
            word_de=word_de,
            translation_ru=translation_ru,
            example_de=example_de,
            note_ru=note_ru,
            order=order,
            is_published=True,
        )


def unseed_jobcenter_vocabulary(apps, schema_editor):
    Category = apps.get_model("lessons", "Category")
    Vocabulary = apps.get_model("lessons", "Vocabulary")
    category = Category.objects.filter(slug="jobcenter").first()
    if category:
        Vocabulary.objects.filter(category=category, word_de__in=[item[0] for item in JOBCENTER_VOCABULARY]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lessons", "0018_seed_jobcenter_scenes"),
    ]

    operations = [
        migrations.RunPython(seed_jobcenter_vocabulary, unseed_jobcenter_vocabulary),
    ]
