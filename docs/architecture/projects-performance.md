# Ladeverhalten der Projektübersicht

`/projekte` liefert Seitenrahmen, Navigation, Footer und sämtliche veröffentlichten
Projektkarten direkt als HTML. Der Einstieg `frontend/src/projects.js` ergänzt
Mobilmenü, Tastaturfokus, Scrollbutton und Begriffserklärungen. Native Links führen
weiterhin zu vollständigen Dokumenten. Die Karten sind ohne JavaScript lesbar;
die normale Übersicht lädt weder Preact noch Lucide oder das gemeinsame
Anwendungsmodul und baut den DOM nicht erneut auf.

`projectsI18nPlugin` erzeugt `.vite/projects-presentation.json` aus den kanonischen
Sprachdateien und gemeinsamen Definitionen für Cover, Technologien, Begriffserklärungen
und Projekttexte. `server/pages/projects_overview.py` kombiniert diesen Katalog
mit den aktuellen veröffentlichten Datensätzen. Seine Dateimetadaten bilden den
Cache-Schlüssel; ein neuer Build aktualisiert damit auch einen laufenden lokalen
Server. Templates maskieren die Inhalte und Links beim HTML-Rendering.

Fehlt der Katalog oder der Daten-Bootstrap, lädt der Einstieg dynamisch die
bisherige React-Ansicht `frontend/src/projects.jsx` mit API- und Übersetzungsfallback.
Die dafür erzeugten Übersetzungen enthalten nur Felder der Übersicht. Statische
JavaScript-Abhängigkeiten werden rekursiv im HTML vorgeladen; dynamische Importe
bleiben bedarfsabhängig. Lucide-Attribution und Lizenz für die direkt eingebetteten
SVGs bleiben in der Template-Datei und unter `server/assets/images/lucide-LICENSE.txt`.

`/projekte` verwendet `frontend/src/projects-page.css`. Der Build übernimmt die
benötigten Selektoren aus `styles.css`, `homepage-custom.css` und
`responsive-overrides.css` in derselben Reihenfolge. Der PostCSS-Filter
`frontend/src/lib/projectsCssFilter.mjs` erhält globale Regeln, negative
Selektoren und die Spezifität funktionaler Selektoren. Die Template-Datei bindet
das Ergebnis und anschließend `header-nav.css` inline ein.

Bei Änderungen am Markup der Projektübersicht, am gemeinsamen Seitenrahmen oder
an interaktiven Zuständen muss die Klassenliste im Filter aktualisiert werden.
Auf Mobilgeräten verwendet der Karteninhalt `content-visibility: auto` mit einer
vorläufigen Höhe. Cover-Geometrie und mehrspaltige Ansichten behalten ihre
natürliche Berechnung. Der Browser rendert den Inhalt beim Annähern, bei Fokus
und bei der Suche; bereits gemessene Höhen werden gespeichert.

Die Dokumentklasse für das fertige Seitenlayout steht bereits im HTML,
damit der spätere `load`-Zeitpunkt keine zweite Größenberechnung auslöst. Der
Footer liest die wiederhergestellte Scrollposition nach dem Laden in einem freien
Zeitfenster und reagiert während der Bedienung über einen passiven Scroll-Handler.

Andere Seiten verwenden weiterhin ihre bisherigen Stylesheets. Die Tests im
Filter-Modul prüfen Selektorsemantik; Browser-Tests prüfen Darstellung und
Navigation auf Desktop und Mobilgeräten.

Django liefert veröffentlichte Projekte zusätzlich als `initialProjects` im
JSON-Konfigurationsblock für den optionalen Client-Fallback. Die normale Übersicht
benötigt keine zusätzliche `/api/projects/`-Anfrage. `orderIndex` erhält die vom Server gelieferte Reihenfolge
bei gleichem `sortOrder`, auch bei lokalisierten Titeln.

Das erste verfügbare Projektbild wird im HTML mit passenden `imagesrcset`- und
`imagesizes`-Werten vorgeladen und im Frontend mit `loading="eager"` und
`fetchpriority="high"` angezeigt. Die Größenangaben in Python und JavaScript
müssen übereinstimmen. Die übrigen Bilder verwenden natives Lazy Loading. Rosa und orangefarbene
Projektbuttons verwenden dunkle Schrift; die Tests prüfen den Kontrast aller
Projektaktionen auch bei Hover und Tastaturfokus.

Die sechs Projektcover besitzen WebP-Varianten mit 480 und 768 Pixeln Breite; das
Original mit 1254 Pixeln bleibt die größte Variante. Neue Cover-Varianten lassen
sich mit ImageMagick erzeugen, beispielsweise:

```bash
magick server/assets/images/portfolio-covers/online-shop-cover-v1.webp \
  -resize 480x480 -strip -quality 82 \
  server/assets/images/portfolio-covers/online-shop-cover-v1-480.webp
```

Lokale Messung vom 10. Oktober 2026 mit Lighthouse 12.8.2 auf `/projekte`:
Barrierefreiheit 100, Performance 84–85, LCP 1,7–1,8 Sekunden und keine
Layoutverschiebung. Die JavaScript-Übertragung beim Einstieg beträgt rund
34 KiB statt zuvor 57 KiB. Ungenutztes JavaScript/CSS und renderblockierende
Stylesheets werden nicht mehr beanstandet. Fünf lange Tasks und rund
2,8–2,9 Sekunden gesamte Hauptthread-Arbeit bleiben bestehen; der
Performance-Wert hängt weiterhin von der lokalen CPU-Auslastung ab.

Eine kontrollierte Messung bei 412 Pixeln Breite mit vierfacher
CPU-Verlangsamung verglich die mobile Regel mit ausgeschalteter
`content-visibility`: Layout, Stilberechnung und Prepaint benötigten
zusammen 299–333 statt 478 Millisekunden. Die gesamte Hauptthread-Arbeit
sank in diesen Traces um etwa 11 Prozent. Das mobile Browser-Szenario prüft
zusätzlich Tastaturzugriff und gemessene Kartenhöhen.

Prüfungen:

```bash
npm test --prefix frontend
npm run build --prefix frontend
npm run test:browser --prefix frontend -- projects-performance.spec.cjs portfolio-presentation.spec.cjs projects-accessibility.spec.cjs projects-layout.spec.cjs
npm run lighthouse --prefix frontend -- http://localhost:8000/projekte --only-categories=performance,accessibility
python3 scripts/check_portfolio_data.py
```

## Projektdetailseiten

`server/pages/project_detail.py` kombiniert den aktuellen veröffentlichten
Datensatz mit den kanonischen Projekttexten des Build-Katalogs. Django liefert
Seitenrahmen, Bericht, Cover, Galerie und sämtliche Aktionen direkt als HTML.
Die anfängliche Dokumentklasse steht bereits im HTML. Es gibt keinen zweiten
Aufbau mit nachgeladenen API-Daten und keinen Wechsel von deutschen
Ersatztexten zur gewünschten Sprache.

Der Einstieg `frontend/src/project-detail.js` ergänzt dieselben Menü-, Fokus-
und Scrollfunktionen wie die Übersicht über `lib/enhanceProjectPage.js`.
Die normale Ansicht lädt weder Preact noch die Übersetzungsmodule und benötigt
keine Anfrage an `/api/projects/`. Fehlen die Präsentationsdaten oder der
HTML-Marker, lädt sie dynamisch `project-detail.jsx` mit dem bisherigen
API-Fallback. Native Links führen weiterhin zu vollständigen Dokumenten.

Der Katalog enthält zusätzlich Detailtexte, responsive Bilddefinitionen sowie
Bezeichnungen und Vektordaten der Feature-Icons. Die Feature-Klassifizierung und
Illustrationsquellen teilen sich Build und Client-Ansicht. Django maskiert die
Inhalte und erlaubt für SVGs ausschließlich die benötigten Primitiven und
Attribute. Lucide-Attribution bleibt im gemeinsamen Header-Template und in
`server/assets/images/lucide-LICENSE.txt` erhalten.

`project-detail-page.css` filtert dieselben drei Quell-Stylesheets auf die Klassen
des Berichts und des Seitenrahmens. Django bindet das Ergebnis vor der
Header-Navigation inline ein. Der Browservergleich prüft die berechneten
Darstellungseigenschaften mit der vollständigen CSS-Kaskade bei 320, 768, 1024,
1440 und 1920 Pixeln sowie alle sechs Berichte gegen den Client-Fallback.

`project-detail-rendering.css` benennt Arial direkt, ohne zusätzlichen Fontdownload,
und verwendet für Berichtstexte normalen Zeilenumbruch
statt `pretty`/`balance` und automatischer Silbentrennung. Die vorhandenen
Umbruchregeln für lange Wörter bleiben erhalten. `content-visibility` wird auf
der Detailseite nicht eingesetzt: Es verschob lange Layoutaufgaben hinter den
ersten Bildaufbau und erhöhte dadurch die Blocking-Zeit. Die Browserprüfungen
vergleichen weiterhin alle Berichte und prüfen echten Tastaturzugriff.
Berichtscontainer und technische Entscheidung verwenden keinen Hintergrund,
Rahmen, Radius oder Schatten. Dekorative Pseudoelemente des Containers entfallen.

Cover verwenden `srcset` mit 480, 768, 960 und 1254 Pixeln. Der responsive
Preload im HTML muss dieselben Quellen und `sizes` wie das Hero-Bild verwenden;
die Detailgrößen stehen in Python und JavaScript. Das Hero-Bild wird eager mit
hoher Priorität geladen. Die Galerie verwendet responsive Desktop- und
Mobilaufnahmen, Lazy Loading und `sizes="auto"` mit einem Layout-Fallback.
Links öffnen weiterhin die unverkleinerten Originale. Das Aufnahme-Skript
erneuert die Galerievarianten bei jeder Aufnahme.

Prüfungen der Detailansicht:

```bash
npm test --prefix frontend
npm run build --prefix frontend
npm run test:browser --prefix frontend -- project-detail-performance.spec.cjs portfolio-language.spec.cjs portfolio-presentation.spec.cjs
python3 scripts/check_portfolio_data.py
```

Lokale Trace-Berichte liegen unter `runtime/performance/online-shop/`.
Viewport, CPU-Profil und Laufzeit-Auslastung beeinflussen die Messwerte.

Lokaler Vergleich vom 10. Oktober 2026 auf `/projekte/online-shop` mit dem mobilen
Lighthouse-Standardprofil: Hauptthread-Arbeit 2,8 → 1,2 Sekunden,
LCP 2,3 → 1,8 Sekunden, TBT 790 → 290 Millisekunden und CLS 0,005 → 0.
Die gemessene JavaScript-Übertragung sinkt von rund 46 auf 6 KiB.
Performance 79 → 94, Barrierefreiheit bleibt 100. Die API-Kette im kritischen
Netzwerkbaum entfällt. Die 138 DOM-Elemente sind unauffällig.
Die Diagnoseansichten werden weiterhin angezeigt.
Zwei unabhängige Abschlussläufe erreichen 100 und 94 Performance-Punkte
mit jeweils 1,2 Sekunden Hauptthread-Arbeit, LCP 1,8 Sekunden und CLS 0.
TBT schwankt zwischen 60 und 290 Millisekunden.

Im Desktop-Profil bei 992 × 1000 Pixeln erreicht die abschließende Messung
Performance 99 und Barrierefreiheit 100, LCP 0,5 Sekunden,
Hauptthread-Arbeit 0,8 Sekunden und CLS 0.
