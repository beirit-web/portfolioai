# Premium Access Middleware

`PremiumAccessMiddleware` schuetzt klassifizierte Premium- und Content-Routen zentral, bevor View-Logik ausgefuehrt wird.

## Einstellungen

- `PREMIUM_ACCESS_ENABLED=true` aktiviert die zentrale Pruefung.
- `PREMIUM_ACCESS_POLICIES` klassifiziert Routen nach `path`, `methods`, optionalem `requires_setting` und `fallback`.
- `AI_PREMIUM_REQUIRED=true` macht vorbereitete AI-Content-Routen Premium-only.

## Policies

| Policy | Route | Methoden | Verhalten |
| --- | --- | --- | --- |
| `premium_feature_preview` | `/api/premium/feature-preview/` | `GET` | immer Premium-only |
| `ai_writing_exercises` | `/api/writing/exercises/` | `POST` | Premium-only, wenn `AI_PREMIUM_REQUIRED=true` |
| `ai_adaptive_scene` | `/api/ai/adaptive-scene/` | `POST` | Premium-only, wenn `AI_PREMIUM_REQUIRED=true` |

Wenn eine policy mit `requires_setting` deaktiviert ist, laeuft die Route weiter ueber ihren Free-/Quota-Fallback.

## Zugriff

Premium-Zugriff wird ueber `UserProfile.has_premium_access` entschieden:

- `premium_status` ist `trial` oder `active`
- oder `role` ist `premium`
- oder eine aktive/trialing Premium-`Subscription` ist im gueltigen Zeitraum

## Fehler

Nicht authentifizierte Requests erhalten:

```json
{"error": "Authentication required.", "code": "auth_required"}
```

Authentifizierte Free-User erhalten:

```json
{"error": "Premium access required.", "code": "premium_required"}
```

Premium-Fehler enthalten:

- `X-Premium-Required: true`
- `X-Premium-Policy: <policy-name>`

Verweigerte Premium-Zugriffe werden als Security Event geloggt und als AuditEvent `permission_denied` gespeichert.
