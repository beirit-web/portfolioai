# Portfolio-Architektur

Ein Django-Server stellt das Portfolio, die Projektberichte und alle Demos bereit.
Das gemeinsame React-Frontend nutzt Preact über `preact/compat`; Vite baut nach
`server/assets/portfolio-dist/`. Django liest dessen Manifest. Projektberichte
und die Projektübersicht erhalten zusätzlich vorgerendertes HTML.

| Projekt | Aktive Quellen | Einstieg |
| --- | --- | --- |
| Sprachlernplattform | `server/lessons/`, `apps/deutsch-live/frontend/`, `server/assets/vokabelbox/` | `/deutschlive/`, `/vokabelbox/` |
| Wohnungssuche | `apps/portfolio-demos/wohnungssuche/frontend/`, `server/pages/housing_api.py` | `/wohnungssuche/` |
| Botanic mit Wetter | `server/botanic/` | `/botanic/` |
| Shop | `server/shop/` | `/shop/` |
| Vertragsgenerator | `server/contracts/` | `/vertragsgenerator/` |
| Notenrechner | `apps/portfolio-demos/notenrechner/` | `/static/portfolio/notenrechner/index.html` |

Die Wohnungssuche verwendet das gemeinsame Vite-Werkzeugpaket. DeutschLive hat
wegen seiner TypeScript-/React-Konfiguration einen eigenen Frontend-Build.
Produktbilder des früheren Shop-Einstiegs bleiben erhalten, weil gespeicherte
Produkte darauf verweisen. Kleine statische Weiterleitungen erhalten bisherige
Demo-URLs. Die aktiven Django-Apps sind keine zusätzlichen Server.

Das Portfolio speichert Kontaktanfragen über `/api/contact/` und stellt
Projektdaten über `/api/projects/` bereit. Konten, CSRF-Schutz und Sessionablauf
bleiben für die Demos erhalten. Der frühere Dienstleistungsbereich mit Bewerbungen,
Terminkalender, Dokumentenupload, Kundenpostfach, PayPal-Rechnungen und
Datenbankexport hat keine aktiven Routen oder Admin-Oberflächen mehr.
Historische Datenmodelle und Migrationen bleiben zur Kompatibilität mit vorhandenen
lokalen Datenbanken erhalten; die Bereinigung verändert deren Daten nicht.

Ein responsives Kontaktformular ersetzt die früheren Desktop-/Mobilvarianten.
`frontend/src/site.css` bündelt die frühere gemeinsame Kaskade; Regeln ohne
Verwendung in den verbleibenden Oberflächen und exakte Dubletten wurden entfernt.
Die kleineren Stylesheets für einzelne Routen und Komponenten bleiben erhalten.
Auch das frühere öffentliche Seitenskript und Server-CSS wurden um Kalender-,
Verwaltungs- und weitere Regeln ohne verbleibende Verbraucher gekürzt.

Die bisherigen separaten Django-Beispiele, Referenzprojekte, Hosting-Dateien,
abgeschlossenen Arbeitspläne und datierten Einzelberichte wurden am
13. Oktober 2026 außerhalb des Repositorys nach
`~/Schreibtisch/ueberfluessiges/Beirit-Digital-2026-10-13/` verschoben.
Dort stehen eine Übersicht, Originale geänderter Dateien und ein SHA-256-Manifest.
Die bereinigte Installation benötigt dieses lokale Archiv nicht.
Die zusätzliche Root-Python-Umgebung und alte lokale Messausgaben sind ebenfalls
archiviert. Die aktive Python-Umgebung bleibt unter `server/.venv/`.
