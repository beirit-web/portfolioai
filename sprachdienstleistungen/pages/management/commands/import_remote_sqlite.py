import os
import tempfile
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connections

from pages.sqlite_transfer import (
    copy_sqlite,
    download_archive,
    extract_sqlite_archive,
    summarize_sqlite,
)


class Command(BaseCommand):
    help = (
        "Importiert eine per codeX exportierte SQLite-Datei "
        "aus einem Render-Archiv in die lokale/Fly-Datenbank."
    )

    def add_arguments(self, parser):
        source_group = parser.add_mutually_exclusive_group(required=True)
        source_group.add_argument(
            "--url",
            help="HTTPS-URL zum Render-Export (tar.gz mit genau einer .sqlite3-Datei).",
        )
        source_group.add_argument(
            "--archive",
            help="Pfad zu einem bereits heruntergeladenen Render-Export (.tar.gz).",
        )
        parser.add_argument(
            "--token",
            default="",
            help="Optionaler X-Codex-Token für den Remote-Download.",
        )
        parser.add_argument(
            "--skip-backup",
            action="store_true",
            help="Kein Backup der aktuellen Ziel-Datenbank vor dem Austausch erstellen.",
        )
        parser.add_argument(
            "--keep",
            type=int,
            default=10,
            help="Anzahl der Import-Backups in DB_BACKUP_PATH, die behalten werden.",
        )

    def handle(self, *args, **options):
        connection = connections["default"]
        if connection.vendor != "sqlite":
            raise CommandError("import_remote_sqlite unterstützt nur SQLite.")

        target_path = Path(connection.settings_dict["NAME"]).expanduser()
        target_path.parent.mkdir(parents=True, exist_ok=True)

        backup_dir = Path(getattr(settings, "DB_BACKUP_PATH", settings.BASE_DIR / "backups"))
        backup_dir.mkdir(parents=True, exist_ok=True)

        if target_path.exists():
            self.stdout.write(f"Aktuelle Ziel-DB: {target_path}")
            self._write_summary("Aktuelle Ziel-DB", summarize_sqlite(target_path))
        else:
            self.stdout.write(f"Ziel-DB existiert noch nicht: {target_path}")

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            if options["archive"]:
                archive_path = Path(options["archive"]).expanduser()
                if not archive_path.exists():
                    raise CommandError(f"Archiv nicht gefunden: {archive_path}")
            else:
                archive_path = tmpdir_path / "render-export.tar.gz"
                self.stdout.write(f"Lade Render-Export herunter: {options['url']}")
                try:
                    download_archive(options["url"], archive_path, options["token"])
                except Exception as exc:
                    raise CommandError(f"Download fehlgeschlagen: {exc}") from exc

            try:
                imported_sqlite = extract_sqlite_archive(archive_path, tmpdir_path)
                imported_summary = summarize_sqlite(imported_sqlite)
            except Exception as exc:
                raise CommandError(f"Import-Datei ungültig: {exc}") from exc

            self._write_summary("Render-Export", imported_summary)

            if target_path.exists() and not options["skip_backup"]:
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                backup_path = backup_dir / f"{target_path.stem}-before-import-{timestamp}.sqlite3"
                copy_sqlite(target_path, backup_path)
                self.stdout.write(self.style.SUCCESS(f"Backup gespeichert: {backup_path}"))
                self._rotate_backups(backup_dir, target_path.stem, max(0, int(options["keep"])))

            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            staged_path = target_path.parent / f".{target_path.name}.incoming-{timestamp}"

            connections.close_all()
            copy_sqlite(imported_sqlite, staged_path)
            os.replace(staged_path, target_path)

        self._write_summary("Neue Ziel-DB", summarize_sqlite(target_path))
        self.stdout.write(self.style.SUCCESS(f"SQLite-Import abgeschlossen: {target_path}"))
        self.stdout.write(
            self.style.WARNING(
                "Fly-Anwendung jetzt neu starten, damit alle Prozesse die neue DB neu öffnen."
            )
        )

    def _rotate_backups(self, backup_dir: Path, stem: str, keep: int):
        if keep <= 0:
            return

        backups = sorted(backup_dir.glob(f"{stem}-before-import-*.sqlite3"))
        for old_path in backups[:-keep]:
            try:
                old_path.unlink()
            except OSError:
                continue

    def _write_summary(self, label: str, summary: dict[str, int]):
        self.stdout.write(f"{label}:")
        if not summary:
            self.stdout.write("  Keine bekannten Tabellen gefunden.")
            return
        for table_name, count in summary.items():
            self.stdout.write(f"  {table_name}: {count}")
