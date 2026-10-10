import sqlite3
from datetime import datetime
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
            backup_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError as exc:
            raise CommandError(f"Backup-Verzeichnis nicht beschreibbar: {backup_dir}") from exc

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = backup_dir / f"{source_path.stem}-{timestamp}.sqlite3"

        self.stdout.write(f"Backing up {source_path} -> {target}")
        with sqlite3.connect(source_path) as src, sqlite3.connect(target) as dst:
            src.backup(dst)

        if keep > 0:
            backups = sorted(backup_dir.glob(f"{source_path.stem}-*.sqlite3"))
            old = backups[:-keep]
            for path in old:
                try:
                    path.unlink()
                except OSError:
                    # ignore cleanup failures
                    continue

        self.stdout.write(self.style.SUCCESS(f"Backup gespeichert: {target}"))
