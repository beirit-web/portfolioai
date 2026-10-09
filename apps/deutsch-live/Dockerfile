FROM node:22-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN VITE_OUT_DIR=dist VITE_STATIC_BASE=/ VITE_APP_BASE= npm run build

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_ENV=production
ENV DJANGO_DEBUG=false

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./frontend_dist

RUN DJANGO_ENV=local DJANGO_DEBUG=true DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput

EXPOSE 8000

CMD python manage.py migrate --noinput && uvicorn config.asgi:application --host 0.0.0.0 --port ${PORT:-8000}
