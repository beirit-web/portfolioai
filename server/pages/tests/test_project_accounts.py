from html import escape
import re
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from pages.account_projects import PROJECTS, recovery_login_url, shared_account_url
from pages.models import Profile
from pages.modules.tokens import email_verification_token_generator


@override_settings(
    LOGIN_REQUIRED=False, LOCAL_ACCOUNT_ACTIVATION_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SITE_URL="https://portfolio.example.test",
    STORAGES={**settings.STORAGES, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}},
)
class ProjectAccountTests(TestCase):
    password = "Example-project-account-42!"
    new_password = "Fictional-Meadow-927!"

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="project-account@example.test", email="project-account@example.test", password=self.password,
        )

    def test_all_projects_keep_their_context_in_shared_account_forms(self):
        for _, name, home in PROJECTS:
            with self.subTest(project=name):
                login_url = shared_account_url("pages:login", home)
                for route in ("pages:login", "pages:register"):
                    response = self.client.get(shared_account_url(route, home))
                    self.assertEqual(response.context["account_project"]["name"], name)
                    self.assertContains(response, f'href="{home}"')
                    self.assertContains(response, f'name="next" value="{home}"')
                response = self.client.get(reverse("password_reset"), {"next": login_url})
                self.assertEqual(response.context["account_project"]["name"], name)
                self.assertContains(response, f'href="{home}"')

    def test_one_existing_account_can_log_in_from_each_project(self):
        for _, name, home in PROJECTS:
            with self.subTest(project=name):
                client = Client()
                response = client.post(reverse("pages:login"), {
                    "username": self.user.email, "password": self.password, "next": home,
                })
                self.assertEqual(response.status_code, 302)
                self.assertEqual(response["Location"], home)
                self.assertEqual(int(client.session["_auth_user_id"]), self.user.pk)
                if home == "/deutschlive/":
                    self.assertEqual(client.get("/deutschlive/api/auth/me/").json()["user"]["id"], self.user.pk)
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_email_activation_opens_deutschlive_with_the_shared_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        Profile.objects.update_or_create(user=self.user, defaults={"email_verification_pending": True})
        url = reverse("pages:verify_email", kwargs={
            "uidb64": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": email_verification_token_generator.make_token(self.user),
        })
        response = self.client.get(url, {"next": "/deutschlive/account"})
        self.assertEqual(response["Location"], "/deutschlive/account")
        self.assertEqual(self.client.get("/deutschlive/api/auth/me/").json()["user"]["id"], self.user.pk)

    def test_password_recovery_email_preserves_each_project_in_another_browser(self):
        for _, name, home in PROJECTS:
            with self.subTest(project=name):
                self.user.set_password(self.password)
                self.user.save()
                login_url = shared_account_url("pages:login", home)
                if home == "/wohnungssuche/":
                    login_url = "/wohnungssuche/login"
                elif home == "/deutschlive/":
                    login_url = "/deutschlive/account"
                response = self.client.post(reverse("password_reset"), {"email": self.user.email, "next": login_url})
                self.assertEqual(response.status_code, 302)
                link = re.search(r"https?://[^\s]+", mail.outbox[-1].body).group()
                parsed = urlsplit(link)
                other = Client()
                confirmation = other.get(parsed.path + "?" + parsed.query)
                form_url = confirmation["Location"]
                page = other.get(form_url)
                self.assertTrue(page.context["validlink"])
                self.assertEqual(page.context["account_project"]["name"], name)
                changed = other.post(form_url, {"new_password1": self.new_password, "new_password2": self.new_password})
                self.assertEqual(changed.status_code, 302, changed.context["form"].errors if changed.context else "")
                complete = other.get(changed["Location"])
                self.assertContains(complete, f'href="{escape(login_url, quote=True)}"')
                self.user.refresh_from_db()
                self.assertTrue(self.user.check_password(self.new_password))

    def test_recovery_rejects_external_or_non_project_return_targets(self):
        for candidate in (
            "https://external.example.test/login/", "//external.example.test/login/",
            "/login/?next=//external.example.test/shop/", "/login/?next=/admin/",
            "/login/?next=/shop/&next=//external.example.test/", "/shop/",
            "/login/?next=%2F%5Cexternal.example.test%2Fshop%2F",
        ):
            with self.subTest(candidate=candidate):
                self.assertEqual(recovery_login_url(candidate), reverse("pages:login"))

    def test_profile_save_and_logout_return_to_the_same_project(self):
        self.client.force_login(self.user)
        url = shared_account_url("pages:profile", "/botanic/?tab=plants")
        response = self.client.post(url, {"image-remove_image": "on"})
        self.assertEqual(response["Location"], url)
        response = self.client.get(shared_account_url("pages:logout", "/botanic/"))
        self.assertEqual(response["Location"], "/botanic/")
        self.assertNotIn("_auth_user_id", self.client.session)
