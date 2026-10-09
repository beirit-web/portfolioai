# DeutschLive Theme Context

Stand: 2026-07-14

DeutschLive nutzt im Frontend weiterhin die lokale Theme-Steuerung mit:

- `light`
- `dark`
- `system`

Das Backend bereitet denselben Kontext serverseitig vor, ohne die Frontend-Logik zu ersetzen.

## Profilwert

`UserProfile.theme_preference`

Erlaubte Werte:

- `system`
- `light`
- `dark`

Default ist `system`.

## Middleware

`ThemeContextMiddleware` setzt:

- `request.theme_preference`
- `request.resolved_theme`

Aufloesung:

1. Angemeldetes Nutzerprofil: `theme_preference`
2. Optionaler Header `X-Theme-Preference`
3. Default `system`

Wenn `theme_preference` `system` ist:

1. Optionaler Client-Hint `Sec-CH-Prefers-Color-Scheme`
2. Fallback `light`

## Response-Header

API-Antworten enthalten:

- `X-Theme-Preference`
- `X-Resolved-Theme`

Bei `system` setzt die Middleware `Vary: Sec-CH-Prefers-Color-Scheme`.

## Frontend-Übergabe

Das Frontend kann `themePreference` aus `/api/auth/me/` oder `/api/settings/` nutzen, muss es aber nicht sofort tun.

Der bestehende lokale Speicher `deutsch-live-theme` bleibt funktionsfaehig. Eine spätere Synchronisierung sollte konfliktarm erfolgen:

- Gast: lokaler Theme-Wert
- Login mit Profilwert ungleich `system`: Profilwert uebernehmen
- Login mit Profilwert `system`: lokale Systemlogik behalten
- Änderung im ThemeControl: optional per `PATCH /api/settings/` speichern

## Nicht-Ziele

- Keine serverseitige HTML-Prepaint-Loesung in diesem Ticket.
- Kein Entfernen der vorhandenen Frontend-Theme-Logik.
- Keine Theme-Ableitung aus Locale oder Lernsprache.
