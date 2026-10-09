# DeutschLive API

Base path: `/api/`

The API is JSON-only. Frontend requests use Django session authentication and CSRF protection for unsafe methods.

A signed HttpOnly auth cookie acts as an additional session-bound token.

## Response Conventions

Successful responses return a top-level resource key:

- `{"user": ...}`
- `{"topics": [...]}`
- `{"exercise": ...}`
- `{"ok": true}`

Errors use the shared backend helper `error_response`:

```json
{
  "error": "Human readable message.",
  "code": "machine_readable_code"
}
```

API-Fehlerseiten und unerwartete Exceptions werden von `APIErrorMiddleware` ebenfalls als JSON normalisiert. Details: `docs/api-errors.md`.

Die Middleware-Reihenfolge und Verantwortungsgrenzen sind in `docs/middleware-order.md` dokumentiert.

Common status codes:

- `400` invalid input or invalid webhook payload
- `401` authentication required
- `402` premium access required
- `403` staff or account access denied
- `404` unknown resource
- `413` upload too large
- `415` unsupported upload type
- `429` rate limit reached
- `503` maintenance mode or temporary service outage
- `501` provider or webhook not configured
- `502` upstream checkout provider failed

## Auth And CSRF

- `GET /api/auth/csrf/` sets the CSRF cookie and returns `csrfToken`.
- Unsafe methods require the CSRF token unless explicitly marked webhook-only.
- Authenticated routes use `api_login_required`.
- Geschuetzte API-Routen verlangen zusaetzlich ein gueltiges signiertes `learning_auth_token`; Details: `docs/session-security.md`.
- Premium-only routes are classified by `PremiumAccessMiddleware`; view decorators such as `premium_required` remain a route-level fallback. Details: `docs/premium-access.md`.
- Staff-only routes use `staff_required`.
- Stripe and PayPal webhooks are CSRF-exempt and must use provider signature or provider validation.

## Locale Context

Server-Default ist Russisch (`ru`). Die Locale-Aufloesung ist in `docs/locale.md` dokumentiert.

API-Antworten koennen diese Header enthalten:

- `Content-Language`
- `X-Interface-Language`
- `X-Explanation-Language`
- `X-Learning-Language`

`X-Learning-Language` bleibt `de`, damit deutsche Lerninhalte klar von der UI-Sprache getrennt bleiben.

## Theme Context

Theme-Regeln sind in `docs/theme.md` dokumentiert.

API-Antworten koennen diese Header enthalten:

- `X-Theme-Preference`
- `X-Resolved-Theme`

Profil-Settings enthalten `themePreference` mit `system`, `light` oder `dark`.

## Request Context

API-Requests erhalten serverseitig `request.app_context` fuer Sprache, Theme, User und Device. Details: `docs/request-context.md`.

## Rate Limits

Rate limits laufen zentral ueber `lessons.middleware.RateLimitMiddleware`.

Aktuelle Policies:

| Policy | Scope | Default |
| --- | --- | --- |
| `login` | `POST /api/auth/login/` pro IP und Username | 5 Versuche / 15 Minuten |
| `feedback` | `POST /api/feedback/` pro User oder IP | 3 Nachrichten / 10 Minuten |
| `quiz_attempt` | `POST /api/quiz-attempts/` pro User oder IP | 30 Versuche / 10 Minuten |
| `api_write` | allgemeine schreibende API-Requests pro User oder IP | 120 Requests / 60 Sekunden |

Geblockte Requests antworten mit:

- HTTP `429`
- `{"code": "rate_limited", "error": "..."}`
- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`

Konfiguration erfolgt ueber `RATE_LIMIT_*` ENV-Werte. Production sollte Redis als Cache verwenden, damit Limits ueber mehrere Prozesse hinweg konsistent bleiben.

## Maintenance Mode

Bei `MAINTENANCE_MODE=true` blockiert `MaintenanceModeMiddleware` API-Requests mit `503` und `code=maintenance_mode`. `/api/health/` bleibt erreichbar. Details: `docs/maintenance.md`.

## Upload Validation

Multipart-Uploads werden fuer API-Requests zentral von `UploadValidationMiddleware` gegen Groesse und MIME-Type validiert. Details: `docs/upload-validation.md`.

## Public Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Public health status for uptime checks. |
| `GET` | `/api/auth/csrf/` | CSRF bootstrap. |
| `GET` | `/api/auth/me/` | Current user or `null`. |
| `POST` | `/api/auth/register/` | Create account and send confirmation email. |
| `POST` | `/api/auth/login/` | Create authenticated session. |
| `POST` | `/api/auth/logout/` | End session. |
| `POST` | `/api/auth/password-reset/` | Request password reset without user enumeration. |
| `POST` | `/api/auth/password-reset/confirm/` | Confirm password reset token. |
| `POST` | `/api/auth/email/confirm/` | Confirm email token. |
| `POST` | `/api/feedback/` | Submit public or authenticated feedback with rate limit. |
| `GET` | `/api/scenes/` | Learning scene cards. |
| `GET` | `/api/topics/` | Topic summaries. |
| `GET` | `/api/topics/<topic_id>/` | Topic detail with scenes, vocabulary, exercises and quiz. |
| `GET` | `/api/page/` | Public static page content. |

## Authenticated Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/email/resend/` | Resend confirmation email. |
| `POST` | `/api/auth/change-password/` | Change password and require login again. |
| `POST` | `/api/auth/delete-account/` | Delete own account after password confirmation. |
| `GET` | `/api/auth/export/` | Export own account and learning data. |
| `GET` | `/api/dashboard/` | Dashboard, progress, quiz history and recommendations. |
| `POST` | `/api/dashboard/clear-progress/` | Clear own learning progress. |
| `POST` | `/api/quiz-attempts/` | Save quiz result. |
| `POST` | `/api/progress/` | Save topic progress. |
| `POST` | `/api/vocabulary/` | Save vocabulary item. |
| `POST` | `/api/bot/reply/` | Save bot-style writing exchange. |
| `GET` | `/api/writing/exercises/` | List own writing exercises. |
| `POST` | `/api/writing/exercises/` | Create writing exercise and correction. |
| `PATCH` | `/api/settings/` | Update profile settings. |
| `GET` | `/api/billing/status/` | Plans, subscription and provider status. |
| `POST` | `/api/billing/checkout/` | Start provider checkout or return prepared provider payload. |
| `GET` | `/api/realtime/status/` | Realtime feature status. |
| `POST` | `/api/ai/adaptive-scene/` | Generate adaptive scene preview. |
| `GET` | `/api/ai/streaming/status/` | AI streaming status. |

## Protected And Provider Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/premium/feature-preview/` | Premium | Server-side premium route check. |
| `GET` | `/api/security/admin-summary/` | Staff | Security summary for admins. |
| `POST` | `/api/billing/stripe/webhook/` | Stripe signature | Stripe billing webhook. |
| `POST` | `/api/billing/paypal/webhook/` | PayPal validation | PayPal billing webhook preparation. |

## Realtime WebSockets

WebSocket-Zugriffe werden ueber `RealtimeAccessMiddleware` zentral nach Auth, Rolle und Verbindungsrate geschuetzt. Details: `docs/realtime-websocket.md`.

## Endpoint Design Rules

- New API endpoints must define method, auth requirement, request shape and response shape.
- New errors must use `error_response(message, status=..., code=...)`.
- Error `code` values are stable API contract and should be snake_case.
- Mutating endpoints should return the changed resource or `{"ok": true}`.
- Public endpoints must not leak internal settings, secrets or user existence.
- Staff, premium and webhook endpoints require explicit tests for denied access or invalid signatures.
- Sicherheits-, Rollen-, Premium- und Billing-Aktionen sollen bei Bedarf `log_audit_event()` nutzen; Details stehen in `docs/audit.md`.
