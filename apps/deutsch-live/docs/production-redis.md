# DeutschLive production Redis

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

## Ziel

Production nutzt Redis fuer:

- Cache und Rate-Limits
- Django Channels / WebSocket-Channel-Layer
- spaetere Queues oder Hintergrundjobs

Lokale Entwicklung bleibt ohne Redis moeglich.

## Erforderliche ENV

```env
REDIS_URL=rediss://default:CHANGE_ME@redis.example.com:6379/0
USE_REDIS_CACHE=true
USE_REDIS_CHANNEL_LAYER=true
```

`rediss://` ist fuer gehostete Redis-Instanzen bevorzugt, wenn TLS unterstuetzt wird. Lokal kann weiter `redis://127.0.0.1:6379/0` genutzt werden.

## Rate-Limits

`lessons.middleware.RateLimitMiddleware` nutzt den Django-Cache. In lokaler Entwicklung ist `LocMemCache` ausreichend, aber nicht prozessuebergreifend.

`lessons.realtime_middleware.RealtimeAccessMiddleware` nutzt denselben Cache fuer WebSocket-Verbindungs-Limits. Production sollte deshalb Redis fuer Cache und Channel Layer gemeinsam aktivieren.

Production muss `USE_REDIS_CACHE=true` setzen, damit Login-, Feedback-, Quiz- und API-Limits ueber mehrere Worker konsistent bleiben.

Relevante ENV-Werte:

- `RATE_LIMIT_LOGIN_LIMIT`
- `RATE_LIMIT_FEEDBACK_LIMIT`
- `RATE_LIMIT_QUIZ_ATTEMPT_LIMIT`
- `RATE_LIMIT_API_WRITE_LIMIT`

## Launch-Gate

`production_check` blockiert Production, wenn Redis nicht fuer Cache/Rate-Limits und Channels aktiv ist.

Lokal darf der Check warnen, damit Tests und Entwicklung ohne laufenden Redis-Server funktionieren.

## Pruefung

Vor Release:

```bash
python manage.py production_check --fail-on-warning
```

Nach dem Setzen der Server-Secrets muss zusaetzlich ein echter Server-Check erfolgen:

```bash
python manage.py check
python manage.py production_check
```
