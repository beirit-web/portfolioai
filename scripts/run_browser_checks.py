"""Run the built site locally with disposable data for Playwright."""

import errno
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory


SERVER_DIR = Path(__file__).resolve().parents[1] / "server"


def check_loopback_port(port):
    """Fail before migrations if local server sockets are unavailable."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(("127.0.0.1", port))
    except OSError as error:
        if error.errno in (errno.EPERM, errno.EACCES):
            reason = (
                "permission denied for local sockets. Run this browser-check command "
                "in an environment that permits loopback binding"
            )
        elif error.errno == errno.EADDRINUSE:
            reason = "port is already in use. Stop the process using this test port"
        else:
            reason = str(error)
        raise SystemExit(f"Cannot start local browser server on 127.0.0.1:{port}: {reason}.") from error


def stop_child(process):
    """Reap a child within the browser runner's shutdown deadline."""
    if process.poll() is not None:
        return
    try:
        process.terminate()
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=3)


def run_setup_command(env, stopping, arguments):
    """Supervise setup so an interrupted startup also reaps its child."""
    process = subprocess.Popen(
        [sys.executable, *arguments],
        cwd=SERVER_DIR, env=env,
    )
    try:
        while not stopping():
            try:
                return process.wait(timeout=0.2)
            except subprocess.TimeoutExpired:
                pass
        return 0
    finally:
        stop_child(process)


def run_migrations(env, stopping):
    return run_setup_command(env, stopping, ["manage.py", "migrate", "--noinput"])


def seed_confirmed_quiz_accounts(env, stopping):
    """Only this disposable database gets already-confirmed quiz test accounts."""
    source = """
from django.contrib.auth import get_user_model
from lessons.models import UserProfile
for viewport in ("mobile", "desktop"):
    email = f"quiz-browser-{viewport}@example.test"
    user = get_user_model().objects.create_user(
        username=email, email=email, password="Example-only-Quiz-42!", is_active=True,
    )
    UserProfile.objects.create(user=user, email_verified=True, interface_language="de")
"""
    return run_setup_command(env, stopping, ["manage.py", "shell", "--no-imports", "-c", source])


def check_environment(directory):
    """Keep checks independent of local data and notification credentials."""
    return {
        **os.environ,
        "DJANGO_ENV": "local",
        "DJANGO_DEBUG": "true",
        "DJANGO_SECRET_KEY": "browser-checks-only",
        "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1,testserver",
        "CSRF_TRUSTED_ORIGINS": "http://127.0.0.1:8765",
        "SITE_URL": "http://127.0.0.1:8765",
        "DB_PATH": f"{directory}/db.sqlite3",
        "DB_BACKUP_PATH": f"{directory}/backups",
        "MEDIA_ROOT": f"{directory}/media",
        "STATIC_ROOT": f"{directory}/static",
        "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
        "REALTIME_NOTIFICATIONS_ENABLED": "false",
        "MAINTENANCE_MODE": "false",
        "LOGIN_REQUIRED": "false",
        "SECURE_SSL_REDIRECT": "false",
        "SESSION_COOKIE_SECURE": "false",
        "CSRF_COOKIE_SECURE": "false",
        "DJANGO_ADMIN_NAME": "",
        "DJANGO_ADMIN_PASSWORD": "",
        "ADMIN_NAME": "",
        "ADMIN_PASSWORD": "",
    }


def main():
    check_loopback_port(8765)
    stopping = False

    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    with TemporaryDirectory(prefix="beirit-browser-") as directory:
        env = check_environment(directory)
        status = run_migrations(env, lambda: stopping)
        if status or stopping:
            return status
        status = seed_confirmed_quiz_accounts(env, lambda: stopping)
        if status or stopping:
            return status
        process = subprocess.Popen(
            [sys.executable, "manage.py", "runserver", "127.0.0.1:8765", "--noreload"],
            cwd=SERVER_DIR, env=env,
        )

        try:
            while not stopping:
                try:
                    return process.wait(timeout=0.2)
                except subprocess.TimeoutExpired:
                    pass
            return 0
        finally:
            stop_child(process)


if __name__ == "__main__":
    sys.exit(main())
