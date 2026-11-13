# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS assets
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY apps/deutsch-live/package.json apps/deutsch-live/package-lock.json ./apps/deutsch-live/
RUN npm --prefix frontend ci --no-audit --no-fund \
    && npm --prefix apps/deutsch-live ci --no-audit --no-fund
COPY frontend/ ./frontend/
COPY apps/deutsch-live/ ./apps/deutsch-live/
COPY apps/wohnungssuche/ ./apps/wohnungssuche/
COPY server/assets/ ./server/assets/
COPY server/templates/ ./server/templates/
RUN npm --prefix frontend run build \
    && npm --prefix apps/deutsch-live run build \
    && npm --prefix apps/wohnungssuche run build

FROM python:3.13-slim-bookworm AS python-dependencies
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

FROM python-dependencies AS static-files
WORKDIR /code
COPY server/ ./
COPY --from=assets /build/server/assets/ ./assets/
# Only the committed fictional sample is used during the build. Runtime secrets
# are neither build arguments nor files in the build context.
RUN python - <<'PY'
import os
from dotenv import load_dotenv
load_dotenv(".env.example", override=True)
os.environ.update({
    "DJANGO_SETTINGS_MODULE": "config.settings",
    "DJANGO_DEBUG": "False",
    "DEBUG": "False",
    "DB_PATH": "/tmp/static-build/db.sqlite3",
    "DB_BACKUP_PATH": "/tmp/static-build/backups",
    "MEDIA_ROOT": "/tmp/static-build/media",
    "STATIC_ROOT": "/code/staticfiles",
})
from django.core.management import execute_from_command_line
execute_from_command_line(["manage.py", "collectstatic", "--noinput"])
PY

FROM python-dependencies AS runtime
ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_REVISION
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app
WORKDIR /code
COPY --from=static-files /code/ /code/
COPY apps/deutsch-live/src/seo/routes.json /apps/deutsch-live/src/seo/routes.json
COPY scripts/container_settings.py /usr/local/lib/portfolio/container_settings.py
COPY --chmod=755 scripts/container-entrypoint.py /usr/local/bin/container-entrypoint.py
# Source archives can inherit restrictive directory modes from the host umask.
# These paths contain public application code, never private runtime files.
RUN chmod -R a+rX /code /apps/deutsch-live /usr/local/lib/portfolio
ENV APP_DIR=/code \
    PYTHONPATH=/code:/usr/local/lib/portfolio \
    DJANGO_SETTINGS_MODULE=container_settings \
    DB_PATH=/data/db.sqlite3 \
    DB_BACKUP_PATH=/data/db_backups \
    MEDIA_ROOT=/data/media \
    STATIC_ROOT=/code/staticfiles \
    PORT=8000 \
    WEB_CONCURRENCY=1 \
    GUNICORN_THREADS=4
# Fail the build if the runtime user cannot import the application or templates.
# Only fictional settings and temporary data are used; Fly supplies runtime secrets.
RUN python - <<'PY'
import os
from tempfile import TemporaryDirectory
from dotenv import load_dotenv

os.setgroups([])
os.setgid(10001)
os.setuid(10001)
load_dotenv("/code/.env.example", override=True)
with TemporaryDirectory(prefix="container-check-") as temporary:
    os.environ.update({
        "DB_PATH": temporary + "/db.sqlite3",
        "DB_BACKUP_PATH": temporary + "/backups",
        "MEDIA_ROOT": temporary + "/media",
    })
    import django
    django.setup()
    from django.core.management import call_command
    from django.template.loader import get_template
    call_command("check")
    get_template("base_public.html")
print("Runtime imports and templates verified as UID 10001.")
PY
EXPOSE 8000
# The entrypoint prepares only configured data paths, then drops root before
# loading Django, backing up the database, running migrations and serving HTTP.
ENTRYPOINT ["python", "/usr/local/bin/container-entrypoint.py"]
