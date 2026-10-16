"""Run a disposable housing backend whose database survives child restarts.

Start from the repository root with
``server/.venv/bin/python scripts/run_housing_browser_checks.py --port 8766``. Sending
SIGUSR1 to this parent process restarts only Django; SIGTERM/SIGINT stop both
processes and remove the temporary database. No application restart endpoint
or fixture account is exposed by the server.
"""

import argparse
from pathlib import Path
import signal
import subprocess
import sys
from tempfile import TemporaryDirectory

from run_browser_checks import check_environment, check_loopback_port, run_migrations, stop_child


SERVER_DIR = Path(__file__).resolve().parents[1] / "server"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
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
