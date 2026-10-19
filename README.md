# Beirit Web Portfolio

![Python, Django, React/Preact, TypeScript, SQLite und Vite][technologien]

Persönliches Entwicklerportfolio von Eugen Beirit mit sechs demonstrativen
Webprojekten auf Basis von Django und React/Preact.

**Stand:** In Entwicklung; derzeit kein produktiver Betrieb.

Die [Projektdokumentation](docs/README.md) führt zu Architektur, Demo-Routen,
Prüfungen und Lizenzhinweisen.
Meinen persönlichen Entwicklungsweg beschreibt die
[Entwicklungsgeschichte](docs/ENTWICKLUNGSGESCHICHTE.md).

## Projekte im Überblick

Die Cover stammen aus dem Portfolio-Karussell. Ein Klick auf ein Bild öffnet
den zugehörigen Demo-Screenshot.

|    Sprachlernplattform    |      Online-Shop      |    Wohnungssuche    |
| :-----------------------: | :-------------------: | :-----------------: |
|   [![Sprachen][c1]][s1]   |   [![Shop][c2]][s2]   | [![Wohnen][c3]][s3] |
|      Lernen und Quiz      | Katalog und Warenkorb | Angebote und Filter |
| React, TypeScript, Django |  Django, JavaScript   |   Preact, Django    |
|      [Quellcode][q1]      |    [Quellcode][q2]    |   [Quellcode][q3]   |

|  Botanic mit Wetter   |    Vertragsgenerator    |     Notenrechner      |
| :-------------------: | :---------------------: | :-------------------: |
| [![Botanic][c4]][s4]  |  [![Vertrag][c5]][s5]   |  [![Noten][c6]][s6]   |
| Pflanzen und Gießplan | Vorschau und TXT-Export | Noten und Auswertung  |
|    Python, Django     |   Django, JavaScript    | HTML, CSS, JavaScript |
|    [Quellcode][q4]    |     [Quellcode][q5]     |    [Quellcode][q6]    |

Weitere Ansichten und die Herkunft der Screenshots stehen im
[Bildnachweis](server/assets/images/portfolio-previews/README.md).

## Lokal starten

Das Backend verwendet Django 5.2 LTS. Benötigt werden Python 3.13 und
Node.js ab 22.19.0. Alle Befehle werden vom Repository-Stamm aus ausgeführt:

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

[technologien]: docs/images/portfolio-technologies.svg
[c1]: server/assets/images/portfolio-covers/sprachdienstleistungen-cover-v1-240.webp
[c2]: server/assets/images/portfolio-covers/online-shop-cover-v1-240.webp
[c3]: server/assets/images/portfolio-covers/wohnungssuche-bodensee-cover-v1-240.webp
[c4]: server/assets/images/portfolio-covers/enbt-botanic-cover-v1-240.webp
[c5]: server/assets/images/portfolio-covers/vertragsgenerator-cover-v1-240.webp
[c6]: server/assets/images/portfolio-covers/notenrechner-cover-v1-240.webp
[s1]: server/assets/images/portfolio-previews/sprachdienstleistungen-desktop.webp
[s2]: server/assets/images/portfolio-previews/online-shop-desktop.webp
[s3]: server/assets/images/portfolio-previews/wohnungssuche-bodensee-desktop.webp
[s4]: server/assets/images/portfolio-previews/enbt-botanic-desktop.webp
[s5]: server/assets/images/portfolio-previews/vertragsgenerator-desktop.webp
[s6]: server/assets/images/portfolio-previews/notenrechner-desktop.webp
[q1]: apps/deutsch-live/
[q2]: server/shop/
[q3]: apps/wohnungssuche/
[q4]: server/botanic/
[q5]: server/contracts/
[q6]: server/assets/portfolio/notenrechner/
