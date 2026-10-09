from datetime import date, time

from django.db import migrations


def january_entries():
    """Fictional appointments for the public portfolio; no client records."""
    return [
        {
            "date": date(2026, 1, 6),
            "start": time(9, 0),
            "end": time(10, 0),
            "subject": "Demo-Termin",
            "username": "Erika Beispiel",
            "location": "Musterstadt",
            "note": "Fiktiver Termin, Musterstraße 1.",
        },
        {
            "date": date(2026, 1, 7),
            "start": time(14, 0),
            "end": time(15, 0),
            "subject": "Demo-Besprechung",
            "username": "Max Mustermann",
            "location": "Beispielstadt",
            "note": "Fiktive Besprechung für die Portfolio-Demo.",
        },
    ]


def add_january_2026_appointments(apps, schema_editor):
    Appointment = apps.get_model("pages", "Appointment")
    for entry in january_entries():
        exists = Appointment.objects.filter(
            date=entry["date"],
            start_time=entry["start"],
            username=entry["username"],
            subject=entry["subject"],
        ).exists()
        if exists:
            continue
        Appointment.objects.create(
            date=entry["date"],
            start_time=entry["start"],
            end_time=entry["end"],
            subject=entry["subject"] or "Belegt",
            username=entry["username"],
            location=entry["location"],
            note=entry["note"],
        )


def remove_january_2026_appointments(apps, schema_editor):
    Appointment = apps.get_model("pages", "Appointment")
    for entry in january_entries():
        Appointment.objects.filter(
            date=entry["date"],
            start_time=entry["start"],
            username=entry["username"],
            subject=entry["subject"],
        ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0005_auto_20260101_2018"),
    ]

    operations = [
        migrations.RunPython(
            code=add_january_2026_appointments,
            reverse_code=remove_january_2026_appointments,
        ),
    ]
