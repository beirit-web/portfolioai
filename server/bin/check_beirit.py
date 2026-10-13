"""Run Beirit's local regression, backend and browser checks together."""

from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from run_browser_checks import check_environment


def main():
    workspace = Path(__file__).resolve().parents[2]
    with TemporaryDirectory(prefix="beirit-checks-") as directory:
        env = check_environment(directory)
        steps = [
            (workspace / "frontend", ["npm", "test"]),
            (workspace / "frontend", ["npm", "run", "build"]),
            (workspace / "frontend", ["npm", "run", "build:housing"]),
            (workspace / "server", [sys.executable, "manage.py", "check"]),
            (workspace / "server", [sys.executable, "manage.py", "makemigrations", "--check", "--dry-run"]),
            (workspace / "server", [sys.executable, "manage.py", "test"]),
            (workspace / "frontend", ["npm", "run", "test:browser"]),
            (workspace / "frontend", ["npm", "run", "test:housing"]),
        ]
        for cwd, command in steps:
            print(f"\n{cwd.name}: {' '.join(command)}", flush=True)
            subprocess.run(command, cwd=cwd, env=env, check=True)


if __name__ == "__main__":
    main()
