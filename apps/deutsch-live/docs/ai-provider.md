# DeutschLive AI provider system

## Ziel

Die App nutzt eine Provider-Fassade, damit Schreibkorrekturen und adaptive Szenen nicht direkt an einen Anbieter gekoppelt sind.

## ENV

```env
AI_PROVIDER=fallback
AI_FEATURES_ENABLED=false
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_TIMEOUT_SECONDS=20
OPENAI_MAX_OUTPUT_TOKENS=800
OPENAI_MAX_RETRIES=2
AI_MAX_INPUT_TOKENS=700
AI_DAILY_FREE_LIMIT=10
AI_DAILY_PREMIUM_LIMIT=100
AI_PREMIUM_REQUIRED=false
AI_STREAMING_CORRECTIONS_ENABLED=false
```

`fallback` ist der MVP-Standard und funktioniert ohne externe API.

Fuer OpenAI:

```env
AI_PROVIDER=openai
AI_FEATURES_ENABLED=true
OPENAI_API_KEY=example-ai-key-unused
OPENAI_MODEL=gpt-4.1-mini
```

Der API-Key bleibt ein Backend-Secret und wird nicht an das Frontend ausgeliefert.

## Architektur

- `GPTService` bleibt die interne Fassade fuer Views und Services.
- `AIProvider` definiert den Vertrag fuer Schreibfeedback und adaptive Szenen.
- `RuleBasedProvider` liefert den lokalen Fallback.
- `OpenAIProvider` nutzt die OpenAI Responses API ueber `POST /v1/responses`.
- `OpenAIProvider` wiederholt temporaere Fehler wie Timeout, 429 und 5xx.
- Nicht wiederholbare 4xx-Fehler brechen direkt ab.
- Wenn ein Provider ausfaellt, faellt `GPTService` auf `RuleBasedProvider` zurueck.

## Tests

`lessons.tests.test_ai` prueft:

- Provider-Konfigurationsstatus
- Fallback ohne OpenAI-Konfiguration
- Fallback bei Provider-Fehlern
- Retry-Verhalten fuer temporaere OpenAI-Fehler
- Input-Tokenlimit pro KI-Anfrage
- Tageslimit fuer kostenlose Nutzer
- optionales Premium-Gating
- vorbereitete Streaming-Korrekturen ueber WebSocket-Notifications
- API-Vertrag fuer Schreibkorrekturen

## Kostenkontrolle

Die App prueft vor jedem KI-Aufruf:

- geschaetzte Input-Tokens (`AI_MAX_INPUT_TOKENS`)
- Tageslimit fuer Free/Premium (`AI_DAILY_FREE_LIMIT`, `AI_DAILY_PREMIUM_LIMIT`)
- optionales Premium-Only-Gating (`AI_PREMIUM_REQUIRED`)

Die Token-Schaetzung ist bewusst konservativ und dient als MVP-Schutz vor sehr langen Eingaben.

## Streaming-Korrekturen

`AI_STREAMING_CORRECTIONS_ENABLED=true` sendet nach einer gespeicherten Schreibkorrektur zusaetzliche WebSocket-Notification-Events:

- `writing_correction_stream_start`
- `writing_correction_stream_chunk`
- `writing_correction_stream_done`

Wenn das Flag deaktiviert ist, bleibt der bisherige JSON-Response-Fallback unveraendert.
