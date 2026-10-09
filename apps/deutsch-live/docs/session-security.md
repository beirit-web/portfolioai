# Session Security Middleware

`SessionSecurityMiddleware` schuetzt geschuetzte API-Routen durch eine Kombination aus Django-Session und signiertem HttpOnly-Auth-Token.

## Einstellungen

```env
AUTH_TOKEN_MAX_AGE=7200
SESSION_SECURITY_ENABLED=true
SESSION_SECURITY_IDLE_TIMEOUT_SECONDS=7200
```

## Verhalten

- Login und Registrierung nutzen Djangos `login()` und rotieren dadurch die Session-ID.
- Geschuetzte API-Routen verlangen eine authentifizierte Django-Session und ein gueltiges `learning_auth_token` Cookie.
- Das Token ist signiert, HttpOnly, SameSite=Lax und an die User-ID gebunden.
- Geschuetzte API-Requests aktualisieren `session_security_last_activity`.
- Bei abgelaufenem Idle-Timeout wird die Session beendet und das Auth-Token geloescht.

## Oeffentliche Ausnahmen

Oeffentliche API-Routen wie `/api/health/`, `/api/auth/login/`, `/api/auth/register/`, `/api/feedback/`, `/api/topics/` und Provider-Webhooks bleiben ohne Auth-Token erreichbar. Die konkrete Liste steht in `SESSION_SECURITY_EXEMPT_PATHS`.

## Fehlercodes

| Status | Code | Bedeutung |
| --- | --- | --- |
| `401` | `session_invalid` | Django-Session ist authentifiziert, aber das signierte Auth-Token fehlt oder ist ungueltig |
| `401` | `session_expired` | Idle-Timeout wurde ueberschritten |

Beide Faelle schreiben Security Events und setzen `X-Session-Status`.
