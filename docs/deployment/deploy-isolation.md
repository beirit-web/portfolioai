# Grenzen der Portfolio-Demos

Das Repository wird ausschließlich nach
`git@github.com:beiritdigital/angefangenes-portfolio.git` gepusht. Die CI prüft
Builds und Tests. Hosting-Aufrufe und automatische Deployments sind deaktiviert.
Die verbleibenden TOML-Dateien sind Architekturbeispiele mit Musterdaten.

| Projekt | Root | Muster-App | Muster-URL | Statische Assets |
| --- | --- | --- | --- | --- |
| Beirit Digital | `server/` | `portfolio-demo-example` | `https://portfolio.example.invalid` | `server/assets/react-home-dist/` |
| Sprachplattform Staging | `sprachdienstleistungen/` | `language-demo-example` | `https://languages-staging.example.invalid` | `sprachdienstleistungen/assets/` |
| Sprachplattform Produktion (Muster) | `sprachdienstleistungen/` | `language-demo-example` | `https://languages.example.invalid` | `sprachdienstleistungen/assets/` |
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
python3 sprachdienstleistungen/bin/check_deploy_isolation.py
```

Die Checks prüfen die getrennten Muster-Hosts und App-IDs. Die früheren
Deploy-Skripte sowie Mail- und Secret-Import-Skripte brechen immer mit einer
Portfolio-Meldung ab. Unterschiedliche Anwendungen behalten ihre eigenen
statischen Assets, Templates, Datenbanken und Tests.
