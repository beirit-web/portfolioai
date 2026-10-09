# Beirit Digital Portfolio

Dieses Repository zeigt meine Webprojekte mit ihrem Quellcode. Die Anwendungen
laufen als lokale Portfolio-Demos. Frühere Hosting-Konfigurationen enthalten nur
Musterdaten; automatische Deployments und die früheren Deployment-/Secret-Skripte
sind deaktiviert. Zahlungsfunktionen dienen als Demo und dürfen keine echten
Zugangsdaten oder Zahlungen verwenden.

Meine bewusst veröffentlichten Angaben in Kontakt und Über mich bleiben erhalten.
Technische Konten, Hosting-Ziele, Mail-Zugangsdaten und Zahlungsdaten sind davon
getrennt und werden durch Muster ersetzt. Domains unter `example.invalid` sind
absichtlich nicht erreichbar.

## Repository-Ziel

Alle Pushes gehen an:

```text
git@github.com:beiritdigital/angefangenes-portfolio.git
```

GitHub verwaltet den Portfolio-Quellcode. Die CI baut die Frontends und prüft die
Anwendungen. Ein Push löst kein Hosting-Deployment aus.

Im aktuellen Workspace ist ein Push-Schutz aktiv. Nach einem neuen Clone lässt
er sich mit `git config core.hooksPath scripts/git-hooks` aktivieren. Er prüft
das Repository-Ziel und die Quelldaten und erhält den Git-LFS-Upload.

## Projekte

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

Lokale Einrichtung steht in [server/README.md](server/README.md),
[sprachdienstleistungen/README.md](sprachdienstleistungen/README.md) und
[apps/deutsch-live/README.md](apps/deutsch-live/README.md).
Umgebungsdateien werden lokal aus den jeweiligen `.env.example`-Vorlagen angelegt.
Eigene `.env`-Dateien, Datenbanken und Backups gehören nicht ins Repository.

## Prüfen

Der isolierte Check für Beirit Web läuft mit:

```bash
server/.venv/bin/python server/bin/check_beirit.py
```

Voraussetzungen, Umfang und Bildvorschauen stehen unter
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

GitHub Actions prüft Beirit Digital, DeutschLive und Wohnungssuche getrennt.
Die Hosting-Muster und die Grenzen der einzelnen Apps sind in
[docs/deployment/deploy-isolation.md](docs/deployment/deploy-isolation.md)
beschrieben. Der [Strukturplan](docs/structure-plan.md) erklärt die Ordner.
