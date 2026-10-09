import shutil
import sqlite3
import tarfile
import urllib.request
from pathlib import Path


SUMMARY_TABLES = (
    "auth_user",
    "pages_profile",
    "pages_chatmessage",
    "pages_chatreply",
    "pages_appointment",
    "pages_interpreterapplication",
    "pages_unavailableday",
    "django_session",
)


def summarize_sqlite(path: Path, table_names=SUMMARY_TABLES) -> dict[str, int]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    with sqlite3.connect(path) as connection:
        cursor = connection.cursor()
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        if not result or result[0] != "ok":
            raise ValueError(f"SQLite integrity_check failed for {path}: {result!r}")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = {row[0] for row in cursor.fetchall()}

        summary: dict[str, int] = {}
        for table_name in table_names:
            if table_name not in existing_tables:
                continue
            quoted = table_name.replace('"', '""')
            cursor.execute(f'SELECT COUNT(*) FROM "{quoted}"')
            summary[table_name] = int(cursor.fetchone()[0])

        return summary


def copy_sqlite(source: Path, target: Path) -> Path:
    source = Path(source)
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(source) as src, sqlite3.connect(target) as dst:
        src.backup(dst)

    return target


def extract_sqlite_archive(archive_path: Path, destination_dir: Path) -> Path:
    archive_path = Path(archive_path)
    destination_dir = Path(destination_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    with tarfile.open(archive_path, mode="r:gz") as archive:
        sqlite_members = [
            member
            for member in archive.getmembers()
            if member.isfile() and Path(member.name).suffix == ".sqlite3"
        ]
        if len(sqlite_members) != 1:
            raise ValueError(
                f"{archive_path} must contain exactly one .sqlite3 file, found {len(sqlite_members)}"
            )

        member = sqlite_members[0]
        target_path = destination_dir / Path(member.name).name
        extracted = archive.extractfile(member)
        if extracted is None:
            raise ValueError(f"Could not read {member.name} from {archive_path}")
        with extracted, target_path.open("wb") as handle:
            shutil.copyfileobj(extracted, handle)

    return target_path


def download_archive(url: str, destination: Path, token: str = "") -> Path:
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)

    headers = {}
    if token:
        headers["X-Codex-Token"] = token

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request) as response, destination.open("wb") as handle:
        shutil.copyfileobj(response, handle)

    return destination
