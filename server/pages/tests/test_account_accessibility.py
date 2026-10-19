"""Account fields describe the visible help and validation messages beside them."""

from collections import Counter
from html.parser import HTMLParser

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class AccountFormDocument(HTMLParser):
    def __init__(self, response):
        super().__init__()
        self.inputs = {}
        self.ids = Counter()
        self.text = {}
        self._stack = []
        self.feed(response.content.decode())

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        element_id = attributes.get("id")
        if element_id:
            self.ids[element_id] += 1
            self.text.setdefault(element_id, [])
        if tag == "input" and attributes.get("name"):
            self.inputs[attributes["name"]] = attributes
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self._stack.append((tag, element_id))

    def handle_endtag(self, tag):
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                del self._stack[index:]
                break

    def handle_data(self, data):
        for _, element_id in self._stack:
            if element_id:
                self.text[element_id].append(data)


@override_settings(
    LOGIN_REQUIRED=True,
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    AUTH_PASSWORD_VALIDATORS=[{
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    }],
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class AccountFormAccessibilityTests(TestCase):
    def assert_field_descriptions(self, response, *, invalid=False):
        self.assertEqual(response.status_code, 200)
        form = response.context["form"]
        document = AccountFormDocument(response)
        for field in form.visible_fields():
            with self.subTest(field=field.name):
                attributes = document.inputs[field.html_name]
                described_by = attributes.get("aria-describedby", "").split()
                for target_id in described_by:
                    self.assertEqual(document.ids[target_id], 1, target_id)
                    self.assertTrue("".join(document.text[target_id]).strip(), target_id)
                if field.help_text:
                    self.assertIn(f"{field.auto_id}_helptext", described_by)
                if field.errors:
                    self.assertEqual(attributes.get("aria-invalid"), "true")
                    error_id = f"{field.auto_id}_error"
                    self.assertIn(error_id, described_by)
                    rendered_errors = " ".join(document.text[error_id])
                    for error in field.errors:
                        self.assertIn(str(error), rendered_errors)
                else:
                    self.assertNotIn("aria-invalid", attributes)
        if invalid:
            self.assertTrue(form.errors)
            self.assertContains(response, 'class="form-error" role="alert"')

    def reset_form_path(self):
        user = get_user_model().objects.create_user(
            username="accessible-account@example.test",
            email="accessible-account@example.test",
            password="fictional-accessibility-password-123",
        )
        path = reverse("password_reset_confirm", kwargs={
            "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        })
        response = self.client.get(path)
        self.assertEqual(response.status_code, 302)
        return response["Location"]

    def test_account_forms_reference_their_visible_help(self):
        for route in ("pages:login", "pages:register", "password_reset", "pages:verification_resend"):
            with self.subTest(route=route):
                self.assert_field_descriptions(self.client.get(reverse(route)))

    def test_invalid_account_fields_reference_their_rendered_errors_and_help(self):
        for route in ("pages:login", "pages:register", "password_reset", "pages:verification_resend"):
            with self.subTest(route=route):
                self.assert_field_descriptions(self.client.post(reverse(route), {}), invalid=True)

    def test_invalid_profile_upload_references_the_image_error_and_upload_help(self):
        response = self.client.post(reverse("pages:register"), {
            "email": "accessible-image@example.test",
            "password1": "fictional-accessibility-password-123",
            "password2": "fictional-accessibility-password-123",
            "privacy_consent": "on",
            "image": SimpleUploadedFile("example.png", b"not an image", content_type="image/png"),
        })
        self.assertIn("image", response.context["form"].errors)
        self.assert_field_descriptions(response, invalid=True)

    def test_new_password_fields_reference_visible_policy_and_validation_errors(self):
        path = self.reset_form_path()
        self.assert_field_descriptions(self.client.get(path))
        self.assert_field_descriptions(self.client.post(path, {}), invalid=True)
