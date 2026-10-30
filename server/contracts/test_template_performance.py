import re
from unittest.mock import patch

from django.contrib.staticfiles import finders
from django.template import Context, Template
from django.test import RequestFactory, SimpleTestCase, override_settings

from pages.templatetags.asset_tags import asset_url

from .views import generator


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    STORAGES={
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class ContractIconPerformanceTests(SimpleTestCase):
    def test_generator_resolves_sprite_once_for_all_included_templates(self):
        # Warm the content fingerprint; every render must still check freshness.
        sprite_url = asset_url("contracts/icons.svg")
        request = RequestFactory().get("/vertragsgenerator/")
        with patch("pages.templatetags.asset_tags.finders.find", wraps=finders.find) as lookup:
            response = generator(request)

        sprite_lookups = [call for call in lookup.call_args_list
                          if call.args[0] == "contracts/icons.svg"]
        self.assertEqual(len(sprite_lookups), 1)
        icon_urls = re.findall(r'<use href="([^#"]+)#[^"]+"></use>', response.content.decode())
        self.assertGreater(len(icon_urls), 30)
        self.assertEqual(set(icon_urls), {sprite_url})
        self.assertIn("no-store", response["Cache-Control"])

    def test_standalone_icons_reuse_url_only_within_the_current_render(self):
        template = Template("{% load contracts_ui %}{% contract_icon 'plus' %}{% contract_icon 'check' %}")
        context = Context()
        with patch("contracts.templatetags.contracts_ui.asset_url", side_effect=[
            "/static/contracts/icons.svg?v=first", "/static/contracts/icons.svg?v=second",
        ]) as resolve:
            first = template.render(context)
            second = template.render(context)

        self.assertEqual(resolve.call_count, 2)
        self.assertEqual(first.count("?v=first#"), 2)
        self.assertEqual(second.count("?v=second#"), 2)
        self.assertNotIn("?v=first#", second)
