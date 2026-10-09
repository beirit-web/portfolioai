# Request Context Middleware

`RequestContextMiddleware` buendelt Request-Metadaten in `request.app_context`, damit Services und spaetere Middleware nicht selbst Header, Profilwerte oder Device-Hinweise zusammensuchen muessen.

## Struktur

```python
request.app_context = {
    "request_id": "...",
    "path": "/api/...",
    "method": "GET",
    "ip": "127.0.0.1",
    "language": {
        "interface": "ru",
        "explanation": "ru",
        "learning": "de",
    },
    "theme": {
        "preference": "system",
        "resolved": "light",
    },
    "user": {
        "authenticated": True,
        "id": 1,
        "role": "learner",
        "staff": False,
    },
    "device": {
        "user_agent": "...",
        "kind": "desktop",
        "mobile": False,
    },
}
```

## Reihenfolge

Die Middleware laeuft nach Locale- und Theme-Context, damit `interface_language`, `learning_language`, `theme_preference` und `resolved_theme` bereits gesetzt sind.

Responses erhalten `X-Request-Context: available`, wenn der Kontext erstellt wurde.
