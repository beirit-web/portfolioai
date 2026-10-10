# Bereinigungsstand am 10. Oktober 2026

**43 bestätigte ungenutzte Dateien mit 1.78 MiB** wurden auf Nutzerwunsch nach `~/Bilder/Bilder/Beirit-Digital-ungenutzt-2026-10-10` verschoben.
Die ursprüngliche Verzeichnisstruktur bleibt erhalten. `README.md` und `verschiebung.json` im Zielordner enthalten das Verzeichnis der ausgelagerten Dateien und SHA-256-Prüfsummen. Alle 43 Dateiinhalte wurden nach dem Transfer geprüft.

Bereits vorher entfernt: **27 Bilder und Videos mit 315.64 MiB**. `server/assets/images/ladeseite.mp4` war beim Transfer schon entfernt und wurde deshalb nicht verschoben.
**22 Bilddateien mit 6,77 MiB** bleiben zur weiteren Prüfung im Projekt. Alle bestätigten direkten Bereinigungskandidaten sind jetzt ausgelagert.

Die Größen gelöschter Git-LFS-Dateien stammen aus deren ursprünglichen Dateigrößen. Verschobene Projektordner und ersetzte Frontend-Builddateien zählen nicht zu den entfernten Bildern und Videos.

Sechs Lizenzdateien wurden zusätzlich nach `lizenzen/` im Zielordner kopiert; ihre Originale bleiben im Projekt. Urheberhinweise wurden unverändert übernommen.

## Ausgelagerte Dateien

Die Pfade in der ersten Spalte sind relativ zum ursprünglichen Projektordner und zum Zielordner. Zum Wiederherstellen die betreffende Datei an ihren ursprünglichen Pfad zurückkopieren und vorhandene Dateien vorher prüfen.

| Ursprünglicher relativer Pfad | Beleg für fehlende Nutzung |
| --- | --- |
| `frontend/src/brand.scss` | Kein Import und kein Vite-Einstieg. |
| `frontend/src/components/home/hero/Hero3d.scss` | Kein Import und kein Vite-Einstieg. |
| `frontend/src/components/home/faqsection/FaqSection.jsx` | Nicht importiert; die aktive FAQ-Darstellung liegt in App.jsx. FaqSection.css bleibt aktiv. |
| `frontend/src/components/home/technologyproofsection/TechnologyProofSection.jsx` | Nicht importiert; aktive Darstellung in App.jsx. Die gleichnamige CSS-Datei bleibt aktiv. |
| `frontend/src/components/payment/PaymentPages.jsx` | Kein Import; Zahlungsrouten führen zur Projektübersicht. |
| `frontend/src/components/ui/select.jsx` | Kein Import aus den aktiven Frontend-Einstiegen. |
| `server/scripts/force_migrate.py` | Nur ein Kommentar, keine ausführbare Migration und kein Aufrufer. |
| `server/templates/pages/donate.html` | Die Donate-View leitet weiter und rendert diese Datei nicht. |
| `server/templates/partials/home_trust_strip.html` | Kein Template-Include oder Render-Aufruf. |
| `apps/portfolio-demos/sprachdienstleistungen/templates/pages/donate.html` | Die Donate-View leitet weiter. |
| `apps/portfolio-demos/sprachdienstleistungen/templates/partials/home_trust_strip.html` | Kein Template-Include oder Render-Aufruf. |
| `apps/portfolio-demos/sprachdienstleistungen/templates/partials/weather_widget.html` | Kein Template-Include oder Render-Aufruf. |
| `server/assets/css/home-platform.min.css` | Templates laden die CSS-Dateien mit ihrem genauen Namen; es gibt keine automatische Auswahl der .min.css-Kopie. |
| `server/assets/css/home-shell.min.css` | Templates laden die CSS-Dateien mit ihrem genauen Namen; es gibt keine automatische Auswahl der .min.css-Kopie. |
| `server/assets/css/main.min.css` | Templates laden die CSS-Dateien mit ihrem genauen Namen; es gibt keine automatische Auswahl der .min.css-Kopie. |
| `server/assets/css/root.min.css` | Templates laden die CSS-Dateien mit ihrem genauen Namen; es gibt keine automatische Auswahl der .min.css-Kopie. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/index-Cl4SS1QI.js` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/camp-lantern.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/camp-lantern.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/merino-beanie.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/merino-beanie.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/rain-shell.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/rain-shell.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/ridge-runners.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/ridge-runners.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/thermal-bottle.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/thermal-bottle.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/trail-pack.jpg` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/portfolio/online-shop/assets/trail-pack.webp` | Der aktuelle Shop-Einstieg lädt einen anderen Bundle; diese Dateien werden nicht referenziert. |
| `server/assets/portfolio/online-shop/assets/index-Cm5kXj6C.js` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/online-shop/assets/index-CB85SIjK.css` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/enbt-botanic/assets/index-013d7fe6.js` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/enbt-botanic/assets/index-cb9c3c84.css` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/enbt-botanic/vite.svg` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/musikplayer/app.js` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/musikplayer/style.css` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/musikplayer/assets/track-image.webp` | Der frühere statische Einstieg führt jetzt zu einer integrierten Demo beziehungsweise zum Projektbericht und lädt diese Dateien nicht mehr. |
| `server/assets/portfolio/vokabelbox-main/app.js` | Alter statischer Einstieg leitet nach /vokabelbox/ weiter; aktive JS/CSS-Quellen liegen in apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/ und werden unter /static/vokabelbox/ geladen. Diese alten Sidecars werden nicht eingebunden. |
| `server/assets/portfolio/vokabelbox-main/style.css` | Alter statischer Einstieg leitet nach /vokabelbox/ weiter; aktive JS/CSS-Quellen liegen in apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/ und werden unter /static/vokabelbox/ geladen. Diese alten Sidecars werden nicht eingebunden. |
| `apps/portfolio-demos/sprachdienstleistungen/utils/force_migrate.py` | Datei enthält nur einen unreferenzierten Hinweistext; kein ausführbarer Code und kein Aufrufer. |
| `apps/portfolio-demos/botanic/client/src/components/PlantList.jsx` | Nicht im eigenen Botanic-Demo-Importgraph verwendet. main.jsx lädt App.jsx, das die Pflanzenliste direkt rendert; kein Import von PlantList. |
| `apps/portfolio-demos/botanic/client/src/components/SearchBar.jsx` | Nicht im eigenen Botanic-Demo-Importgraph verwendet. Die Suche wird direkt in App.jsx gerendert; kein Import von SearchBar. |
| `apps/portfolio-demos/botanic/client/src/index.css` | Kein Import aus main.jsx/App.jsx, keine HTML-Einbindung und kein Vite-Einstieg im Botanic-Demoprojekt; App.css bleibt aktiv. |

## Bilddateien vor dem Entfernen prüfen

Für diese Dateien wurden keine aktuellen Dateiverweise gefunden. Sie können
ältere Bildvarianten, Originale oder Gestaltungsmaterial enthalten. Ihre fehlende
Code-Nutzung allein entscheidet nicht, ob das Original aufbewahrt werden soll.
Öffentlich verwendete Eigentümerbilder und Kontakt-/Über-mich-Angaben bleiben erhalten.

| Datei | Größe |
| --- | ---: |
| [server/assets/images/enbt-blur-336.webp](../../server/assets/images/enbt-blur-336.webp) | 0,00 MiB |
| [server/assets/images/enbt-blur-463.webp](../../server/assets/images/enbt-blur-463.webp) | 0,00 MiB |
| [server/assets/images/enbt-blur.png](../../server/assets/images/enbt-blur.png) | 0,25 MiB |
| [server/assets/images/enbt-retouched-336.webp](../../server/assets/images/enbt-retouched-336.webp) | 0,01 MiB |
| [server/assets/images/enbt-retouched-463.webp](../../server/assets/images/enbt-retouched-463.webp) | 0,02 MiB |
| [server/assets/images/logotype_dark-320.webp](../../server/assets/images/logotype_dark-320.webp) | 0,03 MiB |
| [server/assets/images/portfolio-deutschlive-mobile.webp](../../server/assets/images/portfolio-deutschlive-mobile.webp) | 0,03 MiB |
| [server/assets/images/portfolio-deutschlive-tablet.webp](../../server/assets/images/portfolio-deutschlive-tablet.webp) | 0,05 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-336.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-336.webp) | 0,02 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-463.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-463.webp) | 0,03 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair.png) | 1,84 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar.png) | 1,84 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-336.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-336.webp) | 0,02 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-463.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-463.webp) | 0,03 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait.png) | 1,82 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-336.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-336.webp) | 0,00 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-463.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-463.webp) | 0,00 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur.png) | 0,25 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-336.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-336.webp) | 0,01 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-463.webp](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-463.webp) | 0,02 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-balanced.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-balanced.png) | 0,23 MiB |
| [apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched.png](../../apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched.png) | 0,26 MiB |

## Bereits erledigt und angepasste Verweise

Die acht alten Videos sowie 19 Logo-, Icon- und Bildvarianten unter
`server/assets/images/` sind bereits entfernt. Die vollständige Liste steht
im Feld `already_removed` der JSON-Datei. Sie gehören nicht mehr in die Löschliste.

Die entfernten Dateien `logo-light.ico`, `logo-transparent-130.webp` und
`logo-transparent-160.webp` hatten noch Verweise. Botanic und Vertragsgenerator
verwenden jetzt das vorhandene `beirit-web-favicon-mini.svg`; der Vertragsgenerator
und seine Logo-Upload-Prüfung verwenden `aktueles-logo-160.webp`.
Der Manifest-Fallback-Test benötigt die entfernten Videos ebenfalls nicht mehr.

## Aktive Dateien und weitere Projektquellen

- `server/assets/react-home-dist/`: 39 aktuelle Buildassets und zwei Katalog-/Manifestdateien; sämtliche 41 Dateien sind vorhanden und zugeordnet.
- Aktuelle DeutschLive-Builds im gemeinsamen Server, im Sprachplattform-Beispiel und im DeutschLive-Backend.
- Die fünf Laufzeitdateien der Wohnungssuche unter `server/assets/portfolio/wohnungssuche/`.
- Die gemeinsame Vokabelbox unter `apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/` und ihr Inhalts-Template `templates/modules/vokabelbox_content.html`. Beide Server verwenden diese Quellen.
- Responsive Cover, Projektvorschauen und Galerie-Originale: ihre Namen entstehen teilweise dynamisch.
- `FaqSection.css` und `TechnologyProofSection.css`: aktive Vite-Einstiege, auch wenn die gleichnamigen JSX-Komponenten ungenutzt sind.
- Die aktuellen Logos `aktueles-logo-160.webp`, `aktueles-logo-320.webp`, `aktueles-logo.png`, `aktueles-logo-180.png` und `beirit-web-favicon-mini.svg`.
- Django-Migrationen, automatisch entdeckte Admin-/Auth-/Fehler-Templates, Lizenzen und Urheberhinweise.
- Lokale Datenbanken, Medien, Backups, virtuelle Umgebungen und Abhängigkeiten gehören nicht zur Liste ungenutzter Quelldateien.

Die zusätzlichen Quellen unter `apps/portfolio-demos/` sind teilweise ältere
Portfolio-Beispiele. Ganze Projektordner sind deshalb keine pauschalen
Löschkandidaten. Das betrifft besonders den zusätzlichen Django-MVP der
Wohnungssuche, den Botanic-React/Express-Stand, Notenrechner-Varianten und separat
aufrufbare Referenzdemos wie `browser-cleaning/` und `3d-wave-grid/`.
In der direkten Liste stehen nur konkret unverbundene Dateien.

Generierte Ergebnisse in `runtime/` lassen sich neu erzeugen; eine Entfernung
macht vorhandene Screenshot- und Messbericht-Links in der Dokumentation ungültig.
`staticfiles/` ist eine collectstatic-Ausgabe und kann von WhiteNoise verwendet
werden; diesen Ordner im Zusammenhang mit einem erneuten collectstatic behandeln.

## Prüfung nach dem Verschieben

- 43 verschobene Dateien mit SHA-256 gegen die Ausgangsinhalte geprüft; alle stimmen überein. Eine unabhängige Nachprüfung bestätigt Pfade, Größen und Prüfsummen.
- Sechs Lizenzoriginale und ihre Archivkopien sowie alle 22 vorgemerkten Bilddateien sind erhalten.
- Frontend-Build und separater Botanic-Beispielbuild bestanden. Der Botanic-Beispielbuild wurde ausschließlich in einem temporären Verzeichnis erzeugt; aktive statische Weiterleitungen bleiben erhalten.
- Frontendtests und Übersetzungsprüfung bestanden.
- 86 Django-Tests für Vertragsgenerator, Botanic, Home-Helfer, Projektseiten und Vokabelbox bestanden.
- 28 Browserprüfungen auf Handy und Desktop bestanden: acht für die Projekt-Navigation und 20 für die Vokabelbox.
- 72 wörtliche Asset-Verweise auf 42 unterschiedliche Dateien aus gemeinsamen Django-Templates geprüft; keine fehlenden Dateien.
- Aktuelles Vite-Manifest geprüft; sämtliche 41 Build- und Katalogdateien sind vorhanden und zugeordnet.
- Portfolio-Datenprüfung und `git diff --check` bestanden.

[Maschinenlesbare Übersicht mit Größen, Belegen und Archivpfaden](unused-files-2026-10-10.json).
