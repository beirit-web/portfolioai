from django.db import migrations


OLD_URLS = (
    "/static/portfolio/wohnungssuche",
    "/static/portfolio/wohnungssuche/",
    "/static/portfolio/wohnungssuche/index.html",
)


def forwards(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.using(schema_editor.connection.alias).filter(
        slug="wohnungssuche-bodensee", live_url__in=OLD_URLS,
    ).update(live_url="/wohnungssuche/")


class Migration(migrations.Migration):
    dependencies = [("pages", "0054_profile_email_verification_pending")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
