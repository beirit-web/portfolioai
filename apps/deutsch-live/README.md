# Deutsch Lernen Fullstack

Portfolio-Demo mit veröffentlichtem Quellcode. Hosting- und Zahlungswerte sind
Muster; echte Zugangsdaten und Zahlungsaufrufe gehören nicht in diese Demo.
Die historischen Production-Runbooks dienen als Beispiele, nicht als aktive
Betriebsanweisung.

DeutschLive ist jetzt Teil der Webplattform für Sprachdienstleistungen unter
`http://127.0.0.1:8000/deutschlive/`. Der gemeinsame Frontend-Quellcode
liegt weiterhin hier. `npm --prefix apps/deutsch-live/frontend run build:platform`
baut die Plattformvariante mit gemeinsamer Anmeldung und lokalem Audioplayer nach
`sprachdienstleistungen/assets/deutschlive-dist`. Das integrierte Backend liegt in
`sprachdienstleistungen/lessons`; das nachfolgend beschriebene eigenständige Backend
bleibt als Entwicklungsstand erhalten. DeutschLive wird im Beirit-Portfolio nicht
mehr als separates Projekt aufgeführt.

Fullstack-Version der ursprünglichen statischen Lernseite: React rendert die Oberfläche, Django liefert die Inhalte als JSON-API.

## Struktur

- `backend/` - Django-Projekt mit der App `lessons`
- `frontend/` - Vite + React + TypeScript
- `frontend/src/styles/main.scss` - Tailwind-Einstieg und Custom-SCSS
- `frontend/src/i18n/ru.json` - russische UI-Texte als Standardsprache
- `frontend/src/i18n/de.json` - vorbereitete optionale deutsche UI-Texte
- `frontend/src/i18n/learningContent.json` - deutsche Lerninhalte mit russischer Erklärung

## Entwicklung starten

ENV-Struktur:

- `backend/.env` - veröffentlichte fiktive Musterdaten, identisch mit `.env.example`
- `backend/.env.local` - lokale Overrides, ignoriert
- `backend/.env.production` - Produktionswerte, ignoriert
- `backend/.env.example` - getrackte Vorlage mit fiktiven Musterdaten
- `frontend/.env` - veröffentlichte fiktive Musterdaten, identisch mit `.env.example`
- `frontend/.env.local` - lokale Frontend-Werte, ignoriert
- `frontend/.env.production` - Produktionswerte, ignoriert
- `frontend/.env.example` - getrackte Vorlage

`DJANGO_ENV=local` lädt zusätzlich `.env.local`, `DJANGO_ENV=production` zusätzlich
`.env.production`. Diese lokalen Overrides und `.env.original` bleiben ignoriert.
Alle ENV-Dateien enthalten ausschließlich Musterdaten; echte Zugangsdaten gehören
nicht in diese Portfolio-Demo.

Sicherheitsrelevante Werte wie `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, sichere Cookies, SSL-Redirect und HSTS werden über ENV gesteuert. In Production bricht Django absichtlich ab, wenn `DJANGO_SECRET_KEY` oder `DJANGO_ALLOWED_HOSTS` nicht sicher gesetzt sind.

HTTPS-, Cookie- und HSTS-Pflichtwerte fuer Production sind in [docs/production-security.md](docs/production-security.md) dokumentiert.

Design-Leitplanken stehen in [docs/design-system.md](docs/design-system.md), [docs/brand-identity.md](docs/brand-identity.md), [docs/icon-style.md](docs/icon-style.md) und [docs/design-qa.md](docs/design-qa.md).

Locale-Regeln fuer russische UI, Erklaersprache und deutsche Lernsprache stehen in [docs/locale.md](docs/locale.md).

Theme-Kontext fuer `system`, `light` und `dark` steht in [docs/theme.md](docs/theme.md).

Die Backend-Middleware-Reihenfolge und ihre Verantwortungsgrenzen stehen in [docs/middleware-order.md](docs/middleware-order.md).

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Die App läuft dann über Vite unter `http://localhost:5173`. API-Anfragen an `/api/...` werden im Dev-Server an Django auf `http://127.0.0.1:8000` weitergeleitet.

## Im lokalen Netzwerk öffnen

Wenn du die App auf Handy, Tablet oder einem anderen Rechner im gleichen WLAN öffnen möchtest:

1. Backend starten:

```bash
cd backend
source .venv/bin/activate
DJANGO_DEV_ORIGINS="http://DEINE-IP:5173" python manage.py runserver 127.0.0.1:8000
```

2. Frontend starten:

```bash
cd frontend
npm run dev
```

3. Auf dem anderen Gerät öffnen:

```text
http://DEINE-IP:5173
```

`DEINE-IP` ist die lokale IP-Adresse deines Computers im WLAN, zum Beispiel `192.0.2.10`. Vite zeigt diese Adresse beim Start meistens als `Network:` an.



## Frontend-Styling

Tailwind CSS ist die primäre Styling-Basis. `frontend/src/styles/main.scss` nutzt Tailwind `@layer` und `@apply` nur für globale Basisregeln und wiederverwendbare Komponentenklassen wie `.glass`, `.pill` und Statusklassen.

Dark Mode ist für einen späteren Hell/Dunkel/System-Schalter vorbereitet: Tailwind nutzt `data-theme="dark"`, initialisiert über `frontend/src/theme.ts`.

Die Markenidentitaet steht in [docs/brand-identity.md](docs/brand-identity.md). Der Icon- und Illustrationsstil steht in [docs/icon-style.md](docs/icon-style.md). Das Designsystem mit Tokens, Typografie, Spacing, Radius, Schatten und Komponentenregeln steht in [docs/design-system.md](docs/design-system.md).

## Statische Dateien und Build-Artefakte

Es gibt zwei Auslieferungswege:

- Standalone-DeutschLive-App: `apps/deutsch-live/Dockerfile` baut das Frontend und kopiert das Ergebnis nach `backend/frontend_dist`. Django/WhiteNoise liefert diese Dateien über `WHITENOISE_ROOT`.
- Eingebettet in die Hauptseite: `apps/deutsch-live/frontend/vite.config.ts` baut nach `server/assets/deutschlive-dist`, damit die Route `/deutschlive/` im Haupt-Django-Projekt die SPA laden kann.

Vor einem Release:

```bash
cd frontend
npm run build
```

Dieser Standard-Build erzeugt die eingebetteten Hauptseiten-Artefakte unter `server/assets/deutschlive-dist`.

Für die eigenständige DeutschLive-Docker-App wird in `apps/deutsch-live/Dockerfile` explizit gebaut mit:

```bash
VITE_OUT_DIR=dist VITE_STATIC_BASE=/ VITE_APP_BASE= npm run build
```

Danach müssen `index.html`, ein JS-Bundle und ein CSS-Bundle im jeweiligen Zielverzeichnis vorhanden sein. Der Backend-Check `python manage.py production_check` warnt, wenn der Standalone-Build unter `WHITENOISE_ROOT/index.html` fehlt.

## Datenbank

Standard lokal ist SQLite über:

```env
DATABASE_URL=sqlite:///db.sqlite3
```

Für PostgreSQL wird `DATABASE_URL` gesetzt, zum Beispiel:

```env
DATABASE_URL=postgresql://deutschlive:PASSWORT@localhost:5432/deutschlive
```

Der PostgreSQL-Treiber `psycopg[binary]` ist in `backend/requirements.txt` vorbereitet. In Production sollte `DATABASE_URL` auf die Produktionsdatenbank zeigen und nicht ins Git committed werden.

Production nutzt zusaetzlich `DATABASE_CONN_MAX_AGE`, `DATABASE_SSL_REQUIRE`, `DATABASE_BACKUP_STRATEGY` und `DATABASE_BACKUP_RETENTION_DAYS`. Die konkrete Migrations- und Backup-Strategie steht in [docs/production-database.md](docs/production-database.md).

## Redis

Production nutzt Redis fuer Cache/Rate-Limits und Channels. Lokal bleibt der In-Memory-Fallback aktiv. Die ENV- und Launch-Gates stehen in [docs/production-redis.md](docs/production-redis.md).

## AI Provider

Schreibkorrekturen laufen ueber eine Provider-Fassade mit lokalem Fallback. Der Aufbau ist in [docs/ai-provider.md](docs/ai-provider.md) dokumentiert.

## API

Die API läuft unter `/api/` und ist in [docs/api.md](docs/api.md) dokumentiert.

Grundregeln:

- Erfolgreiche Antworten liefern eine klare Top-Level-Resource wie `user`, `topics`, `exercise` oder `ok`.
- Fehlerantworten nutzen `{"error": "...", "code": "machine_readable_code"}`.
- Authentifizierte Endpunkte nutzen Django-Session, CSRF und den signierten HttpOnly-Auth-Token.
- Neue API-Endpunkte müssen Methode, Auth-Anforderung, Request-Shape, Response-Shape und Fehlercodes dokumentieren.

## Produktbereiche

- Startseite: kurze Projektidee, Vorteile, Beispielszene und klare CTAs
- Szenen lernen: Dialoge, Übersetzungen, Aussprache, Erklärungen und kleine Übungen ohne Quiz
- Quiz-Modus: Multiple Choice und freie Texteingaben mit temporären Gastpunkten oder gespeicherten Kontopunkten
- Schreibtraining: freies Schreiben mit Korrektur, Erklärung, Rückfragen und gespeichertem Verlauf
- Dashboard: Fortschritt, Quizpunkte, letzte Übungen, abgeschlossene Szenen, Wörter und Empfehlungen
- Handbuch: eigene Route `/manual` oder `/handbuch` mit FAQ, Methoden und Modus-Erklärungen

## Sprachstruktur

Die Plattform richtet sich an Menschen mit Russisch als Erstsprache, die Deutsch lernen.

- Russisch: Navigation, Erklärungen, Hilfetexte, Aufgabenstellungen und Systemmeldungen
- Deutsch: Lerninhalte, Beispielsätze, Dialoge und gezielte Quizfragen
- UI-Texte werden in `frontend/src/i18n/ru.json` gepflegt
- Deutsche Lerninhalte und russische Erklärungen werden in `frontend/src/i18n/learningContent.json` vorbereitet

## Admin und Sicherheit

Der Django-Admin liegt nicht mehr unter `/admin/`, sondern standardmäßig unter `/secure-admin/`.
Der Pfad kann per Umgebungsvariable angepasst werden:

```bash
DJANGO_ADMIN_URL="mein-geheimer-admin/" python manage.py runserver
```

Weitere Sicherheitsbausteine:

- sessionbasierte Authentifizierung mit CSRF-Schutz
- signierter HttpOnly-Auth-Token mit begrenzter Laufzeit (`AUTH_TOKEN_MAX_AGE`, Standard: 7200 Sekunden)
- Rollen `learner`, `mentor`, `content_manager`
- geschützte Dashboard-, Quiz-, Bot- und Settings-Routen
- serverseitige Admin-Rollenprüfung für Staff/Superuser und erlaubte Rollen
- Admin-Zugriff nur für Staff/Superuser oder freigegebene Staff-Rollen über Django-Rechte
- Login-Rate-Limiting über Django Cache
- sichere Cookie- und Header-Basiseinstellungen in `backend/config/settings.py`

## Production Check

Vor einem öffentlichen Release kann die Backend-Konfiguration maschinell geprüft werden:

```bash
cd backend
DJANGO_ENV=production python manage.py production_check
```

Für CI oder Deploy-Gates:

```bash
DJANGO_ENV=production python manage.py production_check --json --fail-on-warning
```

Der Check prüft unter anderem `DEBUG=False`, explizite `ALLOWED_HOSTS`, CSRF-Origins, sichere Cookies, SSL-Redirect, HSTS, Datenbanktyp, transaktionalen Mailversand und die öffentliche DeutschLive-URL.

## Monitoring

DeutschLive stellt unter `/api/health/` einen schlanken Health-Endpoint für Uptime-Checks bereit. Die Antwort enthält nur den Gesamtstatus und den Datenbank-Check, damit keine internen Konfigurationsdetails öffentlich werden.

Fehler- und Security-Events laufen über die Django-Logging-Konfiguration in `backend/config/settings.py`. Relevante ENV-Werte sind:

- `LOG_LEVEL`
- `DJANGO_LOG_LEVEL`
- `SECURITY_LOG_LEVEL`
- `MONITORING_PROVIDER`
- `SENTRY_DSN`

Standard ist `MONITORING_PROVIDER=logs`. Für externes Error-Tracking kann später `sentry` aktiviert werden, sobald die Sentry-Dependency und ein echter `SENTRY_DSN` ergänzt sind.

Die zentrale Logging- und Monitoring-Strategie steht in [docs/monitoring.md](docs/monitoring.md). Die Request-Pipeline ist in [docs/middleware-order.md](docs/middleware-order.md) dokumentiert. Production-Mailversand und DNS-Pruefung stehen in [docs/production-email.md](docs/production-email.md). Das Public-Launch-Gate steht in [docs/public-launch-check.md](docs/public-launch-check.md).

## CI

Der GitHub-Actions-Workflow `.github/workflows/deutschlive-ci.yml` prüft DeutschLive bei Pull Requests und Pushes auf `main`/`master`:

- Backend-Abhängigkeiten installieren
- `python manage.py test lessons.tests`
- `python manage.py check` für die lokale Portfolio-Demo
- eingebettete Frontend-Artefakte bauen
- Standalone-Frontend-Artefakte für die Docker-App bauen

Die CI führt ausschließlich Builds und Prüfungen aus. Automatische Deployments sind deaktiviert; die Hosting-Dateien sind Musterdaten ohne aktive Konten. Alle Pushes gehen an `git@github.com:beiritdigital/angefangenes-portfolio.git`.

## Datenmodell

Vorbereitet sind:

- `UserProfile`
- `Scene` und `SceneLine`
- `QuizQuestion`
- `QuizResult` als Domänenname für gespeicherte Quiz-Ergebnisse
- `UserProgress`
- `UserVocabulary`
- `ChatHistory`
- `Achievement`

## Lokaler Audioplayer

Unter `/recordings` (eingebettet `/deutschlive/recordings`) finden Nutzer „Meine Aufnahmen“. Audiodateien werden vom Gerät importiert und als Blobs in IndexedDB gespeichert. Es gibt keine Upload-API, keine Audiodaten auf dem Server und keine Belastung der Server-Datenbank durch Aufnahmen. Die lokale Liste ist je Konto-ID bzw. Gastmodus getrennt; getrennte Browser und Geräte synchronisieren sich nicht.

Der Player bietet native Wiedergabe mit Zeitleiste und Lautstärke, vorherige/nächste Aufnahme, Wiederholung, Tempo, Suche, Download der Originaldatei und Entfernen aus der lokalen Sammlung. Unterstützte Dateien: MP3, WAV, OGG/OGA, WebM, M4A, AAC und FLAC; bis 100 MB pro Datei. Die tatsächliche Wiedergabe hängt vom Browser-Codec ab. Speicherfehler und nicht abspielbare Dateien werden in der Oberfläche angezeigt.

Browserdaten können vom Nutzer oder Browser gelöscht werden. „Herunterladen“ sichert deshalb die Originaldatei außerhalb des Browsers. Die Datenbankmigration des Portfolio-Projekts aktualisiert nur die DeutschLive-Beschreibung und blendet die bisherige Musikplayer-Karte aus.
