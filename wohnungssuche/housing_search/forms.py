from django import forms

from .models import ApplicantProfile, ContactLog, ListingStatus, SearchProfile


CITY_CHOICES = [
    ("Friedrichshafen", "Friedrichshafen"),
    ("Konstanz", "Konstanz"),
    ("Lindau", "Lindau"),
    ("Ravensburg", "Ravensburg"),
    ("Ueberlingen", "Ueberlingen"),
    ("Meersburg", "Meersburg"),
    ("Tettnang", "Tettnang"),
    ("Markdorf", "Markdorf"),
    ("Meckenbeuren", "Meckenbeuren"),
]


class SearchProfileForm(forms.ModelForm):
    cities = forms.MultipleChoiceField(
        choices=CITY_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="Staedte",
    )

    class Meta:
        model = SearchProfile
        fields = [
            "name",
            "region",
            "cities",
            "min_rent",
            "max_rent",
            "min_rooms",
            "max_rooms",
            "min_size",
            "max_size",
            "property_type",
            "pets_allowed",
            "balcony",
            "garden",
            "elevator",
            "barrier_free",
            "max_distance_km",
            "is_active",
        ]
        labels = {
            "name": "Name",
            "region": "Region",
            "min_rent": "Minimale Warmmiete",
            "max_rent": "Maximale Warmmiete",
            "min_rooms": "Minimale Zimmer",
            "max_rooms": "Maximale Zimmer",
            "min_size": "Minimale Wohnflaeche",
            "max_size": "Maximale Wohnflaeche",
            "property_type": "Immobilientyp",
            "pets_allowed": "Haustiere erlaubt",
            "balcony": "Balkon",
            "garden": "Garten",
            "elevator": "Aufzug",
            "barrier_free": "Barrierefrei",
            "max_distance_km": "Maximaler Umkreis in km",
            "is_active": "Aktiv",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.initial["cities"] = self.instance.city_list()
        else:
            self.initial.setdefault("region", "Bodensee")
            self.initial.setdefault("cities", ["Friedrichshafen", "Konstanz", "Ravensburg"])

    def clean_cities(self):
        return ",".join(self.cleaned_data["cities"])


class ListingStatusForm(forms.ModelForm):
    class Meta:
        model = ListingStatus
        fields = ["status", "notes"]
        labels = {"status": "Status", "notes": "Notizen"}
        widgets = {"notes": forms.Textarea(attrs={"rows": 5})}


class ContactLogForm(forms.ModelForm):
    class Meta:
        model = ContactLog
        fields = ["contact_name", "phone", "email", "message", "contact_date", "next_follow_up"]
        labels = {
            "contact_name": "Kontaktperson",
            "phone": "Telefon",
            "email": "E-Mail",
            "message": "Nachricht / Verlauf",
            "contact_date": "Kontaktzeitpunkt",
            "next_follow_up": "Naechste Erinnerung",
        }
        widgets = {
            "contact_date": forms.DateTimeInput(attrs={"type": "datetime-local"}),
            "next_follow_up": forms.DateInput(attrs={"type": "date"}),
            "message": forms.Textarea(attrs={"rows": 4}),
        }


class ApplicantProfileForm(forms.ModelForm):
    class Meta:
        model = ApplicantProfile
        fields = [
            "full_name",
            "phone",
            "email",
            "current_city",
            "occupation",
            "income",
            "persons_count",
            "pets",
            "smoking",
            "schufa_available",
            "documents_available",
            "short_intro",
        ]
        labels = {
            "full_name": "Vollstaendiger Name",
            "phone": "Telefon",
            "email": "E-Mail",
            "current_city": "Aktueller Wohnort",
            "occupation": "Beruf / Taetigkeit",
            "income": "Nettoeinkommen",
            "persons_count": "Einziehende Personen",
            "pets": "Haustiere",
            "smoking": "Raucher",
            "schufa_available": "SCHUFA vorhanden",
            "documents_available": "Unterlagen vorbereitet",
            "short_intro": "Kurzvorstellung",
        }
        widgets = {"short_intro": forms.Textarea(attrs={"rows": 5})}
