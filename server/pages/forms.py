from django import forms
from django.conf import settings
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User
from django.db import IntegrityError, models
from django.utils import timezone

from .models import (
  AccountDocument,
  Appointment,
  CallbackRequest,
  InterpreterApplication,
  Profile,
  UnavailableDay,
)


class ContactRequestForm(forms.Form):
  """
  Öffentliches Kontaktformular für Fragen und beruflichen Austausch.
  """

  name = forms.CharField(
    label="Name",
    max_length=120,
    widget=forms.TextInput(
      attrs={
        "autocomplete": "name",
        "placeholder": "Ihr Name",
      }
    ),
  )
  email = forms.EmailField(
    label="E-Mail-Adresse",
    widget=forms.EmailInput(
      attrs={
        "autocomplete": "email",
        "inputmode": "email",
        "placeholder": "name@example.com",
      }
    ),
  )
  subject = forms.CharField(
    label="Betreff",
    max_length=160,
    widget=forms.TextInput(attrs={"placeholder": "Worum geht es?"}),
  )
  message = forms.CharField(
    label="Nachricht",
    max_length=4000,
    widget=forms.Textarea(
      attrs={
        "rows": 7,
        "placeholder": "Ihre Nachricht oder Frage zu einem Projekt.",
      }
    ),
  )
  privacy_consent = forms.BooleanField(
    label="Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden.",
    required=True,
    error_messages={
      "required": "Bitte bestätigen Sie den Datenschutzhinweis.",
    },
  )
  company = forms.CharField(
    required=False,
    widget=forms.TextInput(
      attrs={
        "autocomplete": "off",
        "tabindex": "-1",
        "aria-hidden": "true",
      }
    ),
  )

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    for field in self.fields.values():
      field.widget.attrs.setdefault("class", "home-contact-form__control")
    self.fields["privacy_consent"].widget.attrs["class"] = "home-contact-form__checkbox"
    self.fields["company"].widget.attrs["class"] = "home-contact-form__honeypot"

  def clean_company(self):
    value = (self.cleaned_data.get("company") or "").strip()
    if value:
      raise forms.ValidationError("Anfrage konnte nicht verarbeitet werden.")
    return value


class RegistrationForm(UserCreationForm):
  """
  Registrierungsformular mit E-Mail als Benutzername.
  """

  email = forms.EmailField(label="E-Mail", required=True)
  image = forms.ImageField(label="Profilbild (optional)", required=False)
  privacy_consent = forms.BooleanField(
    label="Datenschutz-Zustimmung",
    required=True,
    error_messages={
      "required": "Bitte bestätigen Sie die Datenschutz-Zustimmung.",
    },
  )
  PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
  PROFILE_IMAGE_ALLOWED_TYPES = {"image/jpeg", "image/png"}

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # Nutzer:innen sollen keinen separaten Benutzernamen eingeben müssen.
    self.fields.pop("username", None)
    # Autocomplete für Usability/Accessibility setzen.
    self.fields["email"].widget.attrs.update(
      {
        "autocomplete": "email",
        "inputmode": "email",
        "spellcheck": "false",
        "autocapitalize": "none",
        "autocorrect": "off",
        "placeholder": "name@example.com",
        "autofocus": True,
      }
    )
    self.fields["password1"].widget.attrs.update(
      {
        "autocomplete": "new-password",
        "placeholder": "Mindestens 8 Zeichen",
        "minlength": 8,
      }
    )
    self.fields["password2"].widget.attrs.update(
      {
        "autocomplete": "new-password",
        "placeholder": "Passwort wiederholen",
        "minlength": 8,
      }
    )
    self.fields["image"].widget.attrs.update(
      {
        "accept": "image/png,image/jpeg",
        "data-file-input": "profile",
        "class": "file-input-hidden",
      }
    )
    self.fields["privacy_consent"].widget.attrs.update(
      {
        "class": "template-consent__checkbox",
      }
    )
    self.fields["password1"].help_text = (
      "Mindestens 8 Zeichen. Bitte keine leicht erratbaren Angaben wie Ihren Namen oder Ihre E-Mail-Adresse verwenden."
    )
    self.fields["password2"].help_text = (
      "Bitte geben Sie dasselbe Passwort zur Bestätigung noch einmal ein."
    )

  class Meta:
    model = User
    fields = ("email", "password1", "password2")

  def clean_email(self):
    email = (self.cleaned_data.get("email") or "").strip().lower()
    if not email:
      raise forms.ValidationError("Bitte eine gültige E-Mail eingeben.")
    if len(email) > User._meta.get_field("username").max_length:
      raise forms.ValidationError("E-Mail ist zu lang für das Benutzerkonto.")
    if User.objects.filter(email__iexact=email).exists():
      raise forms.ValidationError("Diese E-Mail wird bereits verwendet.")
    if User.objects.filter(username__iexact=email).exists():
      raise forms.ValidationError("Diese E-Mail wird bereits verwendet.")
    return email

  def clean_image(self):
    image = self.cleaned_data.get("image")
    if not image:
      return image

    content_type = str(getattr(image, "content_type", "") or "").lower()
    if content_type and content_type not in self.PROFILE_IMAGE_ALLOWED_TYPES:
      raise forms.ValidationError("Bitte nur JPG oder PNG als Profilbild hochladen.")

    if getattr(image, "size", 0) > self.PROFILE_IMAGE_MAX_BYTES:
      raise forms.ValidationError("Das Profilbild darf maximal 5 MB groß sein.")

    return image

  def clean(self):
    cleaned = super().clean()
    email = (cleaned.get("email") or "").strip().lower()
    if email:
      # Setze Instanzwerte, bevor ModelForm validation läuft.
      self.instance.username = email
      self.instance.email = email
      cleaned["email"] = email
      self.cleaned_data["email"] = email
    return cleaned

  def save(self, commit=True):
    email = (self.cleaned_data.get("email") or "").strip().lower()
    user = super().save(commit=False)
    user.username = email or user.username
    user.email = email
    user.is_active = False
    if commit:
      try:
        user.save()
      except IntegrityError:
        # Falls ein Rennen um den Username/E-Mail passiert.
        raise forms.ValidationError("Diese E-Mail wird bereits verwendet.")
      except Exception:
        # Unerwarteter DB-Fehler (z. B. DB down).
        raise forms.ValidationError(
          "Registrierung gerade nicht möglich. Bitte später erneut versuchen."
        )
      # Profildaten persistieren, sobald der User gespeichert ist.
      image = self.cleaned_data.get("image")
      profile, _ = Profile.objects.get_or_create(user=user)
      profile.privacy_consent_at = timezone.now()
      profile.privacy_consent_version = getattr(settings, "PRIVACY_CONSENT_VERSION", "")
      profile.privacy_consent_source = "registration"
      if image:
        profile.image_data = None
        profile.image_data = image.read()
        profile.image_mime = getattr(image, "content_type", "") or ""
        profile.image_name = getattr(image, "name", "") or ""
      else:
        profile.image_data = None
        profile.image_mime = ""
        profile.image_name = ""
      profile.save()
    return user


class LoginForm(AuthenticationForm):
  username = forms.EmailField(
    label="E-Mail-Adresse",
    widget=forms.EmailInput(
      attrs={
        "autocomplete": "email",
        "inputmode": "email",
        "spellcheck": "false",
        "placeholder": "ihre-email@beispiel.com",
        "required": True,
      }
    ),
  )
  password = forms.CharField(
    label="Passwort",
    widget=forms.PasswordInput(
      attrs={
        "autocomplete": "current-password",
        "placeholder": "Ihr Passwort",
        "required": True,
      }
    ),
  )
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields["username"].widget.attrs.update(
      {
        "autocapitalize": "none",
        "autocorrect": "off",
        "autofocus": True,
      }
    )
    if not self.is_bound and self.request:
      email = (self.request.GET.get("email") or "").strip().lower()
      if email:
        self.initial.setdefault("username", email)

  def clean(self):
    username = (self.cleaned_data.get("username") or self.data.get("username") or "").strip().lower()
    password = self.cleaned_data.get("password") or self.data.get("password") or ""
    if username and password:
      user = User.objects.filter(
        models.Q(email__iexact=username) | models.Q(username__iexact=username)
      ).first()
      if user and not user.is_active and user.check_password(password):
        raise forms.ValidationError(
          "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse über den Link in der Bestätigungs-E-Mail."
        )
    return super().clean()


class UserAccountForm(forms.ModelForm):
  email = forms.EmailField(label="E-Mail", required=True)
  first_name = forms.CharField(label="Vorname", required=False, max_length=150)
  last_name = forms.CharField(label="Nachname", required=False, max_length=150)

  class Meta:
    model = User
    fields = ("first_name", "last_name", "email")

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields["first_name"].widget.attrs.update({"autocomplete": "given-name"})
    self.fields["last_name"].widget.attrs.update({"autocomplete": "family-name"})
    self.fields["email"].widget.attrs.update({"autocomplete": "email", "inputmode": "email"})

  def clean_first_name(self):
    return (self.cleaned_data.get("first_name") or "").strip()

  def clean_last_name(self):
    return (self.cleaned_data.get("last_name") or "").strip()

  def clean_email(self):
    email = (self.cleaned_data.get("email") or "").strip().lower()
    if not email:
      raise forms.ValidationError("Bitte eine gültige E-Mail eingeben.")
    if len(email) > User._meta.get_field("username").max_length:
      raise forms.ValidationError("E-Mail ist zu lang für das Benutzerkonto.")
    existing = User.objects.filter(models.Q(email__iexact=email) | models.Q(username__iexact=email)).exclude(pk=self.instance.pk)
    if existing.exists():
      raise forms.ValidationError("Diese E-Mail wird bereits verwendet.")
    return email

  def save(self, commit=True):
    user = super().save(commit=False)
    user.first_name = self.cleaned_data.get("first_name", "")
    user.last_name = self.cleaned_data.get("last_name", "")
    user.email = self.cleaned_data["email"]
    user.username = self.cleaned_data["email"]
    if commit:
      user.save()
    return user


class ProfileImageForm(forms.Form):
  image = forms.ImageField(label="Profilbild (optional)", required=False)
  remove_image = forms.BooleanField(label="Aktuelles Profilbild entfernen", required=False)

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields["image"].widget.attrs.update(
      {
        "accept": "image/*",
      }
    )


class AccountDocumentForm(forms.ModelForm):
  file = forms.FileField(label="Datei", required=True)
  MAX_FILE_BYTES = 10 * 1024 * 1024
  ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }

  class Meta:
    model = AccountDocument
    fields = ("title", "note")
    widgets = {
      "note": forms.Textarea(attrs={"rows": 3, "placeholder": "Optional: Worum geht es in dieser Datei?"}),
    }

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields["title"].required = False
    self.fields["title"].widget.attrs.update(
      {"placeholder": "z. B. Schreiben vom Jobcenter"}
    )
    self.fields["file"].widget.attrs.update(
      {
        "accept": ".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx",
      }
    )

  def clean_title(self):
    return (self.cleaned_data.get("title") or "").strip()

  def clean_note(self):
    return (self.cleaned_data.get("note") or "").strip()

  def clean_file(self):
    uploaded = self.cleaned_data.get("file")
    if not uploaded:
      return uploaded
    content_type = str(getattr(uploaded, "content_type", "") or "").lower()
    if content_type and content_type not in self.ALLOWED_TYPES:
      raise forms.ValidationError(
        "Bitte nur PDF, JPG, PNG, WEBP, TXT, DOC oder DOCX hochladen."
      )
    if getattr(uploaded, "size", 0) > self.MAX_FILE_BYTES:
      raise forms.ValidationError("Die Datei darf maximal 10 MB groß sein.")
    return uploaded


class AccountMailboxForm(forms.Form):
  text = forms.CharField(
    label="Nachricht",
    widget=forms.Textarea(
      attrs={
        "rows": 4,
        "placeholder": "Schreiben Sie hier Ihre Nachricht oder Rückfrage.",
      }
    ),
  )

  def clean_text(self):
    text = (self.cleaned_data.get("text") or "").strip()
    if len(text) < 3:
      raise forms.ValidationError("Bitte mindestens 3 Zeichen eingeben.")
    return text


class CallbackRequestForm(forms.ModelForm):
  class Meta:
    model = CallbackRequest
    fields = ("phone", "time_windows", "note")
    widgets = {
      "phone": forms.TextInput(attrs={"placeholder": "z. B. +49 151 12345678"}),
      "time_windows": forms.Textarea(
        attrs={
          "rows": 3,
          "placeholder": "z. B. Montag bis Donnerstag 9-12 Uhr oder Mittwoch ab 15 Uhr",
        }
      ),
      "note": forms.Textarea(
        attrs={
          "rows": 3,
          "placeholder": "Optional: Thema, Dringlichkeit oder gewünschte Kontaktart",
        }
      ),
    }

  def clean_phone(self):
    phone = (self.cleaned_data.get("phone") or "").strip()
    if len(phone) < 6:
      raise forms.ValidationError("Bitte eine erreichbare Rückrufnummer angeben.")
    return phone

  def clean_time_windows(self):
    value = (self.cleaned_data.get("time_windows") or "").strip()
    if len(value) < 5:
      raise forms.ValidationError("Bitte verfügbare Zeiten etwas genauer angeben.")
    return value

  def clean_note(self):
    return (self.cleaned_data.get("note") or "").strip()


class NotificationPreferencesForm(forms.ModelForm):
  class Meta:
    model = Profile
    fields = (
      "callback_phone",
      "callback_time_windows",
      "notify_new_reply",
      "notify_new_message",
      "notify_appointment_changes",
    )
    widgets = {
      "callback_phone": forms.TextInput(
        attrs={"placeholder": "Optional: Standardnummer für Rückrufe"}
      ),
      "callback_time_windows": forms.Textarea(
        attrs={
          "rows": 3,
          "placeholder": "Optional: übliche Zeiten, zu denen Sie erreichbar sind",
        }
      ),
    }

  def clean_callback_phone(self):
    return (self.cleaned_data.get("callback_phone") or "").strip()

  def clean_callback_time_windows(self):
    return (self.cleaned_data.get("callback_time_windows") or "").strip()


class InterpreterApplicationForm(forms.ModelForm):
  """
  Bewerbung als Dolmetscher:in – reduziert auf die wichtigsten Felder.
  """

  image = forms.ImageField(label="Profilfoto (optional)", required=False)

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields["display_name"].widget.attrs.update(
      {
        "placeholder": "z. B. Anna Petrova Dolmetschservice",
        "autocomplete": "organization",
      }
    )
    self.fields["languages"].widget.attrs.update(
      {
        "placeholder": "z. B. Deutsch, Russisch, Ukrainisch",
        "autocomplete": "off",
        "spellcheck": "false",
      }
    )
    self.fields["region"].widget.attrs.update(
      {
        "placeholder": "z. B. Berlin oder NRW",
        "autocomplete": "address-level1",
      }
    )
    self.fields["specialization"].widget.attrs.update(
      {
        "placeholder": "z. B. Medizin, Behörden, Schule",
        "autocomplete": "off",
      }
    )
    self.fields["experience"].widget.attrs.update(
      {
        "placeholder": "z. B. 5 Jahre, BA Sprachmittlung, Gerichtserfahrung",
        "autocomplete": "off",
      }
    )
    self.fields["availability"].widget.attrs.update(
      {
        "placeholder": "z. B. Mo-Fr 9-17 Uhr, kurzfristig möglich",
        "autocomplete": "off",
      }
    )
    self.fields["motivation"].widget.attrs.update(
      {
        "placeholder": "Beschreiben Sie kurz Ihre Erfahrung, Einsatzbereiche und was Auftraggeber:innen über Sie wissen sollten.",
      }
    )
    self.fields["image"].widget.attrs.update(
      {
        "class": "apply-file-input",
        "accept": "image/*",
      }
    )

  class Meta:
    model = InterpreterApplication
    fields = ["display_name", "languages", "region", "specialization", "experience", "motivation", "availability", "image"]
    widgets = {
      "motivation": forms.Textarea(attrs={"rows": 4}),
    }


class AppointmentQuickForm(forms.ModelForm):
  """
  Schneller Eintrag für belegte Zeitfenster im Dolmetscher-Kalender.
  """

  class Meta:
    model = Appointment
    fields = ["date", "start_time", "end_time", "subject", "note"]
    widgets = {
      "date": forms.DateInput(attrs={"type": "date", "required": True}),
      "start_time": forms.TimeInput(attrs={"type": "time"}),
      "end_time": forms.TimeInput(attrs={"type": "time"}),
      "subject": forms.TextInput(attrs={"placeholder": "z. B. Kundentermin"}),
      "note": forms.Textarea(attrs={"rows": 2, "placeholder": "Optional: Hinweis für Sie"}),
    }

  def clean(self):
    cleaned = super().clean()
    start = cleaned.get("start_time")
    end = cleaned.get("end_time")
    if start and end and end <= start:
      raise forms.ValidationError("Ende muss nach Beginn liegen.")
    if end and not start:
      raise forms.ValidationError("Beginn wird benötigt, wenn ein Ende gesetzt ist.")
    return cleaned


class UnavailableDayForm(forms.ModelForm):
  """
  Ganztägige Sperre (Urlaub, Fortbildung, etc.).
  """

  class Meta:
    model = UnavailableDay
    fields = ["date", "note"]
    widgets = {
      "date": forms.DateInput(attrs={"type": "date", "required": True, "id": "id_unavail_date"}),
      "note": forms.TextInput(attrs={"placeholder": "Optionaler Hinweis", "id": "id_unavail_note"}),
    }
