from datetime import timedelta

from django import forms
from django.utils import timezone

from .models import Plant
from .care import care_for


class SearchForm(forms.Form):
    q = forms.CharField(label="Pflanze suchen", min_length=2, max_length=80, strip=True,
                        widget=forms.TextInput(attrs={"type": "search", "placeholder": "Name oder botanischer Name", "autocomplete": "off"}))
    page = forms.IntegerField(min_value=1, max_value=20, initial=1, required=False, widget=forms.HiddenInput)


class PlantForm(forms.ModelForm):
    def __init__(self, *args, species=None, **kwargs):
        super().__init__(*args, **kwargs)
        profile = care_for(species) if species else None
        if profile and profile["interval"] and not self.instance.pk and not self.is_bound:
            self.initial["watering_interval"] = profile["interval"]
        if self.is_bound:
            for name in self.errors:
                if name in self.fields:
                    self.fields[name].widget.attrs.update({
                        "aria-invalid": "true", "aria-describedby": f"id_{name}-errors",
                    })

    class Meta:
        model = Plant
        fields = ["nickname", "location", "watering_interval", "next_watering", "paused", "notes"]
        widgets = {
            "nickname": forms.TextInput(attrs={"placeholder": "z. B. Monstera am Fenster"}),
            "location": forms.TextInput(attrs={"placeholder": "z. B. Wohnzimmer"}),
            "watering_interval": forms.NumberInput(attrs={"min": 1, "max": 365}),
            "next_watering": forms.DateInput(format="%Y-%m-%d", attrs={"type": "date"}),
            "notes": forms.Textarea(attrs={"rows": 4, "placeholder": "Topf, Erde, Beobachtungen …"}),
        }

    def clean(self):
        data = super().clean()
        due = data.get("next_watering")
        if not data.get("paused") and not due:
            self.add_error("next_watering", "Bitte einen Termin wählen oder den Gießplan pausieren.")
        if due and not timezone.localdate() - timedelta(days=3650) <= due <= timezone.localdate() + timedelta(days=3650):
            self.add_error("next_watering", "Bitte ein Datum innerhalb der nächsten oder letzten zehn Jahre wählen.")
        return data
