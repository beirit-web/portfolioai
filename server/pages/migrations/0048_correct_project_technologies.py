from django.db import migrations


# Verified against the current applications, including integrated learning modules.
TECHNOLOGIES = {
    "sprachdienstleistungen": "Python, JavaScript, TypeScript, React, Django, HTML, CSS, Tailwind CSS, Sass, SQLite, Vite",
    "online-shop": "Python, JavaScript, Django, HTML, CSS, SQLite",
    "vertragsgenerator": "Python, JavaScript, Django, HTML, CSS",
    "wohnungssuche-bodensee": "Python, JavaScript, React, Django, HTML, CSS, SQLite, Vite",
    "notenrechner": "TypeScript, React, HTML, CSS, Tailwind CSS, Sass, Vite",
    "enbt-botanic": "Python, JavaScript, Django, HTML, CSS, SQLite, iNaturalist API, Open-Meteo API",
    "deutschlive": "Python, TypeScript, React, Django, HTML, CSS, Tailwind CSS, Sass, SQLite, Vite",
    "vokabelbox": "JavaScript, HTML, CSS",
    "musikplayer": "JavaScript, HTML, CSS, Web Audio API",
    "wetter": "Python, JavaScript, Django, HTML, CSS, Open-Meteo API",
}


def forwards(apps, schema_editor):
    projects = apps.get_model("pages", "Project").objects.using(schema_editor.connection.alias)
    for slug, technologies in TECHNOLOGIES.items():
        projects.filter(slug=slug).update(technologies=technologies)


class Migration(migrations.Migration):
    dependencies = [("pages", "0047_integrate_deutschlive_into_language_platform")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
