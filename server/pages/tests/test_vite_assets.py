import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, TestCase, override_settings

from pages.templatetags.vite_assets import vite_modulepreload_assets, vite_react_assets
from django.urls import reverse


class HomeViteAssetsTests(TestCase):
    @override_settings(LOGIN_REQUIRED=False)
    def test_home_includes_vite_css_assets(self):
        response = self.client.get(reverse("pages:home"))
        content = response.content.decode()

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "window.BEIRIT_DEFERRED_CSS = []")
        self.assertContains(response, "data-vite-inline='src/homepage-layout.css'")
        self.assertContains(response, "data-vite-inline='src/components/home/hero/Hero.css'")
        self.assertContains(response, "data-vite-inline='src/components/home/HomePage.css'")
        self.assertNotIn("/static/portfolio-dist/assets/styles-", content)
        self.assertNotIn("/static/portfolio-dist/assets/homepage-custom-", content)
        self.assertNotIn("/static/portfolio-dist/assets/responsive-overrides-", content)
        self.assertNotIn('rel="stylesheet" href="/static/portfolio-dist/assets/styles-', content)
        self.assertNotIn('rel="stylesheet" href="/static/portfolio-dist/assets/homepage-custom-', content)
        self.assertNotIn('rel="stylesheet" href="/static/portfolio-dist/assets/responsive-overrides-', content)
        self.assertContains(response, "/static/portfolio-dist/assets/main-")
        self.assertNotIn('rel="modulepreload" href="/static/portfolio-dist/assets/ContactForm-', content)

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_loads_viewport_css_and_preloads_its_form(self):
        response = self.client.get("/kontakt/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "window.BEIRIT_CRITICAL_CSS_READY = loadPageCss(desktop.matches)")
        self.assertContains(response, "/static/portfolio-dist/assets/mobile-pages-")
        self.assertContains(response, "data-vite-inline='src/components/contact/ContactForm.jsx'")
        self.assertContains(response, 'rel="modulepreload" href="/static/portfolio-dist/assets/ContactForm-')
        self.assertContains(response, 'rel="modulepreload" href="/static/portfolio-dist/assets/ContactDetails-')
        self.assertContains(response, 'rel="modulepreload" href="/static/portfolio-dist/assets/ContactIcon-')

    @override_settings(LOGIN_REQUIRED=False)
    def test_skills_use_viewport_css_without_loading_the_contact_form(self):
        response = self.client.get("/kompetenzen/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "window.BEIRIT_CRITICAL_CSS_READY = loadPageCss(desktop.matches)")
        self.assertContains(response, "/static/portfolio-dist/assets/mobile-pages-")
        self.assertNotContains(response, 'rel="modulepreload" href="/static/portfolio-dist/assets/ContactForm-')

    @override_settings(LOGIN_REQUIRED=False)
    def test_about_inlines_styles_and_preloads_images_with_its_own_entry(self):
        response = self.client.get("/ueber-mich/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'rel="preload" as="image" href="/static/images/about-forest-background.webp" fetchpriority="high"')
        self.assertContains(response, 'imagesrcset="/static/images/eugenbeirit-360.webp 360w, /static/images/eugenbeirit-540.webp 540w"')
        self.assertContains(response, "data-vite-inline='src/about-shell.css'")
        self.assertContains(response, "data-vite-inline='src/about-page.css'")
        self.assertContains(response, "/static/portfolio-dist/assets/about-")
        content = response.content.decode()
        self.assertLess(
            content.index('rel="modulepreload" href="/static/portfolio-dist/assets/about-'),
            content.index("data-vite-inline='src/about-shell.css'"),
        )
        self.assertNotContains(response, 'rel="stylesheet"')
        self.assertNotContains(response, "/static/portfolio-dist/assets/main-")
        self.assertNotContains(response, "/static/portfolio-dist/assets/useI18n-")

    @override_settings(LOGIN_REQUIRED=False)
    def test_projects_inline_only_their_route_styles(self):
        response = self.client.get("/projekte")
        content = response.content.decode()
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "data-vite-inline='src/projects-page.css'")
        self.assertContains(response, "data-vite-inline='src/header-nav.css'")
        for name in ("styles", "homepage-custom", "responsive-overrides"):
            self.assertNotIn(f"/static/portfolio-dist/assets/{name}-", content)
        self.assertNotIn('rel="stylesheet"', content)
        self.assertContains(response, '/static/portfolio-dist/assets/projects-')
        self.assertContains(response, 'fetchpriority="low"></script>')
        self.assertNotIn('/static/portfolio-dist/assets/main-', content)
        self.assertNotIn('/static/portfolio-dist/assets/three-vendor-', content)


class ViteModulePreloadTests(SimpleTestCase):
    def test_route_preloads_include_shared_static_imports_once_and_skip_lazy_imports(self):
        manifest = {
            "form": {"file": "assets/form.js", "imports": ["icons"], "dynamicImports": ["lazy"]},
            "details": {"file": "assets/details.js", "imports": ["icons"]},
            "icons": {"file": "assets/icons.js", "imports": ["form"]},
            "alias": {"file": "assets/icons.js"},
            "styles": {"file": "assets/styles.css"},
            "lazy": {"file": "assets/lazy.js"},
        }
        with TemporaryDirectory(prefix="beirit-vite-") as directory:
            folder = Path(directory) / "assets" / "portfolio-dist" / ".vite"
            folder.mkdir(parents=True)
            (folder / "manifest.json").write_text(json.dumps(manifest))
            with override_settings(SERVER_DIR=Path(directory)):
                assets = str(vite_modulepreload_assets("form", "details", "alias", "styles", "missing"))
        for module in ("form", "details", "icons"):
            self.assertEqual(assets.count(f'href="/static/portfolio-dist/assets/{module}.js"'), 1)
        self.assertNotIn("lazy.js", assets)
        self.assertNotIn("styles.css", assets)
        self.assertNotIn("<script", assets)

    def test_nested_static_imports_are_preloaded_once_without_dynamic_modules(self):
        manifest = {
            "src/projects.jsx": {"file": "assets/projects.js", "imports": ["shell", "vendor"], "dynamicImports": ["animation"]},
            "shell": {"file": "assets/shell.js", "imports": ["vendor"], "dynamicImports": ["contact"]},
            "vendor": {"file": "assets/vendor.js", "imports": ["shell"]},
            "animation": {"file": "assets/three-vendor.js"},
            "contact": {"file": "assets/contact.js"},
        }
        with TemporaryDirectory(prefix="beirit-vite-") as directory:
            folder = Path(directory) / "assets" / "portfolio-dist" / ".vite"
            folder.mkdir(parents=True)
            (folder / "manifest.json").write_text(json.dumps(manifest))
            with override_settings(SERVER_DIR=Path(directory)):
                assets = str(vite_react_assets("src/projects.jsx"))
        self.assertEqual(assets.count('href="/static/portfolio-dist/assets/shell.js"'), 1)
        self.assertEqual(assets.count('href="/static/portfolio-dist/assets/vendor.js"'), 1)
        self.assertIn('<script type="module" crossorigin src="/static/portfolio-dist/assets/projects.js">', assets)
        self.assertNotIn("three-vendor.js", assets)
        self.assertNotIn("contact.js", assets)
