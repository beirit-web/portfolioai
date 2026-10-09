from django.template import Context, Template
from django.test import SimpleTestCase, override_settings

from pages.templatetags.asset_tags import asset_url


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
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
