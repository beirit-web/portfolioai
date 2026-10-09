from django.contrib.auth.models import User
from django.contrib.staticfiles import finders
from django.test import TestCase, override_settings
from django.urls import reverse


@override_settings(LOGIN_REQUIRED=False, STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class VokabelboxIntegrationTests(TestCase):
    def test_learning_module_uses_platform_shell_and_public_navigation(self):
        response = self.client.get(reverse("pages:vokabelbox"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "base_public.html")
        self.assertContains(response, 'id="mainTopnav"')
        self.assertContains(response, 'id="wordGrid"')
        self.assertContains(response, 'id="quizWord"')
        self.assertContains(response, 'data-storage-key="sprachservice:vokabelbox:v1:guest"')
        self.assertContains(response, '/static/vokabelbox/app.js')
        self.assertNotContains(response, '/static/portfolio/vokabelbox-main/')
        self.assertNotContains(response, 'Derzeit wird nicht angeboten')
        for asset in ("vokabelbox/app.js", "vokabelbox/style.css"):
            self.assertIsNotNone(finders.find(asset), asset)

    def test_homepage_and_sitemap_link_to_integrated_module(self):
        self.assertContains(self.client.get(reverse("pages:home")), 'href="/vokabelbox/"')
        self.assertContains(self.client.get(reverse("pages:sitemap_xml")), '/vokabelbox/</loc>')

    def test_progress_storage_is_separate_for_each_account(self):
        for name in ("learner-one", "learner-two"):
            user = User.objects.create_user(username=name)
            self.client.force_login(user)
            response = self.client.get(reverse("pages:vokabelbox"))
            self.assertContains(response, f'data-storage-key="sprachservice:vokabelbox:v1:user-{user.pk}"')
            self.assertNotContains(response, 'data-storage-key="sprachservice:vokabelbox:v1:guest"')
            self.client.logout()
