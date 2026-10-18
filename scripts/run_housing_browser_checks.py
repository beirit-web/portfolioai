"""Run a disposable housing backend whose database survives child restarts.

Start from the repository root with
``server/.venv/bin/python scripts/run_housing_browser_checks.py --port 8766``. Sending
SIGUSR1 to this parent process restarts only Django; SIGTERM/SIGINT stop both
processes and remove the temporary database. A local JSON-lines stdin channel
can obtain a verification link for its fictional pending test accounts. The
browser follows the real confirmation view; no fixture endpoint is exposed.
"""

import argparse
import json
from pathlib import Path
from queue import Empty, Queue
import re
import signal
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Thread

from run_browser_checks import check_environment, check_loopback_port, run_migrations, stop_child


SERVER_DIR = Path(__file__).resolve().parents[1] / "server"

VERIFICATION_LINK_SCRIPT = """
import json
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()
from django.contrib.auth import get_user_model
from pages.verification import build_email_verification_url
username = os.environ["HOUSING_BROWSER_USERNAME"]
user = get_user_model().objects.get(
    username=username, email=f"{username}@example.invalid", is_active=False,
    profile__email_verification_pending=True,
)
print(json.dumps({"url": build_email_verification_url(user, next_url="/wohnungssuche/login")}))
"""


def handle_control(command, env):
    """Use this runner's disposable DB and signing key, never a running app API."""
    identifier = command.get("id")
    try:
        username = command.get("username", "")
        if command.get("command") != "verification_link" or not re.fullmatch(
            r"housing-(?:a|b|errors)-[0-9a-f]{8}", username,
        ):
            raise ValueError("Only this suite's fictional housing accounts are accepted")
        result = subprocess.run(
            [sys.executable, "-c", VERIFICATION_LINK_SCRIPT],
            cwd=SERVER_DIR, env={**env, "HOUSING_BROWSER_USERNAME": username},
            capture_output=True, text=True, check=True, timeout=15,
        )
        response = {"id": identifier, **json.loads(result.stdout)}
    except (ValueError, TypeError, subprocess.SubprocessError) as error:
        response = {"id": identifier, "error": str(error)}
    print("HOUSING_BROWSER_CONTROL " + json.dumps(response), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--control-stdin", action="store_true", help="Enable the local fixture control channel")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535")
    check_loopback_port(args.port)

    stopping = False
    restarting = False

    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    def restart(_signum, _frame):
        nonlocal restarting
        restarting = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGUSR1, restart)

    commands = Queue()

    def read_control():
        for line in sys.stdin:
            try:
                command = json.loads(line)
                if isinstance(command, dict):
                    commands.put(command)
            except ValueError:
                continue

    if args.control_stdin:
        Thread(target=read_control, daemon=True).start()

    with TemporaryDirectory(prefix="beirit-housing-browser-") as directory:
        env = check_environment(directory)
        origin = f"http://127.0.0.1:{args.port}"
        env.update({"SITE_URL": origin, "CSRF_TRUSTED_ORIGINS": origin})
        status = run_migrations(env, lambda: stopping)
        if status or stopping:
            return status

        process = None
        generation = 0
        try:
            while not stopping:
                generation += 1
                process = subprocess.Popen(
                    [sys.executable, "manage.py", "runserver", f"127.0.0.1:{args.port}", "--noreload"],
                    cwd=SERVER_DIR, env=env,
                )
                print(f"HOUSING_BROWSER_STARTED generation={generation} pid={process.pid}", flush=True)
                while not stopping and not restarting:
                    try:
                        handle_control(commands.get_nowait(), env)
                    except Empty:
                        pass
                    try:
                        return process.wait(timeout=0.2)
                    except subprocess.TimeoutExpired:
                        pass
                stop_child(process)
                process = None
                restarting = False
            return 0
        finally:
            if process is not None:
                stop_child(process)


if __name__ == "__main__":
    sys.exit(main())
