from django.db import migrations


RENAMES = {
    "live_url": {
        "/static/portfolio/test-main/index.html": "/static/portfolio/notenrechner/index.html",
    },
    "image_url": {
        "/static/images/portfolio-test-main-desktop.webp": "/static/images/portfolio-notenrechner-desktop.webp",
        "/static/images/portfolio-vertragsgenerator-main-desktop.webp": "/static/images/portfolio-vertragsgenerator-desktop.webp",
        "/static/images/portfolio-vokabelbox-main-desktop.webp": "/static/images/portfolio-vokabelbox-desktop.webp",
    },
}


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    for field, values in RENAMES.items():
        for old, new in values.items():
            projects.filter(**{field: old}).update(**{field: new})


class Migration(migrations.Migration):
    dependencies = [("pages", "0050_refresh_portfolio_case_studies")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
