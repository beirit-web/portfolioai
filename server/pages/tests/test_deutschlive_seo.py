from html.parser import HTMLParser
from itertools import product
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings

from config.deutschlive_seo import ALIASES, ROUTE_DATA, ROUTES, app_path


class AppDocument(HTMLParser):
    def __init__(self, content):
        super().__init__()
        self.metadata = {}
        self.canonicals = []
        self.title = ""
        self.lang = ""
        self.links = []
        self._title = False
        self.feed(content.decode())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        elif tag == "meta":
            key = attrs.get("name") or attrs.get("property")
            self.metadata.setdefault(key, []).append(attrs.get("content"))
        elif tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        elif tag == "title":
            self._title = True
        elif tag == "a":
            self.links.append(attrs.get("href"))

    def handle_endtag(self, tag):
        if tag == "title":
            self._title = False

    def handle_data(self, data):
        if self._title:
            self.title += data


@override_settings(SITE_URL="https://portfolio.example.invalid", LOGIN_REQUIRED=False)
class DeutschLiveSeoTests(SimpleTestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory(prefix="beirit-deutschlive-seo-"))
        index = Path(directory) / "assets/deutschlive-dist/index.html"
        index.parent.mkdir(parents=True)
        self.source = (Path(__file__).resolve().parents[3] / "apps/deutsch-live/index.html").read_text(encoding="utf-8")
        # Preserve generated module and stylesheet tags when editing the head.
        self.source = self.source.replace("</head>", '<link rel="stylesheet" href="/static/sample.css" /><script type="module" src="/static/sample.js"></script></head>')
        index.write_text(self.source, encoding="utf-8")
        self.enterContext(override_settings(BASE_DIR=Path(directory)))

    def test_every_app_route_has_localized_consistent_metadata_and_indexability(self):
        for locale in ("ru", "de", "uk"):
            self.client.cookies["deutschlive_locale"] = locale
            for path, route in ROUTES.items():
                if path == "/grades":
                    continue  # This route intentionally redirects to the standalone app.
                with self.subTest(locale=locale, path=path):
                    response = self.client.get(app_path(path) + "?source=ignored")
                    self.assertEqual(response.status_code, 200)
                    doc = AppDocument(response.content)
                    copy = route[locale]
                    canonical = "https://portfolio.example.invalid" + app_path(path)
                    robots = "index, follow" if route["index"] else "noindex, follow"
                    self.assertEqual(doc.lang, locale)
                    self.assertEqual(doc.title, copy["title"])
                    self.assertEqual(doc.canonicals, [canonical])
                    self.assertEqual(response["Content-Language"], locale)
                    self.assertEqual(response["X-Robots-Tag"], robots)
                    self.assertIn("Cookie", response["Vary"])
                    for key, value in {
                        "description": copy["description"], "robots": robots,
                        "og:title": copy["title"], "twitter:title": copy["title"],
                        "og:description": copy["description"], "twitter:description": copy["description"],
                        "og:url": canonical, "twitter:url": canonical,
                        "og:locale": {"ru": "ru_RU", "de": "de_DE", "uk": "uk_UA"}[locale],
                    }.items():
                        self.assertEqual(doc.metadata[key], [value])
                    self.assertContains(response, '<script type="module" src="/static/sample.js"></script>')
                    self.assertContains(response, '<link rel="stylesheet" href="/static/sample.css" />')

    def test_default_and_invalid_cookie_match_the_russian_app_default(self):
        for cookie in (None, "en", '<script>alert("example")</script>'):
            self.client.cookies.clear()
            if cookie is not None:
                self.client.cookies["deutschlive_locale"] = cookie
            response = self.client.get("/deutschlive/")
            self.assertEqual(AppDocument(response.content).lang, "ru")
            self.assertEqual(AppDocument(response.content).title, ROUTES["/"]["ru"]["title"])

    def test_aliases_redirect_once_preserving_the_original_query(self):
        query = "topic=sample&token=a%2Bb&token=x&empty="
        for alias, canonical in ALIASES.items():
            for suffix in ("", "/", "///"):
                response = self.client.get(app_path(alias) + suffix + "?" + query)
                self.assertEqual(response.status_code, 301)
                self.assertEqual(response["Location"], app_path(canonical) + "?" + query)

    def test_unknown_pages_return_a_real_noindexed_404_with_safe_metadata(self):
        for debug, path in product((False, True), ("/missing-page", "/missing%3Fquery%23fragment%25")):
            with self.subTest(debug=debug, path=path), self.settings(DEBUG=debug):
                response = self.client.get("/deutschlive" + path + "?source=ignored")
                self.assertEqual(response.status_code, 404)
                doc = AppDocument(response.content)
                self.assertEqual(doc.title, ROUTE_DATA["notFound"]["ru"]["title"])
                self.assertEqual(doc.metadata["robots"], ["noindex, follow"])
                self.assertEqual(response["X-Robots-Tag"], "noindex, follow")
                self.assertEqual(doc.canonicals, ["https://portfolio.example.invalid/deutschlive" + path])
                self.assertContains(response, '<div id="root"></div>', status_code=404)

    def test_no_script_overview_links_only_to_public_canonical_pages(self):
        response = self.client.get("/deutschlive/manual")
        doc = AppDocument(response.content)
        self.assertEqual(doc.links, [app_path(path) for path, route in ROUTES.items() if route["index"]])
        self.assertContains(response, ROUTES["/manual"]["ru"]["description"])
        self.assertContains(response, ROUTE_DATA["noScript"]["ru"]["description"])
