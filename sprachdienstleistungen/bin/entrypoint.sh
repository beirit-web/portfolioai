#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${DB_PATH:-/data/db.sqlite3}"
DB_DIR="$(dirname "$DB_PATH")"
MEDIA_ROOT="${MEDIA_ROOT:-/data/media}"
STATIC_ROOT="${STATIC_ROOT:-/code/staticfiles}"
DB_BACKUP_PATH="${DB_BACKUP_PATH:-/data/db_backups}"

mkdir -p "$DB_DIR" "$MEDIA_ROOT" "$STATIC_ROOT" "$DB_BACKUP_PATH"

if [[ "${RUN_MIGRATIONS:-1}" == "1" ]]; then
  python manage.py migrate --noinput
fi

exec "$@"
