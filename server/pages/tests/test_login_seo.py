from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from .test_portfolio_seo import PortfolioDocument


@override_settings(
    SITE_URL="https://portfolio.example.invalid/",
    LOGIN_REQUIRED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    STORAGES={
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
)
class LoginSeoTests(TestCase):
    canonical = "https://portfolio.example.invalid/login/"
    target = "/botanic/?tab=plants"

    def assert_metadata(self, response, robots):
        self.assertEqual(response.status_code, 200)
        document = PortfolioDocument(response)
        project = response.context.get("account_project")
        self.assertEqual(document.title, f'Anmelden | {project["name"]}' if project else "Anmelden | Beirit Digital")
        self.assertGreater(len(document.metadata["description"]), 35)
        self.assertEqual(document.canonical, self.canonical)
        self.assertEqual(len([link for link in document.links if link.get("rel") == "canonical"]), 1)
        self.assertEqual(document.metadata["robots"], robots)
        self.assertEqual(response["X-Robots-Tag"], robots)
        self.assertIn("no-store", response["Cache-Control"])
        for prefix in ("og", "twitter"):
            self.assertEqual(document.metadata[f"{prefix}:title"], document.title)
            self.assertEqual(document.metadata[f"{prefix}:description"], document.metadata["description"])
            self.assertEqual(document.metadata[f"{prefix}:url"], self.canonical)
        return document

    def test_public_login_and_return_variants_have_one_indexable_canonical(self):
        for params in ({}, {"next": self.target}, {"next": "/profile/?example=private-marker", "utm_source": "example"}):
            with self.subTest(params=params):
                response = self.client.get(reverse("pages:login"), params)
                document = self.assert_metadata(response, "index, follow")
                metadata = " ".join([document.title, *document.metadata.values()])
                self.assertNotIn("private-marker", metadata)
                self.assertNotIn("utm_source", metadata)
                self.assertNotIn("next=", metadata)
                if params.get("next") == self.target:
                    self.assertContains(response, '<input type="hidden" name="next" value="/botanic/?tab=plants" />', html=True)

    def test_prefilled_email_is_not_indexed_or_included_in_metadata(self):
        email = "prefilled-user@example.test"
        response = self.client.get(reverse("pages:login"), {"next": self.target, "email": email})
        document = self.assert_metadata(response, "noindex, follow")
        self.assertContains(response, email)
        self.assertNotIn(email, " ".join([document.title, *document.metadata.values()]))

    def test_failed_login_is_noindexed_and_does_not_echo_the_password(self):
        email, password = "missing-user@example.test", "fictional-login-password"
        response = self.client.post(
            f"{reverse('pages:login')}?{urlencode({'next': self.target})}",
            {"username": email, "password": password, "next": self.target},
        )
        document = self.assert_metadata(response, "noindex, follow")
        self.assertContains(response, 'role="alert"')
        self.assertNotContains(response, password)
        self.assertNotIn(email, " ".join([document.title, *document.metadata.values()]))
        self.assertContains(response, '<input type="hidden" name="next" value="/botanic/?tab=plants" />', html=True)

    def test_successful_login_returns_to_botanic(self):
        email, password = "login-user@example.test", "fictional-login-password"
        get_user_model().objects.create_user(username=email, email=email, password=password)
        response = self.client.post(reverse("pages:login"), {
            "username": email, "password": password, "next": self.target,
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], self.target)
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_signed_in_user_is_redirected_instead_of_rendering_public_login(self):
        user = get_user_model().objects.create_user(username="signed-in@example.test")
        self.client.force_login(user)
        response = self.client.get(reverse("pages:login"), {"next": self.target})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], self.target)

    def test_signed_in_user_cannot_follow_an_external_next_url(self):
        user = get_user_model().objects.create_user(username="signed-in@example.test")
        self.client.force_login(user)
        response = self.client.get(reverse("pages:login"), {"next": "https://external.example.test/"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("pages:home"))

    def test_register_remains_excluded_from_indexing(self):
        response = self.client.get(reverse("pages:register"))
        self.assertEqual(PortfolioDocument(response).metadata["robots"], "noindex, follow")
