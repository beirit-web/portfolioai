"""Run the built site locally with disposable data for Playwright."""

import os
from pathlib import Path
import signal
import subprocess
import sys
from tempfile import TemporaryDirectory


SERVER_DIR = Path(__file__).resolve().parent.parent


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
    with TemporaryDirectory(prefix="beirit-browser-") as directory:
        env = check_environment(directory)
        subprocess.run(
            [sys.executable, "manage.py", "migrate", "--noinput"],
            cwd=SERVER_DIR, env=env, check=True,
        )
        process = subprocess.Popen(
            [sys.executable, "manage.py", "runserver", "127.0.0.1:8765", "--noreload"],
            cwd=SERVER_DIR, env=env,
        )

        def stop(signum, frame):
            process.terminate()

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        try:
            return process.wait()
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)


if __name__ == "__main__":
    sys.exit(main())
