from django.db import migrations


def create_learning_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    QuizAttempt = apps.get_model("lessons", "QuizAttempt")
    BotExchange = apps.get_model("lessons", "BotExchange")
    UserProfile = apps.get_model("lessons", "UserProfile")

    learner, _ = Group.objects.get_or_create(name="learner")
    mentor, _ = Group.objects.get_or_create(name="mentor")
    content_manager, _ = Group.objects.get_or_create(name="content_manager")

    quiz_type = ContentType.objects.get_for_model(QuizAttempt)
    bot_type = ContentType.objects.get_for_model(BotExchange)
    profile_type = ContentType.objects.get_for_model(UserProfile)

    mentor_permissions = Permission.objects.filter(
        content_type__in=[quiz_type, bot_type, profile_type],
        codename__startswith="view_",
    )
    mentor.permissions.add(*mentor_permissions)

    content_permissions = Permission.objects.filter(
        content_type__in=[quiz_type, bot_type, profile_type],
        codename__in=[
            "view_quizattempt",
            "change_quizattempt",
            "view_botexchange",
            "change_botexchange",
            "view_userprofile",
            "change_userprofile",
            "view_all_quiz_results",
        ],
    )
    content_manager.permissions.add(*content_permissions)

    learner.permissions.clear()


class Migration(migrations.Migration):
    dependencies = [
        ("lessons", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_learning_roles, migrations.RunPython.noop),
    ]
