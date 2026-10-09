from django.db import migrations


def restore_featured_selection(apps, schema_editor):
    Project = apps.get_model("pages", "Project")
    Project.objects.filter(slug="deutschlive").update(featured=True)
    Project.objects.filter(slug="wohnungssuche-bodensee").update(featured=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0036_seed_portfolio_projects"),
    ]

    operations = [
        migrations.RunPython(restore_featured_selection, noop_reverse),
    ]
