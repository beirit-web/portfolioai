"""Check local-server diagnostics and shutdown without opening network ports."""

from contextlib import redirect_stdout
import errno
from io import StringIO
from pathlib import Path
import signal
import socket
import subprocess
import unittest
from unittest.mock import Mock, call, patch

import run_browser_checks
import run_housing_browser_checks


RUNNERS = (run_browser_checks, run_housing_browser_checks)


class LoopbackPortTests(unittest.TestCase):
    @patch("run_browser_checks.socket.socket")
    def test_probe_binds_only_loopback_and_closes_socket(self, create_socket):
        connection = create_socket.return_value.__enter__.return_value
        run_browser_checks.check_loopback_port(8765)
        create_socket.assert_called_once_with(socket.AF_INET, socket.SOCK_STREAM)
        connection.setsockopt.assert_called_once_with(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        connection.bind.assert_called_once_with(("127.0.0.1", 8765))
        create_socket.return_value.__exit__.assert_called_once()

    def test_blocked_socket_reports_permission_and_closes_socket(self):
        for error_number in (errno.EPERM, errno.EACCES):
            with self.subTest(error_number=error_number), patch("run_browser_checks.socket.socket") as create_socket:
                connection = create_socket.return_value.__enter__.return_value
                connection.bind.side_effect = OSError(error_number, "operation denied")
                with self.assertRaises(SystemExit) as error:
                    run_browser_checks.check_loopback_port(8765)
                self.assertIn("permission", str(error.exception).lower())
                self.assertIn("8765", str(error.exception))
                create_socket.return_value.__exit__.assert_called_once()

    @patch("run_browser_checks.socket.socket", side_effect=PermissionError(errno.EPERM, "operation denied"))
    def test_blocked_socket_creation_reports_permission(self, create_socket):
        with self.assertRaises(SystemExit) as error:
            run_browser_checks.check_loopback_port(8765)
        self.assertIn("permission", str(error.exception).lower())
        self.assertIn("8765", str(error.exception))

    @patch("run_browser_checks.socket.socket")
    def test_occupied_port_is_reported_separately(self, create_socket):
        create_socket.return_value.__enter__.return_value.bind.side_effect = OSError(
            errno.EADDRINUSE, "address already in use",
        )
        with self.assertRaises(SystemExit) as error:
            run_browser_checks.check_loopback_port(8870)
        self.assertIn("in use", str(error.exception).lower())
        self.assertIn("8870", str(error.exception))

    @patch("run_browser_checks.socket.socket")
    def test_other_socket_errors_preserve_useful_diagnostic(self, create_socket):
        create_socket.return_value.__enter__.return_value.bind.side_effect = OSError(
            errno.EAFNOSUPPORT, "address family unavailable",
        )
        with self.assertRaises(SystemExit) as error:
            run_browser_checks.check_loopback_port(8765)
        self.assertIn("address family unavailable", str(error.exception))


class ChildShutdownTests(unittest.TestCase):
    def test_finished_child_needs_no_signal_or_wait(self):
        process = Mock()
        process.poll.return_value = 0
        run_browser_checks.stop_child(process)
        process.terminate.assert_not_called()
        process.kill.assert_not_called()
        process.wait.assert_not_called()

    def test_running_child_gets_a_bounded_graceful_shutdown(self):
        process = Mock()
        process.poll.return_value = None
        run_browser_checks.stop_child(process)
        process.terminate.assert_called_once_with()
        process.wait.assert_called_once_with(timeout=5)
        process.kill.assert_not_called()

    def test_unresponsive_child_is_killed_with_a_second_bounded_wait(self):
        process = Mock()
        process.poll.return_value = None
        process.wait.side_effect = [subprocess.TimeoutExpired("server", 5), 0]
        run_browser_checks.stop_child(process)
        process.terminate.assert_called_once_with()
        process.kill.assert_called_once_with()
        self.assertEqual(process.wait.call_args_list, [call(timeout=5), call(timeout=3)])


class MigrationTests(unittest.TestCase):
    @patch("run_browser_checks.subprocess.Popen")
    def test_completed_migration_preserves_exit_status(self, start):
        process = start.return_value
        process.wait.return_value = 17
        process.poll.return_value = 17
        environment = {"DB_PATH": "/tmp/fictional-browser-check/db.sqlite3"}
        self.assertEqual(run_browser_checks.run_migrations(environment, lambda: False), 17)
        command = start.call_args.args[0]
        self.assertEqual(command[1:], ["manage.py", "migrate", "--noinput"])
        self.assertEqual(start.call_args.kwargs["cwd"], run_browser_checks.SERVER_DIR)
        self.assertEqual(start.call_args.kwargs["env"], environment)
        process.terminate.assert_not_called()
        process.kill.assert_not_called()

    @patch("run_browser_checks.subprocess.Popen")
    def test_stopping_during_migration_terminates_and_reaps_child(self, start):
        stopping = False

        def wait_for_child(timeout):
            nonlocal stopping
            if timeout == 0.2:
                stopping = True
                raise subprocess.TimeoutExpired("migrate", timeout)
            return 0

        process = start.return_value
        process.poll.return_value = None
        process.wait.side_effect = wait_for_child
        self.assertEqual(run_browser_checks.run_migrations({}, lambda: stopping), 0)
        process.terminate.assert_called_once_with()
        process.kill.assert_not_called()
        self.assertEqual(process.wait.call_args_list, [call(timeout=0.2), call(timeout=5)])

    @patch("run_browser_checks.subprocess.Popen")
    def test_stopping_unresponsive_migration_uses_bounded_kill_fallback(self, start):
        stopping = False

        def wait_for_child(timeout):
            nonlocal stopping
            if timeout == 0.2:
                stopping = True
            if timeout in (0.2, 5):
                raise subprocess.TimeoutExpired("migrate", timeout)
            return 0

        process = start.return_value
        process.poll.return_value = None
        process.wait.side_effect = wait_for_child
        self.assertEqual(run_browser_checks.run_migrations({}, lambda: stopping), 0)
        process.terminate.assert_called_once_with()
        process.kill.assert_called_once_with()
        self.assertEqual(process.wait.call_args_list, [call(timeout=0.2), call(timeout=5), call(timeout=3)])


class BrowserRunnerTests(unittest.TestCase):
    def setUp(self):
        patcher = patch.object(run_browser_checks, "seed_confirmed_quiz_accounts", return_value=0)
        self.seed_accounts = patcher.start()
        self.addCleanup(patcher.stop)

    def test_port_blockade_stops_both_runners_before_any_data_or_process(self):
        for runner, port in ((run_browser_checks, 8765), (run_housing_browser_checks, 8873)):
            with self.subTest(runner=runner.__name__), \
                    patch.object(runner, "check_loopback_port", side_effect=SystemExit("permission denied")) as probe, \
                    patch.object(runner, "TemporaryDirectory") as temporary_directory, \
                    patch.object(runner, "run_migrations", return_value=0) as migrate, \
                    patch.object(runner.subprocess, "Popen") as start, \
                    patch.object(runner.signal, "signal"), \
                    patch("sys.argv", [runner.__file__, "--port", str(port)]):
                with self.assertRaises(SystemExit):
                    runner.main()
                probe.assert_called_once_with(port)
                temporary_directory.assert_not_called()
                migrate.assert_not_called()
                start.assert_not_called()

    def test_normal_child_exit_preserves_status_and_removes_temporary_data(self):
        for runner in RUNNERS:
            with self.subTest(runner=runner.__name__), \
                    patch.object(runner, "check_loopback_port"), \
                    patch.object(runner, "run_migrations", return_value=0), \
                    patch.object(runner.subprocess, "Popen") as start, \
                    patch.object(runner.signal, "signal"), \
                    patch("sys.argv", [runner.__file__]), redirect_stdout(StringIO()):
                process = start.return_value
                process.wait.return_value = 7
                process.poll.return_value = 7
                self.assertEqual(runner.main(), 7)
                temporary_database = Path(start.call_args.kwargs["env"]["DB_PATH"])
                self.assertFalse(temporary_database.parent.exists())
                process.terminate.assert_not_called()
                process.kill.assert_not_called()

    def test_sigterm_and_sigint_stop_both_runners_and_remove_temporary_data(self):
        for runner in RUNNERS:
            for stop_signal in (signal.SIGTERM, signal.SIGINT):
                handlers = {}

                def register_signal(signum, handler):
                    handlers[signum] = handler

                def wait_for_child(timeout):
                    if timeout == 0.2:
                        handlers[stop_signal](stop_signal, None)
                        raise subprocess.TimeoutExpired("server", timeout)
                    return 0

                with self.subTest(runner=runner.__name__, stop_signal=stop_signal), \
                        patch.object(runner, "check_loopback_port"), \
                        patch.object(runner, "run_migrations", return_value=0), \
                        patch.object(runner.subprocess, "Popen") as start, \
                        patch.object(runner.signal, "signal", side_effect=register_signal), \
                        patch("sys.argv", [runner.__file__]), redirect_stdout(StringIO()):
                    process = start.return_value
                    process.poll.return_value = None
                    process.wait.side_effect = wait_for_child
                    self.assertEqual(runner.main(), 0)
                    temporary_database = Path(start.call_args.kwargs["env"]["DB_PATH"])
                    self.assertFalse(temporary_database.parent.exists())
                    process.terminate.assert_called_once_with()
                    process.kill.assert_not_called()
                    self.assertIn(call(timeout=0.2), process.wait.call_args_list)
                    self.assertIn(call(timeout=5), process.wait.call_args_list)

    def test_migration_failure_cleans_temporary_data_without_starting_server(self):
        for runner in RUNNERS:
            with self.subTest(runner=runner.__name__), \
                    patch.object(runner, "check_loopback_port"), \
                    patch.object(runner, "run_migrations", return_value=19) as migrate, \
                    patch.object(runner.subprocess, "Popen") as start, \
                    patch.object(runner.signal, "signal"), \
                    patch("sys.argv", [runner.__file__]):
                self.assertEqual(runner.main(), 19)
                temporary_database = Path(migrate.call_args.args[0]["DB_PATH"])
                self.assertFalse(temporary_database.parent.exists())
                start.assert_not_called()

    def test_quiz_fixture_failure_removes_temporary_data_without_starting_server(self):
        self.seed_accounts.return_value = 23
        with patch.object(run_browser_checks, "check_loopback_port"), \
                patch.object(run_browser_checks, "run_migrations", return_value=0), \
                patch.object(run_browser_checks.subprocess, "Popen") as start, \
                patch.object(run_browser_checks.signal, "signal"):
            self.assertEqual(run_browser_checks.main(), 23)
        temporary_database = Path(self.seed_accounts.call_args.args[0]["DB_PATH"])
        self.assertFalse(temporary_database.parent.exists())
        start.assert_not_called()

    def test_signal_during_migration_cleans_temporary_data_without_starting_server(self):
        for runner in RUNNERS:
            for stop_signal in (signal.SIGTERM, signal.SIGINT):
                handlers = {}

                def register_signal(signum, handler):
                    handlers[signum] = handler

                def migrate_and_stop(env, stopping):
                    self.assertFalse(stopping())
                    handlers[stop_signal](stop_signal, None)
                    self.assertTrue(stopping())
                    return 0

                with self.subTest(runner=runner.__name__, stop_signal=stop_signal), \
                        patch.object(runner, "check_loopback_port"), \
                        patch.object(runner, "run_migrations", side_effect=migrate_and_stop) as migrate, \
                        patch.object(runner.subprocess, "Popen") as start, \
                        patch.object(runner.signal, "signal", side_effect=register_signal), \
                        patch("sys.argv", [runner.__file__]):
                    self.assertEqual(runner.main(), 0)
                    temporary_database = Path(migrate.call_args.args[0]["DB_PATH"])
                    self.assertFalse(temporary_database.parent.exists())
                    start.assert_not_called()

    def test_housing_restart_stops_old_child_and_preserves_disposable_database(self):
        runner = run_housing_browser_checks
        handlers = {}
        events = []
        databases = []
        children = [Mock(pid=101), Mock(pid=102)]
        for index, process in enumerate(children, start=1):
            process.poll.return_value = None
            process.terminate.side_effect = lambda index=index: events.append(f"stop-{index}")

        def register_signal(signum, handler):
            handlers[signum] = handler

        def wait_for_restart(timeout):
            if timeout == 0.2:
                handlers[signal.SIGUSR1](signal.SIGUSR1, None)
                raise subprocess.TimeoutExpired("server", timeout)
            return 0

        def wait_for_stop(timeout):
            if timeout == 0.2:
                handlers[signal.SIGTERM](signal.SIGTERM, None)
                raise subprocess.TimeoutExpired("server", timeout)
            return 0

        def start_child(command, *, cwd, env):
            database = Path(env["DB_PATH"])
            index = len(databases)
            if index == 0:
                database.write_text("fictional restart sentinel")
            else:
                self.assertEqual(database, databases[0])
                self.assertEqual(database.read_text(), "fictional restart sentinel")
            databases.append(database)
            events.append(f"start-{index + 1}")
            return children[index]

        children[0].wait.side_effect = wait_for_restart
        children[1].wait.side_effect = wait_for_stop
        output = StringIO()
        with patch.object(runner, "check_loopback_port"), \
                patch.object(runner, "run_migrations", return_value=0), \
                patch.object(runner.subprocess, "Popen", side_effect=start_child), \
                patch.object(runner.signal, "signal", side_effect=register_signal), \
                patch("sys.argv", [runner.__file__]), redirect_stdout(output):
            self.assertEqual(runner.main(), 0)
        self.assertEqual(events, ["start-1", "stop-1", "start-2", "stop-2"])
        self.assertEqual(len(databases), 2)
        self.assertFalse(databases[0].parent.exists())
        self.assertIn("HOUSING_BROWSER_STARTED generation=1 pid=101", output.getvalue())
        self.assertIn("HOUSING_BROWSER_STARTED generation=2 pid=102", output.getvalue())
        for process in children:
            process.terminate.assert_called_once_with()
            process.kill.assert_not_called()


if __name__ == "__main__":
    unittest.main()
