"""Check isolation, selection and failure handling of the shared check runner."""

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import check_beirit


class CheckRunnerTests(unittest.TestCase):
    @patch("check_beirit.subprocess.run")
    def test_data_group_needs_no_node_or_django(self, run):
        with redirect_stdout(StringIO()):
            self.assertEqual(check_beirit.main(["--group", "data"]), 0)
        self.assertTrue(run.called)
        for call in run.call_args_list:
            command = call.args[0]
            self.assertEqual(command[0], sys.executable)
            self.assertTrue(command[1].startswith("scripts/"))

    @patch("check_beirit.subprocess.run")
    def test_repeated_group_runs_backend_tests_once(self, run):
        with redirect_stdout(StringIO()):
            self.assertEqual(check_beirit.main(["--group", "backend", "--group", "backend"]), 0)
        tests = [call for call in run.call_args_list if "manage.py" in call.args[0] and "test" in call.args[0]]
        self.assertEqual(len(tests), 1)
        self.assertIn("--noinput", tests[0].args[0])

    @patch("check_beirit.subprocess.run")
    def test_default_run_builds_all_apps_before_browser_checks(self, run):
        with redirect_stdout(StringIO()):
            self.assertEqual(check_beirit.main([]), 0)
        calls = run.call_args_list
        browser_start = next(index for index, call in enumerate(calls) if "test:browser" in call.args[0])
        build_calls = [call for call in calls[:browser_start] if "build" in call.args[0] or "build:housing" in call.args[0]]
        self.assertEqual({call.kwargs["cwd"].name for call in build_calls}, {"frontend", "deutsch-live"})
        self.assertTrue(any("build:housing" in call.args[0] for call in build_calls))
        self.assertTrue(any("--noEmit" in call.args[0] for call in calls[:browser_start]))
        self.assertTrue(any(call.args[0][1:] == ["-m", "pip", "check"] for call in calls))

    @patch("check_beirit.subprocess.run")
    def test_failure_stops_later_steps_and_cleans_temporary_data(self, run):
        run.side_effect = [None, subprocess.CalledProcessError(17, ["failed-check"])]
        with patch.dict(os.environ, {"DB_PATH": "/tmp/example-demo/db.sqlite3"}):
            with redirect_stdout(StringIO()):
                self.assertEqual(check_beirit.main(["--group", "backend"]), 17)
            self.assertEqual(os.environ["DB_PATH"], "/tmp/example-demo/db.sqlite3")
        self.assertEqual(run.call_count, 2)
        temporary_database = Path(run.call_args_list[0].kwargs["env"]["DB_PATH"])
        self.assertNotEqual(str(temporary_database), "/tmp/example-demo/db.sqlite3")
        self.assertFalse(temporary_database.parent.exists())

    @patch("check_beirit.subprocess.run")
    def test_commands_use_explicit_absolute_directories(self, run):
        with redirect_stdout(StringIO()):
            self.assertEqual(check_beirit.main(["--group", "backend"]), 0)
        for call in run.call_args_list:
            self.assertTrue(call.kwargs["cwd"].is_absolute())
            self.assertTrue(call.kwargs["check"])

    @patch("check_beirit.TemporaryDirectory")
    @patch("check_beirit.subprocess.run")
    def test_list_is_read_only(self, run, temporary_directory):
        output = StringIO()
        with redirect_stdout(output):
            self.assertEqual(check_beirit.main(["--group", "frontend", "--list"]), 0)
        self.assertIn("frontend:", output.getvalue())
        self.assertIn("apps/deutsch-live:", output.getvalue())
        run.assert_not_called()
        temporary_directory.assert_not_called()

    @patch("check_beirit.subprocess.run")
    def test_unknown_group_is_rejected_before_any_check(self, run):
        with redirect_stderr(StringIO()), self.assertRaises(SystemExit) as error:
            check_beirit.main(["--group", "unknown"])
        self.assertEqual(error.exception.code, 2)
        run.assert_not_called()

    def test_cli_resolves_workspace_when_started_elsewhere(self):
        with TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, str(Path(check_beirit.__file__).resolve()), "--group", "data", "--list"],
                cwd=directory, capture_output=True, text=True, check=True,
            )
        self.assertIn("scripts/check_portfolio_data.py", result.stdout)
        self.assertNotIn("npm", result.stdout)


if __name__ == "__main__":
    unittest.main()
