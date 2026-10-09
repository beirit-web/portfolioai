import tomllib
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse


CANONICAL_URL = "https://portfolio.example.invalid"
CANONICAL_HOST = "portfolio.example.invalid"
FORBIDDEN_HOSTS = {"legacy.example.invalid", "languages-staging.example.invalid", "languages.example.invalid"}


def _split_hosts(value: str) -> set[str]:
    return {item.strip().lower() for item in value.split(",") if item.strip()}


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


class BeiritDigitalDomainIsolationTests(TestCase):
    @override_settings(
        SITE_URL=CANONICAL_URL,
        SITE_HOST=CANONICAL_HOST,
        ALLOWED_HOSTS=["testserver", CANONICAL_HOST],
        REDIRECT_OLD_HOSTS=[],
        LOGIN_REQUIRED=False,
    )
    def test_homepage_uses_only_beirit_digital_canonical_urls(self):
        response = self.client.get(reverse("pages:home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://portfolio.example.invalid/" />',
            html=True,
        )
        self.assertContains(
            response,
            '<meta property="og:url" content="https://portfolio.example.invalid/" />',
            html=True,
        )
        self.assertNotContains(response, '<link rel="canonical" href="https://legacy.example.invalid/" />')
        self.assertNotContains(response, '<meta property="og:url" content="https://legacy.example.invalid/" />')

    @override_settings(SITE_URL=CANONICAL_URL, SITE_HOST=CANONICAL_HOST, LOGIN_REQUIRED=False)
    def test_robots_and_sitemap_use_beirit_digital_domain(self):
        robots = self.client.get(reverse("pages:robots_txt"))
        sitemap = self.client.get(reverse("pages:sitemap_xml"))

        self.assertEqual(robots.status_code, 200)
        self.assertContains(robots, "Sitemap: https://portfolio.example.invalid/sitemap.xml")
        self.assertContains(robots, "Host: portfolio.example.invalid")
        self.assertEqual(sitemap.status_code, 200)
        self.assertContains(sitemap, "<loc>https://portfolio.example.invalid/</loc>")
        self.assertNotContains(sitemap, "<loc>https://legacy.example.invalid/</loc>")


class BeiritDigitalDeployConfigTests(TestCase):
    def test_fly_config_is_scoped_to_beirit_digital(self):
        fly_config = tomllib.loads((Path(settings.BASE_DIR) / "fly.toml").read_text(encoding="utf-8"))
        env = fly_config["env"]

        self.assertEqual(fly_config["app"], "portfolio-demo-example")
        self.assertEqual(env["SITE_URL"], CANONICAL_URL)
        self.assertEqual(env["RESET_LINK_DOMAIN"], CANONICAL_HOST)
        self.assertEqual(env["CSRF_TRUSTED_ORIGINS"], CANONICAL_URL)
        self.assertEqual(_split_hosts(env["DJANGO_ALLOWED_HOSTS"]), {CANONICAL_HOST})
        self.assertFalse(_split_hosts(env.get("REDIRECT_OLD_HOSTS", "")) & FORBIDDEN_HOSTS)

    def test_example_environment_contains_only_demo_payment_settings(self):
        env = _read_env_file(Path(settings.BASE_DIR) / ".env.example")
        self.assertEqual(env["PAYPAL_MODE"], "sandbox")
        self.assertFalse(env.get("PAYPAL_CLIENT_ID", ""))
        self.assertFalse(env.get("PAYPAL_CLIENT_SECRET", ""))
        self.assertFalse(env.get("PAYPAL_BUSINESS_EMAIL", ""))
