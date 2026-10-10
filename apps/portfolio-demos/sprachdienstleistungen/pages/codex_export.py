import logging
import os
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseForbidden, HttpResponseNotFound
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)


def _is_enabled():
    return bool(getattr(settings, "CODEX_DB_EXPORT_ENABLED", False))


def _token_valid(request):
    secret = getattr(settings, "CODEX_DB_EXPORT_TOKEN", "")
    provided = request.headers.get("X-Codex-Token") or request.GET.get("token", "")
    return bool(secret) and provided == secret


def _current_db_path() -> Path:
    return Path(settings.DATABASES["default"]["NAME"]).resolve()


def _copy_sqlite_consistently(src: Path, dst: Path):
    # Use SQLite online backup via sqlite3 shell to avoid locking live DB for long.
    # Fallback to file copy if shell unavailable.
    try:
        import sqlite3

        con = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
        bck = sqlite3.connect(dst)
        with bck:
            con.backup(bck)
        con.close()
        bck.close()
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("SQLite backup via api failed, falling back to copy: %s", exc)
        dst.write_bytes(src.read_bytes())


@require_GET
def codex_db_export(request):
    if not _is_enabled():
        return HttpResponseNotFound()

    if not _token_valid(request):
        return HttpResponseForbidden()

    db_path = _current_db_path()
    if not db_path.exists():
        return HttpResponseNotFound()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base_name = f"codex-backup-{timestamp}.sqlite3"

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        sqlite_copy = tmpdir_path / base_name
        tar_path = tmpdir_path / f"{base_name}.tar.gz"

        _copy_sqlite_consistently(db_path, sqlite_copy)

        with tarfile.open(tar_path, mode="w:gz") as tar:
            tar.add(sqlite_copy, arcname=base_name)

        response = FileResponse(open(tar_path, "rb"), as_attachment=True)
        response["Content-Type"] = "application/gzip"
        response["Content-Disposition"] = f"attachment; filename={tar_path.name}"

        if getattr(settings, "CODEX_DB_EXPORT_ONE_SHOT", True):
            # Rotate token to disable endpoint after successful response start.
            os.environ["CODEX_DB_EXPORT_TOKEN"] = ""
            settings.CODEX_DB_EXPORT_ENABLED = False

        return response

