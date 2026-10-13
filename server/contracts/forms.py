from decimal import Decimal

from django import forms
from django.template.loader import render_to_string

from .definitions import OPTIONAL_FIELDS, TEMPLATES


class ContractForm(forms.Form):
    def __init__(self, template_key, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.template_key = template_key
        self.definition = TEMPLATES[template_key]
        for _, _, name, label, kind, placeholder in self.definition["fields"]:
            attrs = {"id": name, "placeholder": placeholder, "autocomplete": "off",
                     "aria-describedby": f"{name}-error"}
            options = {"label": label, "required": name not in OPTIONAL_FIELDS,
                       "error_messages": {"required": "Pflichtfeld"}}
            if kind == "date":
                field = forms.DateField(
                    **options, input_formats=["%Y-%m-%d"],
                    widget=forms.DateInput(format="%Y-%m-%d", attrs={**attrs, "type": "date"}),
                )
            elif kind == "number":
                field = forms.DecimalField(
                    **options, min_value=Decimal("0"), max_digits=12, decimal_places=2,
                    widget=forms.NumberInput(attrs={**attrs, "step": "0.01", "min": "0",
                                                   "aria-label": f"{label} in Euro"}),
                )
            else:
                widget = forms.Textarea if kind == "textarea" else forms.TextInput
                if kind == "textarea":
                    attrs["rows"] = 2
                field = forms.CharField(**options, max_length=5000, widget=widget(attrs=attrs))
            self.fields[name] = field

    def groups(self):
        groups = {}
        for key, label, name, _, kind, _ in self.definition["fields"]:
            group = groups.setdefault(key, {"key": key, "label": label, "fields": []})
            group["fields"].append({"field": self[name], "wide": kind == "textarea",
                                    "kind": kind})
        return list(groups.values())

    def document(self):
        self.is_valid()
        values = {}
        for name, field in self.fields.items():
            value = self.cleaned_data.get(name)
            if isinstance(value, Decimal):
                amount = f"{value:,.2f}".translate(str.maketrans({",": ".", ".": ","}))
                value = f"{amount} €"
            elif isinstance(field, forms.DateField) and value is not None:
                value = value.strftime("%d.%m.%Y")
            values[name] = value or ""

        return render_to_string(f"contracts/documents/{self.template_key}.txt", values).strip()

    def validation(self):
        self.is_valid()
        errors = {name: [str(message) for message in messages]
                  for name, messages in self.errors.items()}
        invalid = [name for name, items in self.errors.as_data().items()
                   if any(item.code != "required" for item in items)]
        return {"errors": errors, "invalidFields": invalid, "complete": not errors}
