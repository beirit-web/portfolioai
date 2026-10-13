# Beirit Web Portfolio

Persönliches Entwicklerportfolio von Eugen Beirit mit sechs demonstrativen
Webprojekten. Entstanden aus einer klassischen HTML/CSS/JavaScript-Webseite,
weiterentwickelt mit Django und einer React/Preact-Oberfläche. Die Projekte
befinden sich weiterhin in Entwicklung.

## Struktur

| Pfad | Aufgabe |
| --- | --- |
| `frontend/` | Gemeinsames Portfolio-Frontend, Vite-Build und Browserprüfungen |
| `server/` | Ein Django-Server für Portfolio, Konten und alle Demo-APIs |
| `apps/deutsch-live/frontend/` | Aktive Lernoberfläche und lokaler Audioplayer |
| `apps/portfolio-demos/wohnungssuche/frontend/` | Aktive Wohnungssuche-Oberfläche |
| `apps/portfolio-demos/notenrechner/` | Gepflegte statische Rechner-Demo |
| `apps/portfolio-demos/vokabelbox/` | Kleiner Einstieg zum gemeinsamen Lernmodul |
| `docs/` | Architektur, Prüfungen und erhaltene Lizenzhinweise |
| `runtime/` | Ignorierte lokale Daten und Prüfausgaben |

Botanic, Shop und Vertragsgenerator liegen direkt in den gleichnamigen
Django-Apps unter `server/`. Vokabelbox-Assets und das gemeinsame Template liegen
in `server/assets/vokabelbox/` und `server/templates/modules/`. Jedes Projekt hat
einen gepflegten Anwendungsstand; separate Backends und ältere Referenzprojekte
wurden außerhalb des Repositorys archiviert.

## Lokal starten

Python 3.13 und Node.js 22 werden auch in CI verwendet:

```bash
python3 -m venv server/.venv
server/.venv/bin/python -m pip install -r server/requirements.txt
npm --prefix frontend ci
npm --prefix apps/deutsch-live/frontend ci
npm --prefix frontend run build
npm --prefix frontend run build:housing
npm --prefix apps/deutsch-live/frontend run build
server/.venv/bin/python server/manage.py migrate
server/.venv/bin/python server/manage.py runserver
```

Das Portfolio läuft unter `http://127.0.0.1:8000/`. Für die Frontend-Entwicklung:
`npm --prefix frontend run dev`. Architektur und Demo-Routen stehen in
[docs/architecture.md](docs/architecture.md), Prüfungen in
[docs/checks.md](docs/checks.md).

## Musterdaten und Grenzen

Dieses Repository enthält fiktive Beispielkonfiguration und lokale Portfolio-Demos.
Öffentliche Kontakt- und Über-mich-Angaben des Eigentümers bleiben erhalten.
Die öffentlichen `.env`-Dateien entsprechen ihren `.env.example`-Vorlagen;
lokale Overrides, Datenbanken, Medien und Backups bleiben ignoriert. E-Mails werden
lokal auf der Konsole ausgegeben. Zahlungen und Billing-Webhooks sind deaktiviert.
Es gibt keine Deployment-Konfiguration für frühere Hosting-Umgebungen.

Responsive Design, Accessibility, SEO und Performance werden weiterentwickelt.
Tests belegen geprüfte Abläufe; sie sind keine Zusage allgemeiner Produktreife.

## Repository und Lizenz

Das einzige Push-Ziel ist `git@github.com:beirit-web/angefangenes-portfolio.git`.
Pushes benötigen einen ausdrücklichen Auftrag. Ein Push löst kein Deployment aus.
Der lokale Push-Schutz lässt sich mit `git config core.hooksPath scripts/git-hooks`
aktivieren.

Es gibt keine gemeinsame freie Lizenz im Repository-Stamm. Maßgeblich sind
[server/LICENSE](server/LICENSE) und die [erhaltenen Projektlizenzen](docs/licenses/README.md).
Die Veröffentlichung erlaubt keine pauschale Weiterverwendung aller Bestandteile.
