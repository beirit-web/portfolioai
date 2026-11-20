import sqlite3
import os
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connections


class Command(BaseCommand):
    help = "Erstellt ein SQLite-Backup in DB_BACKUP_PATH und rotiert alte Sicherungen."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep",
            type=int,
            default=10,
            help="Anzahl der Backups, die behalten werden (ältere werden gelöscht).",
        )

    def handle(self, *args, **options):
        keep = max(0, int(options["keep"]))
        conn = connections["default"]
        if conn.vendor != "sqlite":
            raise CommandError("backup_db unterstützt nur SQLite.")

        source_path = Path(conn.settings_dict["NAME"]).expanduser()
        if not source_path.exists():
            raise CommandError(f"Quelle nicht gefunden: {source_path}")

        backup_dir = Path(getattr(settings, "DB_BACKUP_PATH", settings.BASE_DIR / "backups"))
        try:
            backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        except PermissionError as exc:
            raise CommandError(f"Backup-Verzeichnis nicht beschreibbar: {backup_dir}") from exc

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
        target = backup_dir / f"{source_path.stem}-{timestamp}-{uuid.uuid4().hex[:8]}.sqlite3"
        pending = target.with_suffix(".partial")

        self.stdout.write(f"Backing up {source_path} -> {target}")
        # Create with private permissions before SQLite writes any account data.
        descriptor = os.open(pending, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(descriptor)
        try:
            with closing(sqlite3.connect(source_path.resolve().as_uri() + "?mode=ro", uri=True)) as src, closing(sqlite3.connect(pending)) as dst:
                src.backup(dst)
                if dst.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
                    raise CommandError("Backup integrity check failed.")
            pending.replace(target)
        except (OSError, sqlite3.Error, CommandError):
            pending.unlink(missing_ok=True)
            raise CommandError("Database backup failed; existing backups were retained.") from None

        if keep > 0:
            # Always retain the snapshot just completed, even when timestamps
            # tie or an older backup has a future mtime after a copy/clock change.
            backups = sorted(backup_dir.glob(f"{source_path.stem}-*.sqlite3"), key=lambda path: (path == target, path.stat().st_mtime_ns, path.name))
            old = backups[:-keep]
            for path in old:
                try:
                    path.unlink()
                except OSError:
                    # ignore cleanup failures
                    continue

        self.stdout.write(self.style.SUCCESS(f"Backup gespeichert: {target}"))
