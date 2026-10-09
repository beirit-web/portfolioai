# Middleware Order

DeutschLive hält die Request-Pipeline bewusst in kleine, klar begrenzte Middleware-Schichten aufgeteilt. Jede Middleware hat eine eigene Verantwortung; fachliche View-Logik bleibt in Views/Services.

## Reihenfolge

| Reihenfolge | Middleware                                                | Verantwortung                                          |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------ |
| 1           | `corsheaders.middleware.CorsMiddleware`                   | CORS-Header frueh setzen                               |
| 2           | `django.middleware.security.SecurityMiddleware`           | Django-Browser-Security-Basics                         |
| 3           | `lessons.middleware.SecurityHeadersMiddleware`            | CSP, Permissions-Policy, Opener-Policy                 |
| 4           | `whitenoise.middleware.WhiteNoiseMiddleware`              | statische Assets ausliefern                            |
| 5           | `django.contrib.sessions.middleware.SessionMiddleware`    | Django-Session laden                                   |
| 6           | `django.middleware.common.CommonMiddleware`               | Django-Common-Verhalten                                |
| 7           | `django.middleware.csrf.CsrfViewMiddleware`               | CSRF-Schutz fuer unsafe Requests                       |
| 8           | `django.contrib.auth.middleware.AuthenticationMiddleware` | `request.user` bereitstellen                           |
| 9           | `lessons.middleware.RequestLoggingMiddleware`             | Request-ID und Request-Logging                         |
| 10          | `lessons.middleware.APIErrorMiddleware`                   | API-Fehler als JSON normalisieren                      |
| 11          | `lessons.middleware.SessionSecurityMiddleware`            | Session-Token und Idle-Timeout pruefen                 |
| 12          | `lessons.middleware.MaintenanceModeMiddleware`            | API-Wartungsmodus vor teurer Verarbeitung              |
| 13          | `lessons.middleware.UploadValidationMiddleware`           | Multipart-Uploads validieren                           |
| 14          | `lessons.middleware.RateLimitMiddleware`                  | zentrale API-Limits anwenden                           |
| 15          | `lessons.middleware.AuditContextMiddleware`               | Audit-Metadaten bereitstellen                          |
| 16          | `lessons.middleware.LocaleContextMiddleware`              | UI-/Erklaer-/Lernsprache aufloesen                     |
| 17          | `lessons.middleware.ThemeContextMiddleware`               | Theme-Preference und resolved Theme aufloesen          |
| 18          | `lessons.middleware.RequestContextMiddleware`             | Sprache, Theme, User, Device und Requestdaten buendeln |
| 19          | `lessons.middleware.PremiumAccessMiddleware`              | Premium-/Content-Routen zentral schuetzen              |
| 20          | `django.contrib.messages.middleware.MessageMiddleware`    | Django-Messages                                        |
| 21          | `django.middleware.clickjacking.XFrameOptionsMiddleware`  | Frame-Schutz                                           |

## Begründung

- Security-Header laufen frueh, damit auch Fehlerantworten und statische Antworten gehaertet werden.
- Session, CSRF und Authentication muessen vor allen eigenen Auth-/Permission-Schichten laufen.
- Request-Logging umschliesst die eigenen Middleware-Entscheidungen und protokolliert auch fruehe Blocks.
- API-Error-Normalisierung steht vor eigenen blockierenden Middleware-Schichten, damit unerwartete API-Fehler JSON bleiben.
- Maintenance und Upload-Validation laufen vor Rate-Limits, damit Wartungsblocks keine Limits verbrauchen und gefaehrliche Uploads frueh stoppen.
- Locale und Theme laufen vor Request Context, weil der Kontext ihre aufgeloesten Werte buendelt.
- Premium Access laeuft spaet, damit Auth, Session, Rate-Limit, Audit, Locale, Theme und Request Context bereits bereitstehen.

## Development Und Production

- Lokal nutzt Cache/Channels standardmaessig In-Memory; Production sollte Redis fuer Rate-Limits und WebSocket-Limits nutzen.
- CSP ist in Development standardmaessig als Report-Only vorbereitet; Production soll echte CSP-/Permissions-Policy-Werte setzen.
- `MAINTENANCE_MODE` ist in beiden Umgebungen verfuegbar, aber standardmaessig deaktiviert.
- `API_ERROR_INCLUDE_DEBUG` darf in Production nicht aktiviert werden.
- Upload-, Rate-Limit-, Session- und Premium-Schalter bleiben per ENV steuerbar, aber Production sollte sie aktiviert lassen.

## Nicht-Ziele

- Keine Middleware soll View- oder Service-Fachlogik uebernehmen.
- Keine Middleware soll mehrere unabhaengige Verantwortungen sammeln.
- Route-spezifische Business-Entscheidungen bleiben in Policies, Decorators oder Services dokumentiert.
