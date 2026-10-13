from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from .definitions import OPTIONAL_FIELDS, TEMPLATES
from .forms import ContractForm


class ContractFormTests(SimpleTestCase):
    def test_all_samples_render_dates_prices_and_signatures(self):
        for key, definition in TEMPLATES.items():
            with self.subTest(template=key):
                form = ContractForm(key, definition["sample"])
                self.assertTrue(form.is_valid(), form.errors)
                text = form.document()
                self.assertIn("Unterschrift", text)
                self.assertNotIn("________________ EUR", text)
                self.assertTrue(form.validation()["complete"])
        self.assertIn("9,99 €", ContractForm("purchase", TEMPLATES["purchase"]["sample"]).document())
        self.assertIn("01.01.2026", ContractForm("rent", TEMPLATES["rent"]["sample"]).document())

    def test_empty_money_is_a_placeholder_but_zero_is_a_value(self):
        self.assertIn("Monatliche Miete: ________________ EUR", ContractForm("rent", {}).document())
        self.assertIn("Monatliche Miete: 0,00 €", ContractForm("rent", {"miete": "0"}).document())

    def test_required_fields_and_optional_fields(self):
        for key in TEMPLATES:
            with self.subTest(template=key):
                form = ContractForm(key, {})
                form.is_valid()
                self.assertEqual(set(form.errors), set(form.fields) - OPTIONAL_FIELDS)
                self.assertEqual(form.validation()["invalidFields"], [])

    def test_invalid_dates_negative_prices_precision_and_oversized_text(self):
        for name, value in (("beginn", "2026-02-30"), ("miete", "-1"),
                            ("miete", "1.234"), ("miete", "NaN"),
                            ("vermieter", "A" * 5001)):
            with self.subTest(name=name, value=value[:20]):
                form = ContractForm("rent", {**TEMPLATES["rent"]["sample"], name: value})
                self.assertFalse(form.is_valid())
                self.assertIn(name, form.validation()["invalidFields"])

    def test_text_is_not_html_encoded_or_interpreted_as_a_template(self):
        text = '<script>alert("test")</script> & {{ secret }}'
        form = ContractForm("purchase", {"seller": text})
        self.assertIn(text, form.document())


@override_settings(LOGIN_REQUIRED=False, SECURE_SSL_REDIRECT=False)
class ContractViewTests(TestCase):
    def test_page_renders_form_csrf_and_app_assets(self):
        response = self.client.get(reverse("contracts:generator"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "contracts/generator.html")
        self.assertContains(response, "csrfmiddlewaretoken")
        self.assertContains(response, "/static/contracts/app.js")
        self.assertContains(response, 'name="vermieter"')
        self.assertContains(response, "nicht als Entwurf gespeichert")
        self.assertIn("no-store", response["Cache-Control"])

    def test_template_query_selects_matching_form(self):
        response = self.client.get(reverse("contracts:generator"), {"template": "vehicle"})
        self.assertContains(response, 'name="fin"')
        self.assertContains(response, '"selectedTemplate": "vehicle"')

    def test_initial_markup_has_complete_navigation_and_matching_field_controls(self):
        for key in TEMPLATES:
            with self.subTest(template=key):
                response = self.client.get(reverse("contracts:generator"), {"template": key})
                self.assertContains(response, 'class="step-button"', count=5)
                self.assertContains(response, 'class="required-mark"')
                self.assertContains(response, 'class="field-optional"')
                self.assertContains(response, 'class="amount-control"')
                self.assertContains(response, 'rows="2"')
                sprite = response.context["config"]["iconsUrl"]
                self.assertIn("?v=", sprite)
                self.assertContains(response, f'<use href="{sprite}#')

    def test_preview_and_download_use_same_server_document_for_all_templates(self):
        for key, definition in TEMPLATES.items():
            with self.subTest(template=key):
                data = {"template": key, **definition["sample"]}
                preview = self.client.post(reverse("contracts:preview"), data)
                download = self.client.post(reverse("contracts:download"), data)
                self.assertEqual(preview.status_code, 200)
                self.assertEqual(download.status_code, 200)
                self.assertTrue(preview.json()["complete"])
                self.assertEqual(preview.json()["text"], download.content.decode())
                self.assertEqual(download["Content-Type"], "text/plain; charset=utf-8")
                self.assertIn(definition["fileName"], download["Content-Disposition"])
                self.assertIn("no-store", preview["Cache-Control"])
                self.assertIn("no-store", download["Cache-Control"])

    def test_incomplete_drafts_can_be_previewed_and_downloaded(self):
        preview = self.client.post(reverse("contracts:preview"), {"template": "rent"})
        self.assertFalse(preview.json()["complete"])
        self.assertIn("vermieter", preview.json()["errors"])
        self.assertEqual(self.client.post(reverse("contracts:download"), {"template": "rent"}).status_code, 200)

    def test_invalid_inputs_block_download_and_return_field_errors(self):
        data = {"template": "purchase", "price": "-10"}
        preview = self.client.post(reverse("contracts:preview"), data)
        self.assertIn("price", preview.json()["invalidFields"])
        download = self.client.post(reverse("contracts:download"), data)
        self.assertEqual(download.status_code, 400)
        self.assertIn("price", download.json()["errors"])

    def test_unknown_templates_return_404(self):
        self.assertEqual(self.client.get(reverse("contracts:generator"), {"template": "unknown"}).status_code, 404)
        for endpoint in ("preview", "download"):
            self.assertEqual(self.client.post(reverse(f"contracts:{endpoint}"), {"template": "unknown"}).status_code, 404)

    def test_endpoints_require_post(self):
        for endpoint in ("preview", "download"):
            self.assertEqual(self.client.get(reverse(f"contracts:{endpoint}")).status_code, 405)

    def test_csrf_is_required_and_page_token_allows_post(self):
        client = Client(enforce_csrf_checks=True)
        url = reverse("contracts:preview")
        self.assertEqual(client.post(url, {"template": "rent"}).status_code, 403)
        client.get(reverse("contracts:generator"))
        token = client.cookies["csrftoken"].value
        self.assertEqual(client.post(url, {"template": "rent"}, HTTP_X_CSRFTOKEN=token).status_code, 200)
