import sqlite3
import tarfile
import tempfile
from pathlib import Path

from django.test import SimpleTestCase

from pages.sqlite_transfer import copy_sqlite, extract_sqlite_archive, summarize_sqlite


class SQLiteTransferHelpersTests(SimpleTestCase):
    def test_extract_archive_and_summarize_sqlite(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            source_db = tmpdir_path / "render.sqlite3"
            archive_path = tmpdir_path / "render.tar.gz"
            extracted_dir = tmpdir_path / "out"

            self._build_sqlite(source_db, user_count=3, profile_count=2)

            with tarfile.open(archive_path, mode="w:gz") as archive:
                archive.add(source_db, arcname="nested/render.sqlite3")

            extracted_db = extract_sqlite_archive(archive_path, extracted_dir)
            summary = summarize_sqlite(extracted_db)

            self.assertEqual(extracted_db.name, "render.sqlite3")
            self.assertEqual(summary["auth_user"], 3)
            self.assertEqual(summary["pages_profile"], 2)

    def test_copy_sqlite_clones_rows(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            source_db = tmpdir_path / "source.sqlite3"
            target_db = tmpdir_path / "target.sqlite3"

            self._build_sqlite(source_db, user_count=4, profile_count=4)
            copy_sqlite(source_db, target_db)

            summary = summarize_sqlite(target_db)
            self.assertEqual(summary["auth_user"], 4)
            self.assertEqual(summary["pages_profile"], 4)

    def _build_sqlite(self, path: Path, user_count: int, profile_count: int):
        with sqlite3.connect(path) as connection:
            cursor = connection.cursor()
            cursor.execute("CREATE TABLE auth_user (id INTEGER PRIMARY KEY, username TEXT)")
            cursor.execute(
                "CREATE TABLE pages_profile (id INTEGER PRIMARY KEY, user_id INTEGER, image_name TEXT)"
            )
            for index in range(user_count):
                cursor.execute(
                    "INSERT INTO auth_user (id, username) VALUES (?, ?)",
                    (index + 1, f"user-{index + 1}"),
                )
            for index in range(profile_count):
                cursor.execute(
                    "INSERT INTO pages_profile (id, user_id, image_name) VALUES (?, ?, ?)",
                    (index + 1, min(index + 1, user_count or 1), f"img-{index + 1}.png"),
                )
            connection.commit()
