from django import forms
from django.conf import settings
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User
from django.db import IntegrityError, models
from django.utils import timezone

from .models import Profile


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
