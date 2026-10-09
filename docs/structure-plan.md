# Strukturplan

Ziel: Das Repository soll leichter wartbar werden, ohne bestehende Deployments, Imports oder statische Pfade unkontrolliert zu brechen. Deshalb wird erst dokumentiert und danach in kleinen Schritten verschoben.

## Beobachtungen

- Das Root-Verzeichnis ist aktuell ein gemischter Workspace aus Hauptprojekt, Nebenprojekten, Portfolio-Demos, Build-Artefakten, Backups und Dokumentation.
- `server/` und `frontend/` wirken wie das aktuelle Hauptprojekt.
- `sprachdienstleistungen/` bleibt bewusst als eigener Root-Ordner bestehen, weil sonst die Deploy-Zuordnung irrefuehrend wird.
- Die alte initiale Wohnungssuche-Implementierungsquelle wurde entfernt. Die weitergefuehrte Variante liegt unter `wohnungssuche/`.
- `deutschLive/` wurde nach `apps/deutsch-live/` verschoben.
- Die kleinen Portfolio-Demos wurden aus dem Root nach `apps/portfolio-demos/` verschoben.
- Root-Runtime wurde nach `runtime/` verschoben. App-spezifische Runtime-Ordner wie `server/staticfiles/`, `server/media/` und `server/db_backups/` bleiben vorerst bei der jeweiligen App.

## Vorgeschlagene Zielstruktur

```text
Beirit-Digital/
├── apps/
│   ├── beirit-site/
│   │   ├── backend/
│   │   └── frontend/
│   ├── deutsch-live/
│   ├── wohnungssuche/
│   └── portfolio-demos/
│       ├── 3d-wave-grid/
│       ├── botanic/
│       ├── musikplayer/
│       ├── online-shop/
│       ├── notenrechner/
│       ├── vertragsgenerator/
│       └── vokabelbox/
├── docs/
│   ├── architecture/
│   ├── deployment/
│   ├── security/
│   └── archive/
├── infra/
│   ├── docker/
│   └── fly/
├── runtime/
│   ├── backups/
│   ├── media/
│   ├── screenshots/
│   └── staticfiles/
├── scripts/
└── README.md
```

## Einordnung der aktuellen Ordner

| Aktueller Ordner | Vorschlag | Hinweis |
| --- | --- | --- |
| `server/` | `apps/beirit-site/backend/` | Vermutlich aktueller Django-Backend-Teil. Vor dem Verschieben Imports, Dockerfile, Fly-Konfig und statische Pfade pruefen. |
| `frontend/` | `apps/beirit-site/frontend/` | Vermutlich aktueller React/Vite-Frontend-Teil. Build-Ausgabe im Backend pruefen. |
| `sprachdienstleistungen/` | Im Root behalten | Bewusst separat wegen Deploy-Zuordnung. Nicht in `apps/` verschieben, solange Deployments daran haengen. |
| `apps/deutsch-live/` | In `apps/` behalten | Eigenes Produkt mit Frontend, Backend, Docs und Deploy-Dateien. |
| `wohnungssuche/` | Im Root behalten | Laufende Wohnungssuche-Variante. |
| Kleine Demo-Projekte | `apps/portfolio-demos/` | Erledigt. Die Quellordner liegen jetzt gesammelt unter `apps/portfolio-demos/`. |
| `runtime/` | Im Root behalten, aber ignorieren | Enthaelt lokale Laufzeitdaten aus den ehemaligen Root-Ordnern `data/`, `media/`, `staticfiles/` und `screenshots/`. |
| `docs/` | `docs/` | Untergliedert in `architecture/`, `deployment/`, `security/` und `archive/`. |

## Migrationsphasen

### Phase 1: Inventar und Entscheidung

- Aktive Deployments bestimmen: Welche Ordner werden aktuell wirklich benutzt?
- Dubletten klaeren: alte Wohnungssuche-Quelle ist entfernt; `sprachdienstleistungen/` bleibt wegen Deploy-Zuordnung separat.
- Root-README erstellen oder aktualisieren mit kurzer Projektkarte.
- `.gitignore` gegen Laufzeit- und Build-Dateien pruefen.

### Phase 2: Risikoarme Verschiebungen

- Kleine Portfolio-Demos nach `apps/portfolio-demos/` verschieben. Erledigt.
- Dokumente nach Thema unter `docs/architecture/`, `docs/deployment/`, `docs/security/` oder `docs/archive/` sortieren. Begonnen.
- Skripte nach `scripts/` oder in den jeweiligen App-Ordner legen. Begonnen mit `scripts/check-workspace.sh`.

### Phase 3: Hauptprojekt ordnen

- `server/` und `frontend/` unter `apps/beirit-site/` zusammenfuehren.
- Pfade in `Dockerfile`, `fly.toml`, Build-Skripten, CI und Django-Settings aktualisieren.
- Lokalen Build und Django-Checks ausfuehren.

### Phase 4: Runtime und Artefakte bereinigen

- Backups, Screenshots, Media und Staticfiles aus dem Projekt-Root entfernen oder nach `runtime/` verlagern. Erledigt fuer Root-Runtime.
- Pruefen, ob diese Ordner versioniert sein sollen. In der Regel sollten Backups und generierte Staticfiles nicht im Git liegen.

## Empfohlene naechste Schritte

1. Aktiven Produktionspfad bestaetigen: wahrscheinlich `server/` plus `frontend/`.
2. `sprachdienstleistungen/` vorerst nicht verschieben, weil der Ordner die Deploy-Zuordnung klar haelt.
3. Nach jeder Verschiebephase `git status`, Builds und relevante Tests ausfuehren.
