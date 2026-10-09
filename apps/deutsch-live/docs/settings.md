# DeutschLive Settings-Struktur

Stand: 2026-07-14

Die zentrale Django-Settings-Datei bleibt `backend/config/settings.py`. Sie ist nach Themenblöcken aufgebaut, damit lokale Entwicklung, Production-Konfiguration und sicherheitskritische Werte leichter prüfbar bleiben.

## Lade-Reihenfolge

1. echte Shell-ENV-Werte
2. `backend/.env`
3. `backend/.env.local` bei `DJANGO_ENV!=production`
4. `backend/.env.production` bei `DJANGO_ENV=production`

Echte Shell-ENV-Werte haben Vorrang vor Dateien.

## Themenblöcke

- Core Django: `DJANGO_ENV`, `DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_ADMIN_URL`
- Database and cache: `DATABASE_URL`, Cache-Backend
- Static assets: `WHITENOISE_ROOT`
- CORS, CSRF and browser security: Origins, sichere Cookies, SSL, HSTS, Proxy-Header
- Billing: Stripe, PayPal, Success-/Cancel-URLs
- Public URLs and transactional mail: `DEUTSCHLIVE_PUBLIC_URL`, SMTP, Absender, Kontaktadresse
- Upload security: maximale Upload-Größe und erlaubte Content-Types
- Logging and monitoring: Log-Level, Security-Log-Level, Monitoring-Provider, Sentry-DSN
- AI features: OpenAI-Key, Modell, Feature-Flags
- Realtime and Channels: Redis, Channel-Layer, Realtime-Feature-Flags

## Builder-Funktionen

Komplexere Settings werden über kleine Builder-Funktionen erzeugt:

- `build_database_settings()`
- `build_cache_settings()`
- `build_logging_settings()`
- `build_channel_layers()`

Dadurch bleiben die finalen Django-Variablen (`DATABASES`, `CACHES`, `LOGGING`, `CHANNEL_LAYERS`) explizit sichtbar, ohne große verschachtelte Blöcke im Hauptfluss der Datei.

Die Logging- und Monitoring-Strategie ist in [monitoring.md](monitoring.md) dokumentiert.

Die produktive SMTP- und Mail-DNS-Pruefung ist in [production-email.md](production-email.md) dokumentiert.
