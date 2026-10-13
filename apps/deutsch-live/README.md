# DeutschLive

Die aktive TypeScript-/React-Oberfläche für Sprachlernen, Quiz, Notenrechner und
lokale Audioaufnahmen liegt in `frontend/`. Ihr einziges Backend ist die Django-App
`server/lessons/` im gemeinsamen Portfolio-Server.

```bash
npm --prefix apps/deutsch-live/frontend ci
npm --prefix apps/deutsch-live/frontend run build
server/.venv/bin/python server/manage.py runserver
```

Der Build schreibt nach `server/assets/deutschlive-dist/`. Einstieg:
`http://127.0.0.1:8000/deutschlive/`. Eigene Audioaufnahmen bleiben im Browser;
der bisherige Download-Einstieg `/deutschlive/recordings-archiv` bleibt bestehen.
Die Vokabelbox liegt im Hauptserver unter `/vokabelbox/`.

Das frühere separate Backend, Produktionsdokumentation und Hosting-Konfiguration
sind extern archiviert. Prüfungen laufen über den gemeinsamen Workspace-Check.
