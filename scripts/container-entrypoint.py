#!/usr/bin/env python3
"""Prepare persistent paths, back up SQLite, migrate and start the web server."""

from datetime import datetime, timezone
import os
from pathlib import Path
import pwd
import sqlite3
import sys
import uuid


def runtime_path(key, default, app_dir):
    path = Path(os.environ.get(key) or default).expanduser()
    return path if path.is_absolute() else app_dir / path


def positive_integer(key, default, maximum):
    try:
        value = int(os.environ.get(key, str(default)))
    except ValueError:
        raise SystemExit(f"{key} must be a positive integer.") from None
    if not 1 <= value <= maximum:
        raise SystemExit(f"{key} is outside the supported range.")
    return value


def main():
    os.umask(0o077)
    secret = next((os.environ[key] for key in ("DJANGO_SECRET_KEY", "SECRET_KEY")
                   if os.environ.get(key, "").strip()), "")
    if not secret or secret.lower().startswith((
        "fake-", "demo-", "example-", "replace-", "change-me", "django-insecure-",
    )):
        raise SystemExit("Set a private runtime DJANGO_SECRET_KEY or SECRET_KEY.")

    app_dir = Path(os.environ.get("APP_DIR", "/code")).resolve()
    os.chdir(app_dir)
    os.environ["DJANGO_SETTINGS_MODULE"] = "container_settings"
    db_path = runtime_path("DB_PATH", "/data/db.sqlite3", app_dir)
    backup_dir = runtime_path("DB_BACKUP_PATH", "/data/db_backups", app_dir)
    media_dir = runtime_path("MEDIA_ROOT", "/data/media", app_dir)
    port = positive_integer("PORT", 8000, 65535)
    workers = positive_integer("WEB_CONCURRENCY", 1, 32)
    threads = positive_integer("GUNICORN_THREADS", 4, 64)

    directories = {db_path.parent, backup_dir, media_dir}
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
    backup_dir.chmod(0o700)

    if os.geteuid() == 0:
        account = pwd.getpwnam("app")
        # Do not recursively change ownership of unrelated volume contents.
        owned_paths = directories | {Path(str(db_path) + suffix)
                                     for suffix in ("", "-wal", "-shm", "-journal")}
        for path in owned_paths:
            if path.exists():
                os.chown(path, account.pw_uid, account.pw_gid)
        os.setgroups([])
        os.setgid(account.pw_gid)
        os.setuid(account.pw_uid)

    import django
    django.setup()
    from django.core.management import call_command
    from django.db import connections
    from django.db.migrations.executor import MigrationExecutor

    # A migration plan reads schema metadata only. Backups are needed only when
    # a schema/data migration is pending, so ordinary restarts use no extra disk.
    database_exists = db_path.exists() and db_path.stat().st_size > 0
    executor = MigrationExecutor(connections["default"])
    pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
    connections.close_all()
    if database_exists and pending:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = backup_dir / f"before-migrate-{stamp}-{uuid.uuid4().hex[:8]}.sqlite3"
        try:
            with sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True) as source:
                with sqlite3.connect(backup) as destination:
                    source.backup(destination)
        except Exception:
            # Fail closed without reporting database content or credentials.
            raise SystemExit("Database backup failed; migration was not started.") from None
        print("Database backup completed before migration.", flush=True)

    call_command("migrate", interactive=False, verbosity=1)
    connections.close_all()
    os.execvp("gunicorn", [
        "gunicorn", "config.wsgi:application",
        "--bind", f"0.0.0.0:{port}",
        "--workers", str(workers),
        "--threads", str(threads),
        "--timeout", "60", "--graceful-timeout", "30",
        "--error-logfile", "-",
    ])


if __name__ == "__main__":
    main()
