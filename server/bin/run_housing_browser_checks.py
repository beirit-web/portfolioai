"""Run a disposable housing backend whose database survives child restarts.

Start with ``python bin/run_housing_browser_checks.py --port 8766``. Sending
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

from run_browser_checks import check_environment


SERVER_DIR = Path(__file__).resolve().parent.parent


def stop_child(process):
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535")

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
        subprocess.run(
            [sys.executable, "manage.py", "migrate", "--noinput"],
            cwd=SERVER_DIR, env=env, check=True,
        )
        if stopping:
            return 0

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
