# DeutschLive Logging And Monitoring

Stand: 2026-07-14

DeutschLive nutzt im MVP strukturierte Django-Logs als primären Monitoring-Provider.

Externes Error-Tracking bleibt vorbereitet. Es wird erst mit echter Dependency, DSN und Datenschutzprüfung aktiviert.

Die Middleware-Reihenfolge und die Grenzen zwischen Logging, Security, Auth, Rate-Limit und API-Fehlern sind in [middleware-order.md](middleware-order.md) dokumentiert.

Persistente sicherheitsrelevante Audit-Events sind in [audit.md](audit.md) dokumentiert.

## Provider

`MONITORING_PROVIDER=logs` ist der Standard.

Vorbereitete ENV-Werte:

- `LOG_LEVEL` fuer App-Logs aus `lessons`
- `DJANGO_LOG_LEVEL` fuer Django-Request-Logs
- `SECURITY_LOG_LEVEL` fuer Security-Events aus `lessons.security`
- `REQUEST_LOG_LEVEL` fuer sichere Request-Metadaten aus `lessons.request`
- `REQUEST_LOGGING_ENABLED` zum Aktivieren oder Deaktivieren der API-Request-Logs
- `MONITORING_PROVIDER` fuer spaetere Provider-Auswahl
- `SENTRY_DSN` fuer spaetere Sentry-Aktivierung

## Logger

| Logger | Zweck |
| --- | --- |
| `django.request` | HTTP-Fehler, 4xx/5xx und Request-Warnungen. |
| `lessons` | App-Services, AI, Billing, Mail, Realtime und fachliche Fehler. |
| `lessons.security` | Security-Events, Rate-Limits, Staff-Denials und Login-Fehler. |
| `lessons.request` | API-Request-ID, Methode, Pfad, Status, Dauer und sicherer User-Kontext. |

## Request Logging

`lessons.middleware.RequestLoggingMiddleware` erzeugt oder uebernimmt `X-Request-ID` und schreibt sie auf jede Response.

Geloggte Felder:

- `request_id`
- HTTP-Methode
- Pfad ohne Querystring
- Statuscode
- Dauer in Millisekunden
- `user_id` oder `anonymous`
- `authenticated`

Nicht geloggt werden:

- Request-Body
- Querystring
- Cookies
- Authorization-Header
- CSRF-Werte
- Passwoerter, Tokens, Secrets oder Keys

Sensible Kontextfelder werden ueber `mask_sensitive_context()` vor dem Logging maskiert.

## Request Context

`lessons.middleware.RequestContextMiddleware` stellt `request.app_context` fuer Sprache, Theme, User, Device, Request-ID und IP bereit. Details stehen in `docs/request-context.md`.

## API Error Logging

`lessons.middleware.APIErrorMiddleware` wandelt unerwartete API-Exceptions in JSON-Fehler um und loggt sie ueber `lessons.request`.

- `API_ERROR_LOGGING_ENABLED=true` aktiviert Exception-Logging.
- `API_ERROR_INCLUDE_DEBUG=false` verhindert Debug-Details in Client-Antworten.
- Middleware-generierte Fehler koennen `requestId` enthalten, damit Frontend-Fehler und Serverlogs zusammengefuehrt werden koennen.

## Security Events

Security-Events laufen ueber `log_security_event(event, **context)` und sollen keine Secrets, Passwoerter, Tokens oder vollstaendige Payloads enthalten.

Aktuelle Event-Kategorien:

- `login_failed`
- `rate_limit_blocked`
- `session_expired`
- `session_token_invalid`
- `upload_rejected`
- `premium_route_denied`
- `staff_route_forbidden`

Neue sicherheitsrelevante Flows sollen ein eigenes stabiles Event benennen, z. B. `billing_webhook_rejected` oder `password_reset_requested`.

## Rate-Limit Monitoring

Rate-Limits werden zentral in `lessons.middleware.RateLimitMiddleware` geprüft.

Geblockte Requests erzeugen ein `rate_limit_blocked` Security-Event mit:

- Policy-Name
- maskiertem Cache-Key
- Limit
- Request-ID, falls vorhanden

Die eigentlichen Limits sind in `settings.RATE_LIMIT_POLICIES` definiert und ueber `RATE_LIMIT_*` ENV-Werte steuerbar.

## Error Codes

API-Fehler nutzen `error_response(message, status=..., code=...)`.

Regeln:

- `code` ist snake_case und stabil.
- `message` ist nutzerfreundlich und darf keine internen Details leaken.
- Providerfehler bekommen eigene Codes, z. B. `stripe_checkout_failed`.
- Auth-/Permission-Codes bleiben eindeutig: `auth_required`, `premium_required`, `staff_required`.
- Premium-Middleware-Blocks schreiben zusaetzlich ein AuditEvent `permission_denied` mit Policy, Fallback und Request-Pfad.
- Rate-Limits nutzen `rate_limited`, solange kein spezifischerer Code gebraucht wird.

## Health Check

`GET /api/health/` ist oeffentlich und fuer Uptime-Checks gedacht.

Die Antwort enthaelt nur:

- `ok`
- `checks.database`

Der Endpoint darf keine Secrets, internen Hostnamen, ENV-Werte oder Providerdetails ausgeben.

Der Endpoint bleibt auch bei aktivem Maintenance Mode erreichbar.

## Maintenance Mode

`lessons.middleware.MaintenanceModeMiddleware` kann API-Traffic waehrend Deployments, Migrationen oder Notfaellen mit `503` blockieren.

- `MAINTENANCE_MODE=true` aktiviert den Modus.
- `MAINTENANCE_RETRY_AFTER_SECONDS` setzt den `Retry-After`-Header.
- `/api/health/` und der konfigurierte Admin-Pfad bleiben erreichbar.
- Details stehen in `docs/maintenance.md`.

## Realtime WebSockets

`lessons.realtime_middleware.RealtimeAccessMiddleware` prueft WebSocket-Verbindungen auf Authentifizierung, erlaubte Rolle und Verbindungsrate.

- Realtime-Close-Code `4401`: nicht authentifiziert.
- Realtime-Close-Code `4403`: nicht erlaubt.
- Realtime-Close-Code `4429`: zu viele Verbindungsversuche.
- Details stehen in `docs/realtime-websocket.md`.

## Alerting MVP

Bis ein externer Provider aktiviert ist, gelten diese Quellen als Launch-relevant:

- Application logs des Hostings
- `django.request` 5xx-Fehler
- `lessons.security` Warnungen
- `/api/health/` Uptime-Check
- `production_check --json --fail-on-warning` vor Deployments

## Sentry-Ausbaupfad

Sentry wird erst aktiviert, wenn alle Punkte erledigt sind:

- Dependency ist bewusst hinzugefuegt.
- `SENTRY_DSN` ist in Production gesetzt und nicht im Git.
- PII-/Breadcrumb-Konfiguration wurde geprüft.
- Sampling und Environment-Tags sind definiert.
- Datenschutztext wurde aktualisiert.

Bis dahin bleibt `MONITORING_PROVIDER=logs` die produktive Basis.
