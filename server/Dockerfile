ARG PYTHON_VERSION=3.13-slim

FROM python:${PYTHON_VERSION}

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /code

RUN mkdir -p /code

WORKDIR /code

# Build context: repository root, with -f server/Dockerfile.
COPY server/requirements.txt /tmp/requirements.txt
RUN set -ex && \
    pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache/
COPY server/ /code
COPY apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/ /apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/
COPY apps/portfolio-demos/sprachdienstleistungen/templates/modules/ /apps/portfolio-demos/sprachdienstleistungen/templates/modules/
COPY apps/portfolio-demos/vokabelbox/LICENSE /licenses/vokabelbox-MIT.txt

ENV DJANGO_DEBUG=False
ENV NODE_ENV=production
ENV PYTHONPATH=/code

# Public portfolio image: collectstatic uses non-secret build placeholders.
# Local runtime values come from the sanitized example environment.
# Hosting operations and live payments stay disabled in this repository.
RUN DJANGO_SECRET_KEY=build-time-placeholder-not-for-runtime \
    DJANGO_ALLOWED_HOSTS=localhost \
    CSRF_TRUSTED_ORIGINS=https://localhost \
    DJANGO_ADMIN_URL=build-admin-placeholder/ \
    DJANGO_AUTH_URL_PREFIX=build-auth-placeholder/ \
    DJANGO_PASSWORD_RESET_INVALID_URL=build-auth-placeholder/reset/ \
    DJANGO_PASSWORD_RESET_URL=build-password-reset-placeholder/ \
    DJANGO_PASSWORD_RESET_DONE_URL=build-password-reset-placeholder/done/ \
    DJANGO_PASSWORD_RESET_CONFIRM_PREFIX=build-reset-confirm-placeholder/ \
    DJANGO_PASSWORD_RESET_COMPLETE_URL=build-reset-confirm-placeholder/done/ \
    python manage.py collectstatic --noinput
RUN chmod +x /code/bin/entrypoint.sh /code/bin/fly-secrets-import.sh /code/scripts/secure_backup.sh

EXPOSE 8000

ENTRYPOINT ["/code/bin/entrypoint.sh"]
CMD ["gunicorn","--bind",":8000","--workers","2","config.wsgi"]
