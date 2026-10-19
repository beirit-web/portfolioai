# Beirit Web Portfolio

Persönliches Entwicklerportfolio von Eugen Beirit mit sechs demonstrativen
Webprojekten auf Basis von Django und React/Preact.

Die [Projektdokumentation](docs/README.md) führt zu Architektur, Demo-Routen,
Prüfungen und Lizenzhinweisen.
Meinen persönlichen Entwicklungsweg beschreibt die
[Entwicklungsgeschichte](docs/ENTWICKLUNGSGESCHICHTE.md).

## Lokal starten

Das Backend verwendet Django 5.2 LTS. Python 3.13 und Node.js 22 werden auch in CI
verwendet. Alle Befehle werden vom Repository-Stamm aus ausgeführt:

```bash
python3 -m venv server/.venv
server/.venv/bin/python -m pip install -r server/requirements.txt
npm --prefix frontend ci
npm --prefix apps/deutsch-live ci
npm --prefix frontend run build
npm --prefix frontend run build:housing
npm --prefix apps/deutsch-live run build
server/.venv/bin/python server/manage.py migrate
server/.venv/bin/python server/manage.py runserver
```

Das Portfolio läuft unter `http://127.0.0.1:8000/`. Für die Frontend-Entwicklung:
`npm --prefix frontend run dev`.

Registrierung lokal ausprobieren: `http://localhost:8000/register/` öffnen,
ein fiktives Testkonto anlegen und anschließend im selben Browser
`http://localhost:8000/examplemail` öffnen. Den dort angezeigten sechsstelligen
Code innerhalb einer Minute auf der Anmeldeseite eingeben. Danach sind die
Anmeldefelder freigeschaltet. Das Konto bleibt gespeichert; spätere Anmeldungen
benötigen nur E-Mail-Adresse und Passwort. Abgelaufene Codes können im
Beispielpostfach ersetzt werden. Die [Account-Dokumentation](server/pages/README.md#local-browser-activation)
beschreibt den Ablauf und die lokale Begrenzung.

## Musterdaten und Grenzen

Dieses Repository enthält fiktive Beispielkonfiguration und lokale Portfolio-Demos.
Öffentliche Kontakt- und Über-mich-Angaben des Eigentümers bleiben erhalten.
Die öffentlichen `.env`-Dateien entsprechen ihren `.env.example`-Vorlagen;
lokale Overrides, Datenbanken, Medien und Backups bleiben ignoriert.
Aktivierungscodes erscheinen im lokalen Beispielpostfach; Wiederherstellungs-E-Mails
werden in der Konsole ausgegeben. Zahlungen und Billing-Webhooks sind deaktiviert.
Es gibt keine Deployment-Konfiguration für frühere Hosting-Umgebungen.

Tests belegen geprüfte Abläufe; sie sind keine Zusage allgemeiner Produktreife.

## Repository und Lizenz

Das einzige Push-Ziel ist `git@github.com:beirit-web/angefangenes-portfolio.git`.
Pushes benötigen einen ausdrücklichen Auftrag. Ein Push löst kein Deployment aus.
Der lokale Push-Schutz lässt sich mit `git config core.hooksPath scripts/git-hooks`
aktivieren.

Es gibt keine gemeinsame freie Lizenz im Repository-Stamm. Maßgeblich sind
[server/LICENSE](server/LICENSE) und die [erhaltenen Projektlizenzen](docs/licenses/README.md).
Die Veröffentlichung erlaubt keine pauschale Weiterverwendung aller Bestandteile.
