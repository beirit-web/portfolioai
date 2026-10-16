"""Run the same portfolio checks locally and in GitHub Actions."""

import argparse
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from run_browser_checks import check_environment


GROUPS = ("data", "frontend", "backend", "browser")


def check_steps(workspace, groups):
    """Keep build and test commands in one place for local and CI runs."""
    plans = {
        "data": [
            (workspace, [sys.executable, "scripts/test_check_beirit.py"]),
            (workspace, [sys.executable, "scripts/test_browser_servers.py"]),
            (workspace, [sys.executable, "scripts/test_portfolio_data.py"]),
            (workspace, [sys.executable, "scripts/check_portfolio_data.py"]),
        ],
        "frontend": [
            (workspace / "frontend", ["npm", "test"]),
            (workspace / "frontend", ["npm", "run", "build"]),
            (workspace / "frontend", ["npm", "run", "build:housing"]),
            (workspace / "apps/deutsch-live", ["npx", "--no-install", "tsc", "--noEmit"]),
            (workspace / "apps/deutsch-live", ["npm", "run", "build"]),
        ],
        "backend": [
            (workspace, [sys.executable, "-m", "pip", "check"]),
            (workspace / "server", [sys.executable, "manage.py", "check"]),
            (workspace / "server", [sys.executable, "manage.py", "makemigrations", "--check", "--dry-run"]),
            (workspace / "server", [sys.executable, "manage.py", "test", "--noinput"]),
        ],
        "browser": [
            (workspace / "frontend", ["npm", "run", "test:browser"]),
            (workspace / "frontend", ["npm", "run", "test:housing"]),
        ],
    }
    return [step for group in dict.fromkeys(groups) for step in plans[group]]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=GROUPS, action="append",
                        help="Run a group; repeat to combine groups. Defaults to all groups.")
    parser.add_argument("--list", action="store_true", help="Print commands without running them.")
    args = parser.parse_args(argv)
    workspace = Path(__file__).resolve().parents[1]
    steps = check_steps(workspace, args.group or GROUPS)
    if args.list:
        for cwd, command in steps:
            print(f"{cwd.relative_to(workspace)}: {' '.join(command)}")
        return 0

    with TemporaryDirectory(prefix="beirit-checks-") as directory:
        env = check_environment(directory)
        try:
            for cwd, command in steps:
                print(f"\n{cwd.relative_to(workspace)}: {' '.join(command)}", flush=True)
                subprocess.run(command, cwd=cwd, env=env, check=True)
        except subprocess.CalledProcessError as error:
            return error.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
