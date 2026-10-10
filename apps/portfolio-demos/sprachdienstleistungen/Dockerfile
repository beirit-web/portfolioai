ARG PYTHON_VERSION=3.13-slim

FROM python:${PYTHON_VERSION}

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN mkdir -p /code

WORKDIR /code

COPY requirements.txt /tmp/requirements.txt
RUN set -ex && \
    pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache/
COPY . /code

# Public portfolio container: only sample hosts and build-time placeholder routes.
ENV DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,languages.example.invalid
ENV CSRF_TRUSTED_ORIGINS=http://localhost:8000,https://languages.example.invalid
ENV SITE_URL=https://languages.example.invalid
RUN DJANGO_SECRET_KEY=build-time-placeholder-not-for-runtime \
    DJANGO_ADMIN_URL=build-admin-placeholder/ \
    DJANGO_AUTH_URL_PREFIX=build-auth-placeholder/ \
    DJANGO_PASSWORD_RESET_INVALID_URL=build-auth-placeholder/reset/ \
    DJANGO_PASSWORD_RESET_URL=build-password-reset-placeholder/ \
    DJANGO_PASSWORD_RESET_DONE_URL=build-password-reset-placeholder/done/ \
    DJANGO_PASSWORD_RESET_CONFIRM_PREFIX=build-reset-confirm-placeholder/ \
    DJANGO_PASSWORD_RESET_COMPLETE_URL=build-reset-confirm-placeholder/done/ \
    python manage.py collectstatic --noinput
RUN chmod +x /code/bin/entrypoint.sh /code/bin/fly-secrets-import.sh /code/utils/secure_backup.sh

EXPOSE 8000

ENTRYPOINT ["/code/bin/entrypoint.sh"]
CMD ["gunicorn","--bind",":8000","--workers","2","config.wsgi"]
