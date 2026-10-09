# Realtime WebSocket Access

DeutschLive nutzt Channels fuer vorbereitete Realtime-Benachrichtigungen. Der produktive Fallback bleibt HTTP-basiert; WebSockets sind eine Zusatzschicht fuer Live-Status und Streaming-Hinweise.

## ASGI Middleware

`RealtimeAccessMiddleware` schuetzt WebSocket-Pfade zentral.

Aktuelle Policy:

| Policy | Pfad | Rollen |
| --- | --- | --- |
| `notifications` | `/ws/notifications/` | `learner`, `premium`, `mentor`, `content_manager`, `admin` |

## Einstellungen

```env
REALTIME_WS_ACCESS_ENABLED=true
REALTIME_WS_CONNECTION_LIMIT=30
REALTIME_WS_CONNECTION_WINDOW_SECONDS=60
```

`REALTIME_WS_POLICIES` wird in den Django-Settings definiert. Neue WebSocket-Routen muessen dort mit Pfad und erlaubten Rollen eingetragen werden.

## Close Codes

| Code | Bedeutung |
| --- | --- |
| `4401` | nicht authentifiziert |
| `4403` | Rolle nicht erlaubt oder Feature deaktiviert |
| `4429` | zu viele Verbindungsversuche |

## Fallback

Wenn WebSockets nicht verfuegbar sind, bleiben die HTTP-Endpunkte erhalten:

- `/api/realtime/status/`
- `/api/ai/streaming/status/`
- normale Writing- und Progress-API-Responses

Das Frontend soll WebSocket-Fehler nicht als harten App-Fehler behandeln, sondern auf den HTTP-Status/Fallback zurueckfallen.
