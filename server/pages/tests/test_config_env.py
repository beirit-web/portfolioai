import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase

from config.env import (
    clean_path_fragment,
    env_bool_first,
    env_first,
    env_list,
    env_list_first,
    env_path,
    env_path_fragment,
    require_env,
    require_env_list,
)


class EnvironmentValueTests(SimpleTestCase):
    def test_blank_preferred_aliases_do_not_hide_configured_fallbacks(self):
        with patch.dict(os.environ, {"PREFERRED": " \t ", "FALLBACK": "  fake-secret-with-spaces  "}, clear=True):
            self.assertEqual(env_first(["PREFERRED", "FALLBACK"]), "  fake-secret-with-spaces  ")
            self.assertEqual(require_env(["PREFERRED", "FALLBACK"]), "  fake-secret-with-spaces  ")
        with patch.dict(os.environ, {"PREFERRED": " \t ", "FALLBACK": "true"}, clear=True):
            self.assertTrue(env_bool_first(["PREFERRED", "FALLBACK"]))
        with patch.dict(os.environ, {"PREFERRED": "false", "FALLBACK": "true"}, clear=True):
            self.assertFalse(env_bool_first(["PREFERRED", "FALLBACK"]))

    def test_required_values_reject_whitespace_and_empty_list_entries(self):
        for value in ("", " \t "):
            with self.subTest(value=value), patch.dict(os.environ, {"REQUIRED": value}, clear=True):
                with self.assertRaisesRegex(RuntimeError, "REQUIRED"):
                    require_env(["REQUIRED"])
        with patch.dict(os.environ, {"HOSTS": " , , "}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "HOSTS"):
                require_env_list(["HOSTS"])

    def test_empty_lists_use_the_documented_default_without_sharing_it(self):
        fallback = ["localhost"]
        with patch.dict(os.environ, {"HOSTS": " , , "}, clear=True):
            values = env_list("HOSTS", default=fallback)
            self.assertEqual(values, fallback)
            values.append("127.0.0.1")
            self.assertEqual(fallback, ["localhost"])
        with patch.dict(os.environ, {"PRIMARY": " , ", "SECONDARY": "localhost, 127.0.0.1"}, clear=True):
            self.assertEqual(env_list_first(["PRIMARY", "SECONDARY"]), ["localhost", "127.0.0.1"])

    def test_paths_ignore_blank_values_and_preserve_spaces_inside_names(self):
        with TemporaryDirectory() as directory:
            fallback = Path(directory) / "default.sqlite3"
            selected = Path(directory) / "sample files" / "db.sqlite3"
            with patch.dict(os.environ, {"DB_PATH": " \t "}, clear=True):
                self.assertEqual(env_path("DB_PATH", fallback), fallback)
            with patch.dict(os.environ, {"DB_PATH": f"  {selected}  "}, clear=True):
                self.assertEqual(env_path("DB_PATH", fallback), selected)


class EnvironmentRouteTests(SimpleTestCase):
    def test_required_path_accepts_an_explicitly_configured_default(self):
        with patch.dict(os.environ, {"AUTH_URL_PREFIX": "auth/"}, clear=True):
            self.assertEqual(env_path_fragment(["AUTH_URL_PREFIX"], "auth/", require_present=True), "auth/")

    def test_route_aliases_skip_blank_values_and_normalize_outer_slashes(self):
        with patch.dict(os.environ, {"DJANGO_AUTH_URL_PREFIX": " \t ", "AUTH_URL_PREFIX": " /members/// "}, clear=True):
            self.assertEqual(
                env_path_fragment(["DJANGO_AUTH_URL_PREFIX", "AUTH_URL_PREFIX"], "auth/", require_present=True),
                "members/",
            )

    def test_optional_routes_fall_back_but_required_routes_must_be_present(self):
        with patch.dict(os.environ, {"AUTH_URL_PREFIX": "   "}, clear=True):
            self.assertEqual(env_path_fragment(["AUTH_URL_PREFIX"], "auth/"), "auth/")
            with self.assertRaisesRegex(RuntimeError, "AUTH_URL_PREFIX"):
                env_path_fragment(["AUTH_URL_PREFIX"], "auth/", require_present=True)

    def test_nested_routes_are_preserved_but_root_only_routes_are_rejected(self):
        self.assertEqual(clean_path_fragment(" /members/reset/// ", "auth/"), "members/reset/")
        with self.assertRaisesRegex(RuntimeError, "nonempty path"):
            clean_path_fragment("///", "auth/")
