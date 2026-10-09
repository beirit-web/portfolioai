from django.template import Context, Template
from django.test import SimpleTestCase

from pages.templatetags.asset_tags import asset_url, inline_asset


class AssetUrlTagTests(SimpleTestCase):
    def test_asset_url_appends_a_stable_version_query(self):
        first = asset_url("css/main.css")
        second = asset_url("css/main.css")

        self.assertEqual(first, second)
        self.assertIn("/static/", first)
        self.assertIn("?v=", first)
        self.assertNotIn("v=missing", first)

    def test_asset_url_renders_inside_templates(self):
        rendered = Template(
            "{% load asset_tags %}<script src=\"{% asset_url 'js/main.js' %}\"></script>"
        ).render(Context())

        self.assertIn('/static/', rendered)
        self.assertIn('?v=', rendered)

    def test_inline_asset_renders_static_file_contents(self):
        rendered = Template(
            "{% load asset_tags %}<style>{% inline_asset 'css/root.css' %}</style>"
        ).render(Context())

        self.assertIn("<style>", rendered)
        self.assertIn(":root", rendered)
        self.assertEqual(inline_asset("missing.css"), "")
