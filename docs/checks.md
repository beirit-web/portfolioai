# Builds und Prüfungen

[Dokumentationsübersicht](README.md) · [Architektur](architecture.md)

Diese Anleitung gilt für das Portfolio, DeutschLive, Wohnungssuche und die
weiteren Django-Demos. Alle Befehle werden vom Repository-Stamm aus ausgeführt.

## Gemeinsamer lokaler Check

Nach der [Einrichtung](../README.md#lokal-starten) und der unten beschriebenen
Chromium-Installation startet dieser Befehl den vollständigen Prüflauf:

```bash
bash scripts/check-workspace.sh
```

Für einzelne Änderungen genügt zunächst ein passender Bereich:

| Änderung oder Anlass | Befehl |
| --- | --- |
| Dokumentation, Beispieldaten oder Prüfwerkzeuge | `python3 scripts/check_beirit.py --group data` |
| Django-Code oder Datenmodelle | `bash scripts/check-workspace.sh --group data --group backend` |
| Portfolio- oder App-Oberflächen | `bash scripts/check-workspace.sh --group data --group frontend --group browser` |
| Browserabläufe bei bereits aktuellen Builds | `bash scripts/check-workspace.sh --group browser` |

Der [Shell-Einstieg](../scripts/check-workspace.sh) verwendet die lokale
Python-Umgebung. Die Befehle selbst sind im
[gemeinsamen Prüflauf](../scripts/check_beirit.py) für lokale Entwicklung und
GitHub CI definiert. Ohne `--group` laufen `data`, `frontend`, `backend` und
`browser` in dieser Reihenfolge. Beim ersten fehlgeschlagenen Befehl stoppt
der Lauf mit dessen Fehlercode.

## Voraussetzungen

Für die Gruppe `data` genügen Python und Git. Ihr Einstieg verwendet deshalb
direkt `python3`. Werkzeugversionen und die Einrichtung der Abhängigkeiten für
die übrigen Gruppen stehen in der
[Installationsanleitung](../README.md#lokal-starten).

Die Browserprüfungen benötigen zusätzlich den zu Playwright passenden Chromium:

```bash
(
  cd frontend
  npx --no-install playwright install chromium
)
```

## Einzelne Bereiche prüfen

Mit `--group` wird nur der gewählte Bereich ausgeführt. Gruppen lassen sich
kombinieren; jede Gruppe läuft dabei einmal in der angegebenen Reihenfolge.

| Gruppe | Umfang |
| --- | --- |
| `data` | Tests des Prüflaufs, der Testserverhelfer und des Datenprüfers sowie Prüfung der Portfolio-Quelldaten |
| `frontend` | Übersetzungs-, Skript- und UI-Modultests, alle drei Builds und DeutschLive-TypeScript-Prüfung |
| `backend` | `pip check`, Django-Systemcheck, Migrationsprüfung und Backendtests |
| `browser` | Allgemeine Browserprüfungen und Wohnungssuche mit Mobil- und Desktopansicht |

Die Befehle eines geplanten Laufs lassen sich ohne Ausführung anzeigen:

```bash
python3 scripts/check_beirit.py --list
```

Auch `--list` lässt sich mit `--group` kombinieren.

## Builds und Testdaten

Die Gruppe `frontend` erzeugt die drei Oberflächen neu und ersetzt dabei die
zugehörigen Build-Dateien unter `server/assets/`. Die Ausgabeordner stehen in
der [Architektur](architecture.md#vom-quellcode-zur-ausgelieferten-seite).
Anschließend zeigt `git diff --stat` die Änderungen an bereits versionierten
Dateien; `git status --short` erfasst auch neue Build-Dateien.

Die Gruppe `browser` arbeitet mit den vorhandenen Build-Dateien. Nach
Änderungen an den Oberflächen zuerst `frontend` ausführen, damit die Browser
den aktuellen Stand prüfen.

Backend- und Browserprüfungen des gemeinsamen Laufs verwenden temporäre
Datenbanken und getrennte Verzeichnisse für Medien, statische Dateien und
Backups. Die Browserhelfer starten ihre Django-Prozesse selbst. Die
allgemeinen Browserprüfungen erhalten zwei bereits bestätigte fiktive Quizkonten
aus ihrem temporären Testaufbau. Die
Wohnungssuche behält ihre Testdatenbank über Serverneustarts hinweg und prüft
mit getrennten fiktiven Konten einschließlich Registrierung und E-Mail-Bestätigung.
Der lokale Testprozess stellt die Bestätigungslinks bereit; der Browser öffnet
den regulären Bestätigungsendpunkt. Dafür gibt es keinen zusätzlichen HTTP-Endpunkt.
Die Migrationsprüfung verwendet
`--check --dry-run` und schreibt selbst keine Migration.

Vor einem Commit oder Push ist mindestens
`python3 scripts/check_portfolio_data.py` erforderlich. Dieser Befehl kontrolliert
die zur Veröffentlichung vorgesehenen Dateien einschließlich neuer, nicht
ignorierter Dateien. Er prüft unter anderem Beispielkonfigurationen, fiktive
E-Mail-Domains in Umgebungsdateien und unerlaubte Laufzeit- oder Geheimnisdateien.

Die [allgemeine Playwright-Konfiguration](../frontend/playwright.config.cjs)
prüft Desktop- und Mobilansichten unter `http://127.0.0.1:8765/` mit insgesamt
zwei Workern. Die
[Wohnungssuche-Konfiguration](../frontend/playwright.housing.config.cjs)
verwendet eigene lokale Server pro Worker ab Port 8870. Diese Ports müssen für
den Prüflauf verfügbar sein.

## Lokale Testserver und Sandbox

Die Testserver lauschen ausschließlich auf `127.0.0.1`. Vor Migrationen und
Serverstart prüfen die Helfer, ob der jeweilige Port gebunden werden kann.

In einer eingeschränkten Agentenumgebung benötigt der Browserprüflauf eine
gezielte Freigabe für lokale Server und Browserprozesse. Die übrigen Prüfungen
lassen sich weiterhin mit `--group data`, `--group frontend` oder `--group backend`
ausführen. Für Codex sind die Möglichkeiten unter
[Sandbox und Freigaben](https://learn.chatgpt.com/docs/sandboxing) beschrieben.

Beim Beenden räumen die Helfer laufende Django- und Migrationsprozesse sowie
ihre temporären Testdaten auf. Die Wartezeit ist begrenzt; bei Bedarf wird der
Kindprozess erzwungen beendet. Die Wohnungssuche erkennt auch fehlgeschlagene
Prozessstarts und durch Signale beendete Server sofort.

## Berichte und Fehler untersuchen

| Prüflauf | HTML-Bericht | Weitere Ergebnisse |
| --- | --- | --- |
| Allgemeine Browserprüfungen | `runtime/browser-checks/report/` | `runtime/browser-checks/results/` |
| Wohnungssuche | `runtime/housing-checks/report/` | `runtime/housing-checks/results/` |

Bei Fehlern bleiben Playwright-Traces und Screenshots erhalten.
Screenshots einzelner Abläufe liegen ebenfalls im jeweiligen Testausgabeordner;
parallele Worker und wiederholte Läufe überschreiben dadurch keine gemeinsamen
Vorschaubilder. Der gemeinsame Netzwerkhelfer leitet den lokalen Ursprung aus
`baseURL` ab und blockiert externe Browseranfragen; Wetterantworten werden
gezielt simuliert.
Beide Konfigurationen verhindern mit `forbidOnly` eingeschränkte CI-Läufe durch
versehentlich stehen gelassene `test.only`-Aufrufe.

Den allgemeinen HTML-Bericht nach einem Lauf öffnen:

```bash
(
  cd frontend
  npx --no-install playwright show-report ../runtime/browser-checks/report
)
```

Für die Wohnungssuche lautet der Berichtspfad entsprechend
`../runtime/housing-checks/report`. Alle Ausgaben unter `runtime/` bleiben
ignoriert.

Zur Fehlersuche lässt sich der betroffene Bereich gezielt wiederholen,
beispielsweise die Projektseiten auf dem Desktop oder die Wohnungssuche mobil:

```bash
npm --prefix frontend run test:browser -- projects-performance.spec.cjs --project=desktop
npm --prefix frontend run test:housing -- --project=mobile
```

| Meldung oder Symptom | Nächster Schritt |
| --- | --- |
| `server/.venv/bin/python` fehlt oder Pakete können nicht geladen werden | Abhängigkeiten gemäß [Installation](../README.md#lokal-starten) einrichten. |
| Playwright findet Chromium nicht | Chromium mit dem Befehl unter „Voraussetzungen“ installieren. |
| Oberfläche fehlt oder zeigt einen älteren Stand | Gruppe `frontend` ausführen, anschließend den Browserlauf wiederholen. |
| `permission denied for local sockets` | Browserprüflauf in der Ausführungsumgebung gezielt für lokale Sockets freigeben. |
| `port is already in use` | Eigenen vorherigen Testserver am gemeldeten Port beenden und erneut prüfen. |

## Hilfsprogramme in frontend/scripts

| Skript | Aufgabe |
| --- | --- |
| [check-i18n.cjs](../frontend/scripts/check-i18n.cjs) | Statische Übersetzungsschlüssel in gemeinsamen und app-eigenen Django-Templates prüfen; läuft über `npm test`. |
| `build-botanic-icons.cjs`, `build-shop-icons.cjs`, `build-contract-icons.cjs` | SVG-Sprites aus der jeweiligen Icon-Auswahl erzeugen; gemeinsame Erzeugung im [Icon-Helfer](../frontend/scripts/lib/build-icon-sprite.cjs). |
| `check-botanic.cjs`, `check-shop.cjs`, `check-contract-editor.cjs` | Optionale, ausführliche App-Prüfungen gegen einen bereits laufenden lokalen Server. |
| [run-lighthouse.mjs](../frontend/scripts/run-lighthouse.mjs), [audit-project-performance.mjs](../frontend/scripts/audit-project-performance.mjs) | Einzelmessungen beziehungsweise Messreihen für Demos und Projektberichte. |

Die Befehle der optionalen App-Prüfungen und Icon-Generatoren stehen bei
[Botanic](../server/botanic/README.md), [Shop](../server/shop/README.md) und
[Vertragsgenerator](../server/contracts/README.md). Die Browserhelfer akzeptieren
lokale HTTP(S)-Ursprünge und schreiben Screenshots unter `runtime/`. Relative
Ausgabe-Overrides beziehen sich auf den Repository-Stamm. Die Skripttests sind
in `npm test` enthalten und lassen sich gezielt ausführen:

```bash
npm --prefix frontend run test:scripts
```

## Optionale Performance-Messungen

Lighthouse wird bei Bedarf separat installiert. Dadurch bleiben seine
Browser- und Analyseabhängigkeiten außerhalb der normalen Frontend-Installation:

```bash
npm --prefix tools/performance ci
```

Lighthouse-Messungen ergänzen die Funktionstests. Sie benötigen einen lokal
installierten Chrome-kompatiblen Browser, den das Skript findet, oder einen
entsprechenden ausführbaren Browserpfad in `CHROME_PATH`.

Die verfügbaren Messziele und Optionen lassen sich vorab anzeigen:

```bash
npm --prefix frontend run audit:projects -- --list-targets
npm --prefix frontend run audit:projects -- --help
```

Nach den Builds den Server mit temporären Daten in einem Terminal starten:

```bash
server/.venv/bin/python scripts/run_browser_checks.py
```

In einem zweiten Terminal die Startseite oder die Projektserie messen:

```bash
mkdir -p runtime/lighthouse
npm --prefix frontend run lighthouse -- http://127.0.0.1:8765/ \
  --output=html --output-path=../runtime/lighthouse/portfolio.html
npm --prefix frontend run audit:projects -- \
  --base-url=http://127.0.0.1:8765 \
  --output=../runtime/lighthouse/projects \
  --phase=local --runs=1 --profiles=mobile,desktop
```

Den temporären Server anschließend mit `Ctrl+C` beenden. Diese Messungen gehören
weder zum gemeinsamen lokalen Check noch zum GitHub-Workflow.

## Automatische Prüfungen auf GitHub

Der [Workflow](../.github/workflows/beirit-ci.yml) startet bei Pull Requests,
bei Pushes auf `main` oder `master` und bei manuellem Start. Auch reine
Dokumentationsänderungen lösen die Prüfungen aus.

| Job | Gruppen des gemeinsamen Prüflaufs |
| --- | --- |
| `portfolio-data` | `data` |
| `backend` | `backend` |
| `frontend` | `frontend`, danach `browser` |

Die Jobs sind unabhängig; ein Fehler in einem Job verhindert die anderen Jobs
nicht. Sie installieren ihre Werkzeuge und rufen anschließend die jeweiligen
Gruppen aus `scripts/check_beirit.py` auf. Innerhalb eines Jobs stoppt ein Fehler
die nachfolgenden Prüfschritte. Versionen und Zeitlimits stehen im Workflow.
Browserberichte werden über den abschließenden Schritt mit `if: always()` als
Artifact `beirit-browser-checks` gespeichert, sofern entsprechende Dateien
vorliegen. Der Workflow verwendet `contents: read` als Repository-Berechtigung.
