from django.db import migrations, models


def assign_scene_keys(apps, schema_editor):
    Progress = apps.get_model("lessons", "UserProgress")
    Scene = apps.get_model("lessons", "Scene")
    alias = schema_editor.connection.alias
    for progress in Progress.objects.using(alias).all().iterator():
        scene = Scene.objects.using(alias).filter(pk=progress.scene_id).first() if progress.scene_id else None
        if scene is None:
            scene = Scene.objects.using(alias).filter(
                category__slug=progress.topic_id, category__is_published=True, is_published=True,
            ).order_by("topic_id", "title", "id").first()
        # Historic topic completion maps to one scene, never the whole topic.
        progress.scene_id = scene.pk if scene else None
        progress.scene_key = scene.slug if scene else f"fallback:{progress.topic_id}"
        progress.save(using=alias, update_fields=["scene", "scene_key"])


class Migration(migrations.Migration):
    dependencies = [("lessons", "0013_quizattempt_submission_keys")]
    operations = [
        migrations.AddField(
            model_name="userprogress", name="scene_key",
            field=models.CharField(default="", max_length=160), preserve_default=False,
        ),
        migrations.RunPython(assign_scene_keys, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(name="userprogress", unique_together={("user", "topic_id", "scene_key")}),
    ]
