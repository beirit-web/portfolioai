#!/usr/bin/env bash
# Secure SQLite backup: copies DB, compresses, encrypts, and prunes old backups.
set -euo pipefail

umask 077

DATA_ROOT="${DATA_ROOT:-/data}"
DB_PATH="${DB_PATH:-${DATA_ROOT}/db.sqlite3}"
BACKUP_DIR="${DB_BACKUP_PATH:-${DATA_ROOT}/db_backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
# Default to widely supported cipher to avoid AEAD issues on some images.
OPENSSL_CIPHER="${OPENSSL_CIPHER:-aes-256-cbc}"

if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  echo "ERROR: BACKUP_PASSPHRASE not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

ts="$(TZ=Europe/Berlin date +%d.%m.%Y-%H%M%S)"
sqlite_backup="${tmpdir}/db-${ts}.sqlite"
sqlite3 "$DB_PATH" ".backup '$sqlite_backup'"

gzip -9 <"$sqlite_backup" >"${sqlite_backup}.gz"
encrypted="${BACKUP_DIR}/db-${ts}.sqlite.gz.enc"

# Some Render images ship OpenSSL without GCM in `enc`. Fallback to AES-256-CBC.
if ! openssl enc -"${OPENSSL_CIPHER}" -pbkdf2 -salt \
  -in "${sqlite_backup}.gz" \
  -out "$encrypted" \
  -pass env:BACKUP_PASSPHRASE; then
  echo "ERROR: openssl encryption failed with cipher ${OPENSSL_CIPHER}" >&2
  exit 1
fi

if command -v openssl >/dev/null; then
  openssl dgst -sha256 -hmac "$BACKUP_PASSPHRASE" "$encrypted" > "${encrypted}.sha256"
fi

echo "Encrypted backup written to $encrypted"

# Optional pruning
if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ && "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -type f -name "db-*.sqlite.gz.enc" -mtime +"$RETENTION_DAYS" -delete
fi
