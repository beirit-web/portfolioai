# Grenzen der Portfolio-Demos

Das Repository wird ausschließlich nach
`git@github.com:beiritdigital/angefangenes-portfolio.git` gepusht. Die CI prüft
Builds und Tests. Hosting-Aufrufe und automatische Deployments sind deaktiviert.
Die verbleibenden TOML-Dateien sind Architekturbeispiele mit Musterdaten.

| Projekt | Root | Muster-App | Muster-URL | Statische Assets |
| --- | --- | --- | --- | --- |
| Beirit Digital | `server/` | `portfolio-demo-example` | `https://portfolio.example.invalid` | `server/assets/react-home-dist/` |
| Sprachplattform Staging | `apps/portfolio-demos/sprachdienstleistungen/` | `language-demo-example` | `https://languages-staging.example.invalid` | `apps/portfolio-demos/sprachdienstleistungen/assets/` |
| Sprachplattform Produktion (Muster) | `apps/portfolio-demos/sprachdienstleistungen/` | `language-demo-example` | `https://languages.example.invalid` | `apps/portfolio-demos/sprachdienstleistungen/assets/` |
| DeutschLive eigenständig | `apps/deutsch-live/` | `deutschlive-demo-example` | `https://deutschlive.example.invalid` | `apps/deutsch-live/backend/frontend_dist/` |

`example.invalid` ist kein erreichbares Hosting-Ziel. Die Dateien enthalten keine
Produktionskonten, DNS-Records oder Zugangsdaten. Eine neue Hosting-Anbindung würde
eine eigenständige Konfiguration außerhalb dieser Portfolio-Vorgaben erfordern.

Die veröffentlichten `.env`-Dateien sind fiktive Muster und stimmen mit ihren
`.env.example`-Vorlagen überein. Lokale Varianten wie `.env.local`,
`.env.production` und `.env.original` bleiben ignoriert. Echte Zugangsdaten
dürfen in keiner Portfolio-Umgebungsdatei stehen.

## Lokale Prüfung

```bash
python3 server/bin/check_deploy_isolation.py
python3 apps/portfolio-demos/sprachdienstleistungen/bin/check_deploy_isolation.py
```

Die Checks prüfen die getrennten Muster-Hosts und App-IDs. Die früheren
Deploy-Skripte sowie Mail- und Secret-Import-Skripte brechen immer mit einer
Portfolio-Meldung ab. Die Anwendungen behalten ihre eigenen Datenbanken und Tests.
Das gemeinsame Portfolio und der Sprachplattform-Beispielstand teilen gezielt
die Vokabelbox-Assets und das Inhalts-Template.

Das lokale Portfolio-Containerbeispiel verwendet den Repository-Stamm als
Build-Kontext: `docker build -f server/Dockerfile .`. Die Root-`.dockerignore`
begrenzt den Kontext auf `server/`, die gemeinsamen Vokabelbox-Dateien und deren
MIT-Lizenz; lokale Umgebungen und Daten bleiben ausgeschlossen. Der Container
behält die bisherigen `/code`-Pfade und enthält die Modulquellen unter `/apps/`.
