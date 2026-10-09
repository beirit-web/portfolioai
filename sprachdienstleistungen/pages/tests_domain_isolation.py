import tomllib
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse


STAGING_URL = "https://languages-staging.example.invalid"
STAGING_HOST = "languages-staging.example.invalid"
PRODUCTION_URL = "https://languages.example.invalid"
PRODUCTION_HOST = "languages.example.invalid"
FORBIDDEN_HOSTS = {"portfolio.example.invalid"}


def _split_hosts(value: str) -> set[str]:
    return {item.strip().lower() for item in value.split(",") if item.strip()}


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class SprachdienstleistungenDomainIsolationTests(TestCase):
    @override_settings(
        SITE_URL=STAGING_URL,
        SITE_HOST=STAGING_HOST,
        ALLOWED_HOSTS=[
            "testserver",
            STAGING_HOST,
            f"www.{STAGING_HOST}",
            "languages-host.example.invalid",
            "portfolio.example.invalid",
        ],
        REDIRECT_OLD_HOSTS=[f"www.{STAGING_HOST}"],
        LOGIN_REQUIRED=False,
    )
    def test_homepage_uses_only_staging_canonical_urls(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://languages-staging.example.invalid/" />',
            html=True,
        )
        self.assertContains(
            response,
            '<meta property="og:url" content="https://languages-staging.example.invalid/" />',
            html=True,
        )
        self.assertNotContains(
            response,
            '<link rel="canonical" href="https://portfolio.example.invalid/" />',
        )
        self.assertNotContains(
            response,
            '<meta property="og:url" content="https://portfolio.example.invalid/" />',
        )

    @override_settings(SITE_URL=STAGING_URL, SITE_HOST=STAGING_HOST, LOGIN_REQUIRED=False)
    def test_robots_and_sitemap_use_staging_domain(self):
        robots = self.client.get(reverse("pages:robots_txt"))
        sitemap = self.client.get(reverse("pages:sitemap_xml"))

        self.assertEqual(robots.status_code, 200)
        self.assertContains(robots, "Sitemap: https://languages-staging.example.invalid/sitemap.xml")
        self.assertContains(robots, "Host: languages-staging.example.invalid")
        self.assertEqual(sitemap.status_code, 200)
        self.assertContains(sitemap, "<loc>https://languages-staging.example.invalid/</loc>")
        self.assertNotContains(sitemap, "<loc>https://portfolio.example.invalid/</loc>")


class SprachdienstleistungenDeployConfigTests(TestCase):
    def test_fly_config_is_scoped_to_beirit_digital_domain(self):
        fly_config = tomllib.loads(
            (Path(settings.BASE_DIR) / "fly.toml").read_text(encoding="utf-8")
        )
        env = fly_config["env"]

        self.assertEqual(fly_config["app"], "language-demo-example")
        self.assertEqual(env["SITE_URL"], STAGING_URL)
        self.assertIn(STAGING_HOST, _split_hosts(env["DJANGO_ALLOWED_HOSTS"]))
        self.assertIn(STAGING_URL, _split_hosts(env["CSRF_TRUSTED_ORIGINS"]))
        self.assertFalse(_split_hosts(env["DJANGO_ALLOWED_HOSTS"]) & FORBIDDEN_HOSTS)
        self.assertFalse(
            _split_hosts(env["CSRF_TRUSTED_ORIGINS"])
            & {f"https://{host}" for host in FORBIDDEN_HOSTS}
        )
        self.assertFalse(_split_hosts(env.get("REDIRECT_OLD_HOSTS", "")) & FORBIDDEN_HOSTS)

    def test_optional_coachingservice_fly_config_is_scoped_to_beirit_digital_domain(self):
        fly_path = Path(settings.BASE_DIR) / "fly.coachingservice.toml"
        if not fly_path.exists():
            self.skipTest("fly.coachingservice.toml is not present")

        fly_config = tomllib.loads(fly_path.read_text(encoding="utf-8"))
        env = fly_config["env"]

        self.assertEqual(fly_config["app"], "language-demo-example")
        self.assertEqual(env["SITE_URL"], PRODUCTION_URL)
        self.assertIn(PRODUCTION_HOST, _split_hosts(env["DJANGO_ALLOWED_HOSTS"]))
        self.assertIn(PRODUCTION_URL, _split_hosts(env["CSRF_TRUSTED_ORIGINS"]))
        self.assertFalse(_split_hosts(env["DJANGO_ALLOWED_HOSTS"]) & FORBIDDEN_HOSTS)
        self.assertFalse(
            _split_hosts(env["CSRF_TRUSTED_ORIGINS"])
            & {f"https://{host}" for host in FORBIDDEN_HOSTS}
        )
        self.assertFalse(_split_hosts(env.get("REDIRECT_OLD_HOSTS", "")) & FORBIDDEN_HOSTS)
