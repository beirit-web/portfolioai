# Lokal prüfen

Die Prüfungen verwenden temporäre Datenbanken und verändern die Daten der lokalen
Demo nicht. Benötigt werden die installierten Python-/Node-Abhängigkeiten sowie
Chromium: `npm --prefix frontend exec playwright install chromium`.

```bash
scripts/check-workspace.sh
```

Der gemeinsame Check baut alle aktiven Oberflächen und führt den Daten-Audit,
Node-Tests, Django-Systemcheck, Migrationsprüfung, Backendtests sowie
Playwright-Prüfungen für Desktop, Mobilgeräte und Wohnungssuche aus.

Einzeln:

```bash
python3 scripts/check_portfolio_data.py
npm --prefix frontend test
server/.venv/bin/python server/manage.py test pages lessons botanic contracts shop
npm --prefix frontend run test:browser
npm --prefix frontend run test:housing
```

Die Browserprüfungen starten den gemeinsamen Django-Server mit Musterdaten.
Berichte und Screenshots liegen ignoriert in `runtime/`. Datierte Messberichte
und die früheren Prüfungen der separaten Backend-Beispiele sind archiviert.
Für neue Messungen stehen `npm --prefix frontend run lighthouse` und
`npm --prefix frontend run audit:projects` zur Verfügung.

Der einzige GitHub-Actions-Workflow baut alle drei Frontends und prüft den
Hauptserver einschließlich der Browserabläufe. Er enthält keine Deployments.
