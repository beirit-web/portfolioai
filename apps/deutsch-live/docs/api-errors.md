# API Error Middleware

`APIErrorMiddleware` normalisiert API-Fehler fuer Requests unter `/api/`.

## Format

Bestehende View-Fehler nutzen weiterhin:

```json
{
  "error": "Human readable message.",
  "code": "machine_readable_code"
}
```

Middleware-generierte Fehler koennen zusaetzlich die Request-ID enthalten:

```json
{
  "error": "Unexpected server error.",
  "code": "server_error",
  "requestId": "request-id"
}
```

## Standard-Codes

| Status | Code | Bedeutung |
| --- | --- | --- |
| `400` | `bad_request` | fehlerhafte Anfrage oder verdächtige Request-Daten |
| `403` | `permission_denied` | Zugriff verweigert |
| `404` | `not_found` | API-Ressource nicht gefunden |
| `405` | `method_not_allowed` | HTTP-Methode nicht erlaubt |
| `500` | `server_error` | unerwarteter Serverfehler |

Domain-spezifische Fehlercodes wie `auth_required`, `premium_required`, `rate_limited` oder `stripe_checkout_failed` bleiben unveraendert.

## Debug Und Production

- `API_ERROR_LOGGING_ENABLED=true` loggt unerwartete API-Exceptions ueber `lessons.request`.
- `API_ERROR_INCLUDE_DEBUG=false` verhindert, dass Exception-Typ und Message an Clients ausgegeben werden.
- In lokaler Entwicklung kann `API_ERROR_INCLUDE_DEBUG=true` gesetzt werden, damit Fehler schneller sichtbar werden.

Unerwartete Production-Fehler liefern nur `server_error` und eine generische Message.
