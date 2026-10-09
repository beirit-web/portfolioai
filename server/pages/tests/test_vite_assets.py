from django.test import TestCase, override_settings
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
        self.assertContains(response, "data-vite-inline='src/components/home/homepage/HomePage.css'")
        self.assertNotIn("/static/react-home-dist/assets/styles-", content)
        self.assertNotIn("/static/react-home-dist/assets/homepage-custom-", content)
        self.assertNotIn("/static/react-home-dist/assets/responsive-overrides-", content)
        self.assertNotIn('rel="stylesheet" href="/static/react-home-dist/assets/styles-', content)
        self.assertNotIn('rel="stylesheet" href="/static/react-home-dist/assets/homepage-custom-', content)
        self.assertNotIn('rel="stylesheet" href="/static/react-home-dist/assets/responsive-overrides-', content)
        self.assertContains(response, "/static/react-home-dist/assets/main-")
        self.assertNotIn('rel="modulepreload" href="/static/react-home-dist/assets/ContactForm-', content)

    @override_settings(LOGIN_REQUIRED=False)
    def test_contact_loads_viewport_css_and_preloads_its_form(self):
        response = self.client.get("/kontakt/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "window.BEIRIT_CRITICAL_CSS_READY = loadPageCss(desktop.matches)")
        self.assertContains(response, "/static/react-home-dist/assets/mobile-pages-")
        self.assertContains(response, "data-vite-inline='src/components/contact/ContactForm.jsx'")
        self.assertContains(response, 'rel="modulepreload" href="/static/react-home-dist/assets/ContactForm-')

    @override_settings(LOGIN_REQUIRED=False)
    def test_skills_use_viewport_css_without_loading_the_contact_form(self):
        response = self.client.get("/kompetenzen/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "window.BEIRIT_CRITICAL_CSS_READY = loadPageCss(desktop.matches)")
        self.assertContains(response, "/static/react-home-dist/assets/mobile-pages-")
        self.assertNotContains(response, 'rel="modulepreload" href="/static/react-home-dist/assets/ContactForm-')

    @override_settings(LOGIN_REQUIRED=False)
    def test_about_preloads_its_visible_background_image(self):
        response = self.client.get("/ueber-mich/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'rel="preload" as="image" href="/static/images/about-forest-background.webp" fetchpriority="high"')
