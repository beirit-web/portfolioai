from datetime import timedelta

from django import forms
from django.utils import timezone

from .models import CakeOrder


class QuantityForm(forms.Form):
    quantity = forms.IntegerField(min_value=1, max_value=20, initial=1)


class CheckoutForm(forms.ModelForm):
    request_key = forms.UUIDField(widget=forms.HiddenInput)

    class Meta:
        model = CakeOrder
        fields = ["customer_name", "customer_email", "customer_phone", "delivery_method", "requested_date",
                  "delivery_address", "postal_code", "city", "customer_note"]
        widgets = {
            "customer_name": forms.TextInput(attrs={"autocomplete": "name"}),
            "customer_email": forms.EmailInput(attrs={"autocomplete": "email"}),
            "customer_phone": forms.TextInput(attrs={"type": "tel", "autocomplete": "tel"}),
            "delivery_method": forms.RadioSelect,
            "requested_date": forms.DateInput(format="%Y-%m-%d", attrs={"type": "date"}),
            "delivery_address": forms.TextInput(attrs={"autocomplete": "street-address"}),
            "postal_code": forms.TextInput(attrs={"autocomplete": "postal-code"}),
            "city": forms.TextInput(attrs={"autocomplete": "address-level2"}),
            "customer_note": forms.Textarea(attrs={"rows": 3, "maxlength": 3000}),
        }

    def __init__(self, *args, earliest_date=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.earliest_date = earliest_date or timezone.localdate()
        self.fields["delivery_method"].choices = CakeOrder.DELIVERY_CHOICES
        self.fields["requested_date"].required = True
        self.fields["requested_date"].widget.attrs["min"] = self.earliest_date.isoformat()
        self.fields["requested_date"].widget.attrs["max"] = (timezone.localdate() + timedelta(days=365)).isoformat()
        self.fields["customer_note"].max_length = 3000
        if self.is_bound:
            for name in self.errors:
                if name in self.fields:
                    self.fields[name].widget.attrs.update({"aria-invalid": "true", "aria-describedby": f"id_{name}-errors"})

    def clean(self):
        data = super().clean()
        due = data.get("requested_date")
        if due and not self.earliest_date <= due <= timezone.localdate() + timedelta(days=365):
            self.add_error("requested_date", "Bitte ein Datum ab dem frühesten Termin und innerhalb eines Jahres wählen.")
        if data.get("delivery_method") == CakeOrder.DELIVERY_LOCAL:
            for name in ("delivery_address", "postal_code", "city"):
                if not data.get(name):
                    self.add_error(name, "Für die Lieferung ist diese Angabe erforderlich.")
        if len(data.get("customer_note", "")) > 3000:
            self.add_error("customer_note", "Bitte höchstens 3000 Zeichen eingeben.")
        return data
