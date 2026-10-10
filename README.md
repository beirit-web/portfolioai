# Beirit Web Portfolio

Dieses Repository zeigt meine Web- und Softwareprojekte samt Quellcode. Es ist
zugleich ein persönliches Entwicklerportfolio und eine Dokumentation meines
Lernwegs: von einer klassischen Webseite über Django bis zur heutigen
komponentenbasierten Oberfläche mit React und einem Django-Backend.

Die Anwendungen laufen im aktuellen Repository als lokale Portfolio-Demos.
Frühere Hosting-Konfigurationen enthalten Musterdaten; automatische Deployments
und die früheren Deployment-/Secret-Skripte sind deaktiviert. Zahlungsfunktionen
dienen als Demonstration und ermöglichen hier keine echten Zahlungen.

## Projektstatus und Weiterentwicklung

### Projektstatus – In aktiver Weiterentwicklung

Dieses Projekt befindet sich weiterhin in der Entwicklung und darf nicht als
vollständig abgeschlossenes oder ausgereiftes Produkt betrachtet werden.

Durch die mehrfachen konzeptionellen und technischen Veränderungen gibt es noch
zahlreiche Bereiche, die überarbeitet, erweitert, modernisiert oder mit
zusätzlichen Inhalten und Funktionen ergänzt werden sollen. Vorhandene Tests und
bereits umgesetzte Verbesserungen belegen einzelne Eigenschaften des aktuellen
Stands, aber keine vollständige Produktreife.

**Aktuelle Entwicklungsaufgaben:**

Die folgenden Punkte sind geplante beziehungsweise fortlaufende Aufgaben:

- **Responsive Design:** Verschiedene Bereiche sind noch nicht ausreichend für
  Smartphones, Tablets und unterschiedliche Bildschirmgrößen optimiert. Layouts,
  Abstände, Typografie und Komponenten sollen weiter angepasst und geprüft werden.
- **Suchmaschinenoptimierung (SEO):** Die bereits angepassten Portfolio-Metadaten
  bilden eine Grundlage. Seitenstruktur, semantisches HTML und weitere technische
  SEO-Aspekte sollen weiter überprüft und verbessert werden.
- **Google Lighthouse:** Performance, Accessibility, Best Practices und SEO sollen
  systematisch analysiert und optimiert werden. Vorhandene Messungen sind
  Momentaufnahmen einzelner Seiten und keine allgemeine Qualitätszusage.
- **Agentic Browsing:** Die zuverlässige Bedienung durch KI-Agenten soll verbessert
  werden. Geplant sind Prüfungen und Anpassungen an semantisch korrektem HTML,
  geeigneten ARIA-Attributen, einer verständlichen Accessibility-Struktur sowie
  eindeutig erkennbaren und bedienbaren Interaktionselementen.
- **Benutzeroberfläche und Benutzererfahrung:** Einzelne Seiten, Komponenten,
  Animationen und Navigationsbereiche sollen gestalterisch und funktional weiter
  verbessert werden.
- **Inhalte und Projekte:** Unvollständige Bereiche sollen um Beschreibungen,
  Demonstrationen und weitere Projektinformationen ergänzt werden.
- **Codequalität:** Bestehende Komponenten und Strukturen sollen bei Bedarf
  überarbeitet, vereinfacht und besser wartbar gestaltet werden.

### Kontinuierliche Weiterentwicklung

Dieses Repository dokumentiert den aktuellen Stand der Anwendung und meinen
persönlichen Entwicklungs- und Lernprozess. Die Weiterentwicklung erfolgt
schrittweise: Ich verbessere bestehende Funktionen, erprobe neue technische
Ansätze und setze Erkenntnisse aus praktischen Tests um.

## Entstehung und technische Entwicklung

### 1. Coachingservice: HTML, CSS und JavaScript

Das Projekt begann unter dem Namen **Coachingservice**. Die erste Version war
als klassische Webseite geplant und umgesetzt: HTML für die Struktur, CSS für
Gestaltung und Layout sowie JavaScript für interaktive Funktionen. Mit wachsenden
Anforderungen entwickelte sich daraus die Idee einer umfangreicheren Webanwendung.

### 2. Umstellung auf Python und Django

Im nächsten Schritt stellte ich das Projekt auf Python und Django um. Django
ermöglichte eine strukturierte Umsetzung von Routing, serverseitiger Logik,
Datenverwaltung und dynamischen Seiten. Dabei sammelte ich praktische Erfahrungen
mit dem Zusammenspiel von Datenmodellen, Formularen, Templates und HTTP-Anfragen.

### 3. Weiterentwicklung mit React und Django

Anschließend trennte ich die Aufgaben von Frontend und Backend stärker.
React-Komponenten ermöglichten wiederverwendbare Oberflächenelemente und eine
strukturierte Umsetzung interaktiver Ansichten. Django blieb für serverseitige
Anwendungslogik und Datenverarbeitung zuständig. Die heute vorhandene Integration
ist im Abschnitt [Technologien und Architektur](#technologien-und-architektur)
beschrieben.

### 4. Entwicklung zum persönlichen Portfolio

Aus dem ursprünglichen Coachingservice-Projekt wurde ein persönliches
Entwicklerportfolio. Es stellt mehrere eigene Software- und Webprojekte zentral
vor und macht deren technische Umsetzung nachvollziehbar. Dabei möchte ich
sowohl Ergebnisse als auch meine Kenntnisse, Entscheidungen und den jeweiligen
Entwicklungsstand zeigen.

### 5. Veröffentlichung und produktiver Betrieb

Ein wichtiger Teil meines Lernwegs war der Betrieb einer öffentlich erreichbaren
Anwendung. Ich verwendete **Fly.io** als Hosting-Plattform, **IONOS** für die
Verwaltung meiner eigenen Domain sowie **Git und GitHub** für Versionsverwaltung
und Projektentwicklung.

Diese Erfahrungen gehören zur Projektgeschichte. Das heutige öffentliche
Repository enthält dafür bereinigte Architekturbeispiele mit Musterdaten und
führt keine Deployments in die früheren Hosting-Umgebungen aus.

## Praktische Erfahrungen mit Deployment und Sicherheit

Durch den produktiven Betrieb lernte ich, dass Änderungen an einer veröffentlichten
Anwendung sorgfältiger vorbereitet und überprüft werden müssen als Änderungen
an einem ausschließlich lokalen Entwicklungsprojekt. Konfiguration, Daten,
Erreichbarkeit und bestehende Funktionen müssen dabei gemeinsam betrachtet werden.

Zu meinen praktischen Lernerfahrungen gehören:

- Eine Hosting-Umgebung konfigurieren und eine eigene Domain mit der Anwendung
  verbinden.
- Umgebungsvariablen und vertrauliche Zugangsdaten verwalten sowie lokale und
  produktive Konfigurationen auseinanderhalten.
- Django-Einstellungen für Hosts, CSRF, HTTPS und Cookies verstehen und passend
  zur jeweiligen Umgebung konfigurieren.
- Deployments vorbereiten, eine veröffentlichte Anwendung aktualisieren und
  anschließend Erreichbarkeit sowie wichtige Funktionen überprüfen.
- Fehler im produktiven Betrieb analysieren, Konfigurationsprobleme eingrenzen
  und Korrekturen nachvollziehbar prüfen.

Im aktuellen Code sind unter anderem umgebungsabhängige Einstellungen,
CSRF-Prüfungen, Passwortvalidierung und konfigurierbare HTTPS-/Cookie-Optionen
vorhanden. Die lokale Demo verwendet bewusst andere Einstellungen als eine
produktive Umgebung. Diese Mechanismen ersetzen keine vollständige Prüfung vor
einem späteren produktiven Einsatz.

Die heutigen GitHub-Actions-Workflows enthalten Frontend-Builds, Django-Checks,
Migrationsprüfungen und Tests. Frühere Hosting-Dateien dokumentieren die
Architektur als Muster; Deployment und Secret-Import sind deaktiviert. Einzelheiten
stehen unter [Grenzen der Portfolio-Demos](docs/deployment/deploy-isolation.md)
und [Hosting-Architektur als Portfolio-Muster](server/docs/fly-migration.md).

## Was ich durch dieses Projekt gelernt habe

Meine Kenntnisse entwickelten sich schrittweise von HTML, CSS und JavaScript
über Python und Django bis hin zu React, der Aufgabenverteilung zwischen
Frontend und Backend und dem produktiven Hosting einer Webanwendung.

Dabei lernte ich, technische Entscheidungen eigenständig zu treffen, Probleme
systematisch einzugrenzen und Fehler im Zusammenspiel von Oberfläche, Backend
und Konfiguration zu suchen. Die Wartung und Weiterentwicklung einer real
veröffentlichten Anwendung machten deutlich, wie wichtig nachvollziehbare
Änderungen, praktische Tests und die Pflege bestehender Strukturen sind.

## Technologien und Architektur

| Bereich | Tatsächliche Umsetzung im aktuellen Portfolio |
| --- | --- |
| Oberfläche | HTML, CSS und JavaScript sowie React-Komponenten in JSX |
| Frontend-Build | Vite; React-Importe werden im Hauptfrontend auf `preact/compat` abgebildet |
| Backend | Python und Django; Django REST Framework für einzelne API-Bereiche |
| Datenverwaltung | Django-Modelle und SQLite für die lokale Demo |
| Statische Dateien | Vite-Builds, Django-Template-Tags und WhiteNoise |
| Prüfungen | Django-Tests, Node-Tests und Playwright-Browserprüfungen |
| Versionsverwaltung | Git, GitHub und Git LFS für die Video-Assets |

Django liefert die Portfolio-Routen und die HTML-Seitenhülle über
[server/pages/views.py](server/pages/views.py) und
[server/templates/pages/index.html](server/templates/pages/index.html).
Es stellt auch Metadaten und die Frontend-Konfiguration
`BEIRIT_HOME_CONFIG` bereit. Die Oberfläche wird anschließend im Browser gerendert.

Vite baut das Hauptfrontend aus `frontend/` nach
`server/assets/react-home-dist/`. Django bindet die JavaScript- und CSS-Dateien
über das Build-Manifest ein. Die Anwendung kombiniert damit Django-Templates,
eine komponentenbasierte Oberfläche und ausgewählte JSON-Endpunkte.

Beispielsweise lädt das Portfolio Projektdaten über `GET /api/projects/`.
Das Kontaktformular sendet Formulardaten mit einem CSRF-Token an
`POST /api/contact/` und verarbeitet die JSON-Antwort des Backends. Komponenten,
Datenverwaltung und serverseitige Validierung übernehmen dabei unterschiedliche
Aufgaben innerhalb derselben Anwendung.

Titel, Beschreibungen, Social-Media-Metadaten und strukturierte Daten wurden auf
das Portfolio ausgerichtet. Die Sitemap enthält Hauptseiten und veröffentlichte
Projektberichte. Das ist eine bereits umgesetzte Grundlage für weitere SEO-Arbeit;
Details stehen unter [Portfolio-SEO](docs/architecture/portfolio-seo.md).

Die [Portfolio-Darstellung](docs/architecture/portfolio-presentation.md) beschreibt
die direkte Projektnavigation, technischen Entscheidungsberichte
und aktuellen Desktop- und Mobilansichten der Demos.

## Projekte und Verzeichnisstruktur

| Pfad | Inhalt |
| --- | --- |
| `frontend/` | React/Vite-Frontend des Portfolios |
| `server/` | Django-Backend, Templates und Portfolio-Assets |
| `sprachdienstleistungen/` | Eigenständige Sprachplattform mit Vokabelbox und DeutschLive |
| `apps/deutsch-live/` | DeutschLive-Frontend und separates Django-Demo-Backend |
| `wohnungssuche/` | Django-MVP für gespeicherte Wohnungssuchen |
| `apps/portfolio-demos/` | Kleine Demo- und Referenzprojekte |
| `docs/` | Architektur, Qualität, Struktur und Hosting-Muster |
| `runtime/` | Ignorierte lokale Daten, Screenshots, Medien und Backups |

Der [Strukturplan](docs/structure-plan.md) erläutert die Ordner ausführlicher.

## Installation und lokale Entwicklung

Für das Hauptportfolio werden Python 3.13 und Node.js 22 verwendet, entsprechend
der CI-Konfiguration. Für die Video-Assets wird Git LFS benötigt. Nach dem Klonen
können die Dateien mit `git lfs pull` heruntergeladen werden.

Die folgenden Befehle werden im Wurzelverzeichnis des Repositorys ausgeführt:

```bash
python3 -m venv server/.venv
source server/.venv/bin/activate
python -m pip install -r server/requirements.txt
npm --prefix frontend ci
npm --prefix frontend run build
python server/manage.py migrate
python server/manage.py runserver
```

Die lokale Demo ist anschließend unter `http://127.0.0.1:8000/` erreichbar.
Nach Änderungen am Frontend erzeugt `npm --prefix frontend run build` die von
Django eingebundenen Assets erneut. Zusätzlich steht für die Frontend-Entwicklung
`npm --prefix frontend run dev` zur Verfügung; die Vite-Konfiguration leitet
Backend-Anfragen an den lokalen Django-Server weiter.

Weitere Einrichtungshinweise stehen in [server/README.md](server/README.md),
[sprachdienstleistungen/README.md](sprachdienstleistungen/README.md),
[apps/deutsch-live/README.md](apps/deutsch-live/README.md) und
[wohnungssuche/README.md](wohnungssuche/README.md).

## Konfiguration und Musterdaten

Die veröffentlichten `.env`-Dateien enthalten ausschließlich fiktive Musterdaten
und stimmen mit den jeweiligen `.env.example`-Vorlagen überein. Das Hauptbackend
liest `server/.env`. Lokale Varianten wie `.env.local`, `.env.production` und
`.env.original` bleiben ignoriert; ihr automatisches Laden ist damit nicht zugesagt.
Echte Zugangsdaten, Datenbanken, Exporte und Backups gehören nicht ins Repository.

Meine bewusst veröffentlichten Angaben in Kontakt und Über mich bleiben erhalten.
Technische Konten, Hosting-Ziele, Mail-Zugangsdaten und Zahlungsdaten sind davon
getrennt und durch Muster ersetzt. Domains unter `example.invalid` sind
absichtlich nicht erreichbar. E-Mails werden in der Portfolio-Demo lokal auf der
Konsole ausgegeben. Zahlungen und Billing-Webhooks bleiben deaktiviert.

Die Beispielwerte und lokalen Sicherheitseinstellungen sind für die Demo gedacht.
Vor einer anderen Nutzung müssen Konfiguration, Datenverarbeitung und benötigte
Funktionen für die konkrete Umgebung geprüft werden.

## Repository-Ziel

Alle Pushes gehen an:

```text
git@github.com:beiritdigital/angefangenes-portfolio.git
```

GitHub verwaltet den Portfolio-Quellcode. Ein Push löst kein Hosting-Deployment
aus. Im aktuellen Workspace ist ein Push-Schutz aktiv. Nach einem neuen Clone
lässt er sich mit `git config core.hooksPath scripts/git-hooks` aktivieren. Er
prüft das Repository-Ziel und die Quelldaten und erhält den Git-LFS-Upload.

## Prüfen

Der isolierte Check für Beirit Web läuft mit:

```bash
server/.venv/bin/python server/bin/check_beirit.py
```

Er setzt installierte Frontend-Abhängigkeiten und Chromium für Playwright voraus.
Der Browser kann mit `cd frontend && npx playwright install chromium` eingerichtet
werden. Voraussetzungen, Umfang und Bildvorschauen stehen unter
[Beirit Web prüfen](docs/architecture/beirit-checks.md).

Der Quellcode-Audit prüft auf private Laufzeitdateien und frühere
Hosting-/Accountdaten:

```bash
python3 scripts/check_portfolio_data.py
```

Der gebündelte lokale Check einschließlich Audit läuft über:

```bash
scripts/check-workspace.sh
```

GitHub Actions prüft Beirit Web, DeutschLive und Wohnungssuche getrennt.
Diese Prüfungen helfen bei der Weiterentwicklung; sie bestätigen keine
vollständige Responsive-, SEO-, Accessibility- oder Lighthouse-Optimierung.

## Lizenz und Verwendung

### Verwendung als Vorlage (Template)

Das Repository darf als technische Vorlage, Lernmaterial oder Ausgangspunkt für
eigene Webprojekte verwendet werden, soweit die jeweils geltende Lizenz dies
erlaubt. Die Veröffentlichung des Quellcodes ist keine pauschale Freigabe zur
Übernahme oder Weiterverwendung.

Im Wurzelverzeichnis liegt derzeit keine gemeinsame `LICENSE`-Datei.
[server/LICENSE](server/LICENSE) und
[sprachdienstleistungen/LICENSE](sprachdienstleistungen/LICENSE) enthalten
proprietäre Bedingungen, die eine vorherige schriftliche Zustimmung zur Nutzung
verlangen. Einzelne Demoprojekte haben eigene Lizenzen, beispielsweise die
MIT-Lizenz in [apps/portfolio-demos/botanic/LICENSE](apps/portfolio-demos/botanic/LICENSE).
Drittanbieter-Bestandteile unterliegen ebenfalls ihren jeweiligen Lizenzbedingungen.
Für eine konkrete Verwendung sind die zugehörigen Lizenzdateien maßgeblich.

Das Projekt ist noch nicht vollständig optimiert. Vor einem produktiven Einsatz
können Anpassungen erforderlich sein. Die Verwendung als Vorlage bedeutet nicht,
dass sämtliche Funktionen, Sicherheitsmaßnahmen, responsiven Layouts oder
Qualitätsanforderungen bereits vollständig umgesetzt wurden.
