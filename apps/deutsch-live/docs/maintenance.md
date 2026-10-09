# Maintenance Mode

`MaintenanceModeMiddleware` kann die oeffentliche API waehrend Deployments, Migrationen oder Notfaellen temporaer deaktivieren.

## Einstellungen

```env
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=DeutschLive is temporarily in maintenance mode.
MAINTENANCE_RETRY_AFTER_SECONDS=300
MAINTENANCE_BLOCK_FRONTEND=false
```

## Verhalten

Wenn `MAINTENANCE_MODE=true` gesetzt ist:

- API-Requests unter `/api/` werden mit `503` blockiert.
- `/api/health/` bleibt fuer Uptime-Checks erreichbar.
- der konfigurierte Admin-Pfad bleibt erreichbar.
- geblockte Antworten erhalten `Retry-After` und `Cache-Control: no-store`.
- Rate-Limits werden durch Maintenance-Blocks nicht verbraucht.

Beispielantwort:

```json
{
  "error": "DeutschLive is temporarily in maintenance mode.",
  "code": "maintenance_mode",
  "requestId": "request-id",
  "retryAfter": 300
}
```

## Frontend

Standardmaessig wird nur die API blockiert, damit statische Assets und die SPA weiter ausgeliefert werden koennen. Fuer eine vollstaendige Sperre kann `MAINTENANCE_BLOCK_FRONTEND=true` gesetzt werden.

Das Frontend kann `code=maintenance_mode`, HTTP `503` und `retryAfter` nutzen, um einen oeffentlichen Wartungshinweis anzuzeigen.
