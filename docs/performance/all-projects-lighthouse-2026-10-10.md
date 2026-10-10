# Alle Projektseiten: Refactoring und Lighthouse am 10. Oktober 2026

Die historischen Berichte und Bildvorschauen wurden am 10. Oktober 2026 nach
`~/Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10` archiviert. Die
Berichtslinks öffnen diese lokalen Archivdateien; neue Prüfläufe verwenden
weiterhin ihre bisherigen Ausgabepfade im Projekt.

Der Ablauf der Shop-Seite wurde auf Sprachplattform, Vertragsgenerator,
Wohnungssuche Bodensee, Notenrechner und ENBT Botanic übertragen. Die sechs
Detailseiten verwenden jetzt dieselbe Darstellung in Django und im React-Fallback.

## Visuelle Umsetzung und Refactoring

- Überschriften horizontal zentriert; Hauptbuttons und vorhandene Modulaktionen
  kompakt und rechts ausgerichtet.
- Ab 1100 Pixeln stehen die Detailkarten links und das Cover rechts. Darunter
  folgt auf das Cover die Kartenliste. Der Berichtscontainer verwendet die
  gedeckte Fläche `#e6e0d7` ohne dekorative Rahmen und Pseudoelemente.
- Erstes Refactoring: die bisherigen Shop-Bedingungen in Django und React
  entfallen. Alle Projekte verwenden die gemeinsamen Vorschau- und Berichtskomponenten
  beziehungsweise Teiltemplates.
- Optimierung: eine gemeinsame `sizes`-Definition passt zu diesem Spaltenwechsel.
  Alle Detail-Preloads übernehmen die Bildquellen aus dem Build-Katalog und gelten
  erst ab 1100 Pixeln. Mobil wird das Cover über das eager HTML-Bild geladen.
  Die bereits erzeugten 640-Pixel-Cover und 320-Pixel-Galerievarianten stehen
  sämtlichen Projekten zur Verfügung. Originale und Galerie-Linkziele bleiben erhalten.
- Zweites Refactoring: obsolete Regeln für das zweispaltige Hero-Layout entfernt
  und die Hintergrunddefinition zusammengeführt. `projectModuleActions.mjs`
  definiert die Modul-Links samt deutschen, russischen und ukrainischen Labels
  für den Client und den Django-Build-Katalog gemeinsam.
- Technische Entscheidungen, Features, Galerie, Technologien und Modul-Zieladressen
  bleiben vollständig verfügbar. Kontakt- und Über-mich-Angaben bleiben erhalten.

## Messverfahren

Gemessen wurde nach dem lokalen Vite-Build über den Django-Prüfserver auf
`http://127.0.0.1:8765` mit temporärer Beispieldatenbank. Der Ausgangslauf je
Seite stammt nach den bisherigen Shop-Arbeiten und vor der Übertragung des
Layouts. Nach beiden Refactorings folgen jeweils drei mobile Abschlussläufe
und ein Desktop-Lauf mit Lighthouse 12.8.2. Lighthouse-Läufe erfolgen
nacheinander mit frischen Browserprofilen, ohne parallele Builds oder Browsertests.
Mobil: 412 × 823 Pixel, DPR 1,75 und das simulierte Standard-Drosselungsprofil.
Desktop: `--preset=desktop`, 1350 × 940 Pixel, DPR 1.
Der Performance-Vergleich ist eine lokale Labormessung mit einem einzelnen
Ausgangslauf; CPU-Auslastung und native Browserarbeit beeinflussen die Werte.

## Ergebnisse

| Projekt | Mobil vorher | Mobil danach: Median (Spanne) | Desktop danach |
| --- | ---: | ---: | ---: |
| Sprachplattform | 75 | 90 (83–94) | 93 |
| Vertragsgenerator | 87 | 90 (81–96) | 100 |
| Wohnungssuche Bodensee | 89 | 98 (94–98) | 99 |
| Notenrechner | 99 | 98 (98–99) | 96 |
| ENBT Botanic | 91 | 81 (79–95) | 98 |

Alle Abschlussläufe erreichen für Barrierefreiheit, Best Practices und SEO
100 Punkte, mobil und auf Desktop. Die mobilen Ausgangsläufe erreichten
in diesen Kategorien ebenfalls 100 Punkte.

| Projekt | LCP vorher → danach | TBT vorher → danach | CLS danach | Bilddaten vorher → danach |
| --- | ---: | ---: | ---: | ---: |
| Sprachplattform | 1.32 → 1.37 s | 1301 → 398 ms | 0.000 | 82,014 → 78,328 Bytes (−4.5 %) |
| Vertragsgenerator | 1.38 → 1.37 s | 535 → 408 ms | 0.000 | 69,555 → 64,958 Bytes (−6.6 %) |
| Wohnungssuche Bodensee | 1.30 → 1.33 s | 460 → 177 ms | 0.000 | 80,973 → 77,397 Bytes (−4.4 %) |
| Notenrechner | 1.37 → 1.37 s | 124 → 168 ms | 0.000 | 73,636 → 69,814 Bytes (−5.2 %) |
| ENBT Botanic | 1.34 → 1.37 s | 379 → 776 ms | 0.000 | 69,083 → 64,944 Bytes (−6.0 %) |

Mobil ist CLS in allen Abschlussläufen 0. Desktop zeigt sehr kleine Werte
zwischen 0,0004 und 0,0015; die exakten Zahlen stehen in `summary.json`.

Die Abschlusswerte der zweiten Tabelle sind mobile Mediane. Die Rohwerte aller
drei Läufe bleiben im JSON-Bericht erhalten. Ein hoher Einzellauf ersetzt
keine stabile Messreihe. Veränderungen des Scores werden deshalb zusammen
mit der Spanne und den tatsächlichen Bilddaten ausgewiesen.

Der mobile Median von ENBT Botanic liegt mit 81 unter dem einzelnen
Ausgangswert von 91. Seine Abschlussläufe schwanken zwischen 79 und 95;
ein Gesamtgewinn ist dort nicht nachgewiesen. Die Hauptthread-Diagnose
weist überwiegend nicht weiter zugeordnete Browserarbeit sowie Stil- und
Layoutarbeit aus. Die JavaScript-Auswertung ist ein kleinerer Anteil.
Auch der Notenrechner zeigt mit 98 gegenüber 99 keinen Score-Gewinn.

Die letzte Desktop-Messung von ENBT Botanic musste wegen `NO_NAVSTART`
(fehlender Navigationsbeginn in der Lighthouse-Aufzeichnung) wiederholt werden.
Dieser fehlgeschlagene Lauf wird nicht als Performance-Ergebnis gewertet.

Jeder mobile Abschlusslauf lädt genau eine Cover-Quelle. Die verbleibenden
Lighthouse-Hinweise zur Galerie-Bildauslieferung sind in den Einzelberichten
und als `imageOpportunity` in `summary.json` dokumentiert. Sie dürfen nicht
mit den allgemeinen Laufwarnungen verwechselt werden.

## Validierung und Artefakte

- Frontend-Tests, Vite-Build, 44 Django-Tests und `git diff --check` bestanden.
- 33 Browserchecks bestanden; ein Hover-Test wird auf Touch-Geräten übersprungen.
  Geprüft: Layout und Aktionsausrichtung aller sechs Seiten, native Darstellung
  gegen React-Fallback, Cover-Anfragen aller Projekte, CSS-Kaskade bei 320–1920 Pixeln,
  Tastaturbedienung, ukrainische Navigation und lesbare Projektaktionen.
- Desktop- und Mobil-Screenshots aller sechs Seiten liegen unter
  `runtime/browser-checks/all-projects-final/`. Die fünf übrigen Desktop-Ansichten
  und Mobilansichten wurden zusätzlich visuell kontrolliert.
- `python3 scripts/check_portfolio_data.py` bestanden.

Rohdaten und HTML-Berichte liegen im ignorierten Ordner
`runtime/lighthouse/all-projects-2026-10-10/`.

| Projekt | Mobiler Bericht | Desktop-Bericht | Screenshot |
| --- | --- | --- | --- |
| Sprachplattform | [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/sprachdienstleistungen-final-mobile-1.report.html) | [Desktop](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/sprachdienstleistungen-final-desktop-1.report.html) | [Ansicht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/browser-checks/all-projects-final/sprachdienstleistungen-desktop-top.png) |
| Vertragsgenerator | [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/vertragsgenerator-final-mobile-1.report.html) | [Desktop](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/vertragsgenerator-final-desktop-1.report.html) | [Ansicht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/browser-checks/all-projects-final/vertragsgenerator-desktop-top.png) |
| Wohnungssuche Bodensee | [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/wohnungssuche-bodensee-final-mobile-1.report.html) | [Desktop](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/wohnungssuche-bodensee-final-desktop-1.report.html) | [Ansicht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/browser-checks/all-projects-final/wohnungssuche-bodensee-desktop-top.png) |
| Notenrechner | [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/notenrechner-final-mobile-1.report.html) | [Desktop](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/notenrechner-final-desktop-1.report.html) | [Ansicht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/browser-checks/all-projects-final/notenrechner-desktop-top.png) |
| ENBT Botanic | [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/enbt-botanic-final-mobile-1.report.html) | [Desktop](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/enbt-botanic-final-desktop-1.report.html) | [Ansicht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/browser-checks/all-projects-final/enbt-botanic-desktop-top.png) |

[Kennzahlen aller Läufe](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/all-projects-2026-10-10/summary.json).
Die früheren Shop-Messungen sind im [Shop-Bericht](online-shop-lighthouse-2026-10-10.md) dokumentiert.

```sh
server/.venv/bin/python server/bin/run_browser_checks.py
npm --prefix frontend run lighthouse -- http://127.0.0.1:8765/projekte/vertragsgenerator --output=json --output=html --output-path=../runtime/lighthouse/all-projects-2026-10-10/recheck --quiet
```

Den Prüfserver vor dem Lauf vollständig starten lassen und danach mit Ctrl+C beenden.
