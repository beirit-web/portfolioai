# DeutschLive Locale Middleware

Stand: 2026-07-14

DeutschLive trennt drei Sprachkontexte:

- `interface_language`: Sprache der Bedienoberflaeche
- `explanation_language`: Sprache fuer Erklaerungen
- `learning_language`: deutsche Lernsprache

## Defaults

- Server-Default ist `ru`.
- `learning_language` ist immer `de`.
- Deutsche Saetze bleiben Lerninhalt, auch wenn die UI auf Russisch oder Englisch steht.

## Aufloesung

`LocaleContextMiddleware` nutzt diese Reihenfolge:

1. Angemeldetes Nutzerprofil: `interface_language`
2. Browser-Header `Accept-Language`
3. Default `ru`

Fuer `explanation_language` gilt:

1. Angemeldetes Nutzerprofil: `explanation_language`
2. aufgeloeste `interface_language`

Unterstuetzte UI-/Erklaersprachen:

- `ru`
- `de`
- `en`

## Request-Kontext

Die Middleware setzt:

- `request.interface_language`
- `request.explanation_language`
- `request.learning_language`

## Response-Header

API-Antworten enthalten:

- `Content-Language`
- `X-Interface-Language`
- `X-Explanation-Language`
- `X-Learning-Language`

Anonyme Requests mit Browser-Locale setzen `Vary: Accept-Language`.

## Nicht-Ziele

- Keine automatische Uebersetzung deutscher Lerninhalte.
- Keine Vermischung von UI-Sprache und Lernsprache.
- Keine harte Abhaengigkeit vom Browser-Locale fuer eingeloggte Nutzer.
