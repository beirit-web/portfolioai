# Portfolio-Struktur

Das Repository enthält ein gemeinsames Portfolio und die demonstrativen Quellen
seiner Projekte. Das Hauptfrontend liegt in `frontend/`, der gemeinsame Django-Server
in `server/`. Frühere Hosting-Konfigurationen sind ausschließlich Muster.

## Aktuelle Struktur

```text
Beirit-Digital/
├── frontend/
├── server/
├── apps/
│   ├── deutsch-live/
│   └── portfolio-demos/
│       ├── 3d-wave-grid/
│       ├── botanic/
│       ├── musikplayer/
│       ├── notenrechner/
│       ├── online-shop/
│       ├── sprachdienstleistungen/
│       ├── vertragsgenerator/
│       ├── vokabelbox/
│       └── wohnungssuche/
├── docs/
├── runtime/
└── scripts/
```

## Zuordnung der Quellen

| Verzeichnis | Verwendung |
| --- | --- |
| `frontend/` | Gemeinsames Portfolio-Frontend und Projektberichte |
| `server/` | Gemeinsamer Django-Server, veröffentlichte Demo-Routen und Assets |
| `apps/portfolio-demos/sprachdienstleistungen/` | Django-Beispiel der Sprachplattform mit integrierten Lernmodulen |
| `apps/portfolio-demos/wohnungssuche/` | Zusätzlicher Django-MVP der Wohnungssuche |
| `apps/deutsch-live/` | Gemeinsame DeutschLive-Frontend-Quelle und dokumentierter Backend-Beispielstand |
| `apps/portfolio-demos/` | Weitere demonstrative Quellen und ältere Projektstände |
| `runtime/` | Ignorierte lokale Berichte, Screenshots und andere Laufzeitdateien |

Sprachdienstleistungen und Wohnungssuche gehören wie die anderen Projekte unter
`apps/portfolio-demos/`. Ihre bisherigen Root-Ordner wurden vollständig verschoben.
CI, Build-Ausgabe, Browserprüfungen und Dokumentationslinks verwenden die neuen Pfade.
Lokale Datenbanken, virtuelle Umgebungen und weitere ignorierte Dateien wurden
beim Verschieben erhalten und gehören weiterhin nicht in Git.

Die laufende Sprach-Demo verwendet `server/lessons/`, `/deutschlive/` und `/vokabelbox/`.
Die Vokabelbox nutzt direkt die Modulassets und das gemeinsame Inhalts-Template aus
`apps/portfolio-demos/sprachdienstleistungen/`; ihre Portfolio-Oberfläche liegt in
`server/templates/pages/vokabelbox.html`. Der frühere statische Einstieg leitet zum
vollständigen Lernmodul weiter. Die aktive
Wohnungssuche verwendet `server/assets/portfolio/wohnungssuche/` und die API in
`server/pages/`. Der zusätzliche Django-MVP ist deshalb kein Ersatz für den
aktuell veröffentlichten React-Build. Die vorhandenen Projekt- und Demo-URLs
bleiben gültig.

## Bereinigung

Ein fehlender statischer Import reicht als Löschbeleg nicht aus: Django entdeckt
Templates und Migrationen teilweise anhand ihrer Namen; responsive Bilder und
Build-Manifeste verweisen auf dynamisch zusammengesetzte Dateipfade.
Die geprüften Kandidaten und ihre Nutzung stehen im
[Bereinigungsbericht](maintenance/unused-files-2026-10-10.md).
