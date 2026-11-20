#!/usr/bin/env bash
# Local/CI smoke test only: no remote deployment and no existing data volumes.
set -euo pipefail
image=${1:?Usage: scripts/check_container.sh IMAGE}
container="beirit-release-check-${RANDOM}-$$"
volume="${container}-data"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT
command -v docker >/dev/null
command -v curl >/dev/null
docker volume create "$volume" >/dev/null
docker run -d --name "$container" \
  --mount "type=volume,source=$volume,target=/data" \
  -p 127.0.0.1::8000 \
  -e DJANGO_SECRET_KEY=fictional-container-check-secret-with-no-production-use-0123456789 \
  -e DJANGO_ALLOWED_HOSTS=portfolio.example.test \
  -e CSRF_TRUSTED_ORIGINS=https://portfolio.example.test \
  -e SITE_URL=https://portfolio.example.test \
  -e ADMIN_URL=admin-container-check/ \
  -e AUTH_URL_PREFIX=auth/ \
  -e PASSWORD_RESET_INVALID_URL=auth/reset/ \
  -e PASSWORD_RESET_URL=password-reset/ \
  -e PASSWORD_RESET_DONE_URL=password-reset/done/ \
  -e PASSWORD_RESET_CONFIRM_PREFIX=reset/ \
  -e PASSWORD_RESET_COMPLETE_URL=reset/done/ \
  "$image" >/dev/null
wait_ready() {
  local port
  # Docker may assign a new ephemeral host port when the container restarts.
  port=$(docker port "$container" 8000/tcp | sed 's/.*://')
  for attempt in {1..60}; do
    if curl --fail --silent --max-time 2 -H 'Host: portfolio.example.test' \
      -H 'X-Forwarded-Proto: https' "http://127.0.0.1:$port/" >/dev/null; then
      return
    fi
    sleep 1
  done
  printf 'Container did not become ready on host port %s.\n' "$port" >&2
  docker logs "$container"
  return 1
}
wait_ready
docker exec "$container" python -c \
  "from pathlib import Path; status=Path('/proc/1/status').read_text(); uid=next(line for line in status.splitlines() if line.startswith('Uid:')); assert uid.split()[1:]==['10001']*4, uid" >/dev/null
docker exec --user 10001 "$container" python manage.py shell -c \
  "from django.contrib.auth import get_user_model; get_user_model().objects.create_user(username='snapshot@example.test', email='snapshot@example.test', password='Fictional-check-42!')" >/dev/null
docker exec --user 10001 "$container" python manage.py backup_db --keep 2 >/dev/null
docker restart "$container" >/dev/null
wait_ready
docker exec --user 10001 "$container" python manage.py shell -c \
  "from django.contrib.auth import get_user_model; assert get_user_model().objects.filter(username='snapshot@example.test').exists()" >/dev/null
docker exec --user 10001 "$container" python -c \
  "from pathlib import Path; import sqlite3; backups=sorted(Path('/data/db_backups').glob('*.sqlite3')); assert backups; source=sqlite3.connect(backups[-1].as_uri()+'?mode=ro', uri=True); restored=sqlite3.connect('/data/restore-check.sqlite3'); source.backup(restored); assert restored.execute('PRAGMA integrity_check').fetchone()==('ok',); assert restored.execute('SELECT email FROM auth_user').fetchall()==[('snapshot@example.test',)]" >/dev/null
logs=$(docker logs "$container" 2>&1)
if [[ "$logs" == *"[ERROR]"* || "$logs" == *"[CRITICAL]"* || "$logs" == *"Traceback (most recent call last)"* ]]; then
  printf '%s\n' "$logs"
  printf '%s\n' 'Container logs contain runtime errors.' >&2
  exit 1
fi
printf '%s\n' 'Container start as UID 10001, persistent accounts, backup, isolated restore and clean logs passed.'
