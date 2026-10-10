# Shop-Projektseite: Refactoring und Lighthouse am 10. Oktober 2026

Die historischen Berichte und Bildvorschauen wurden am 10. Oktober 2026 nach
`~/Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10` archiviert. Die
Berichtslinks öffnen diese lokalen Archivdateien; neue Prüfläufe verwenden
weiterhin ihre bisherigen Ausgabepfade im Projekt.

Gemessen wurde `/projekte/online-shop` nach dem lokalen Vite-Build über den
Django-Prüfserver auf `http://127.0.0.1:8765`. Der Server verwendet eine temporäre,
migrationsbefüllte Beispieldatenbank. Lighthouse 12.8.2 lief mit dem mobilen
Standardprofil (412 × 823 Pixel, DPR 1,75, simulierte Drosselung) nacheinander.

## Änderungen

- Erstes Refactoring: Cover und Detailkarten in `PortfolioProjectContent.jsx`
  sowie in wiederverwendbare Django-Teiltemplates ausgelagert. Eine gemeinsame
  Layoutentscheidung pro Rendering-Pfad ersetzt wiederholte Shop-Abfragen.
- Optimierung: Cover- und Galerievarianten mit 640 Pixeln sowie Mobilvarianten
  mit 320 Pixeln ergänzt. Die Shop-Definition für `sizes` berücksichtigt den
  Spaltenwechsel bei 1100 Pixeln. Eigene responsive Cover bleiben erhalten.
- Der Detail-Preload verwendet dieselbe Bilddefinition aus dem Build-Katalog
  wie das sichtbare Bild. Beim Shop gilt der Head-Preload nur ab 1100 Pixeln;
  mobil lädt das eager HTML-Bild mit hoher Priorität und ohne doppelten Download.
- Galerie-Layout und Zeichnen werden mit `contain: layout paint` begrenzt.
  Die Inhalte bleiben im Dokument und per Tastatur erreichbar.
- Titel wie „Technologien“ verwenden `#115e59` für ausreichenden Kontrast auf
  der gewünschten Shop-Fläche `#e6e0d7`.
- Zweites Refactoring: ein gemeinsamer Helfer erzeugt responsive Bildquellen;
  das Aufnahme-Skript verwendet den separaten Generator
  `scripts/build_responsive_image_variants.py`. Originaldateien bleiben erhalten.
  Der Shop-Button berücksichtigt auch automatische Ränder und bleibt rechts.

## Ergebnisse

Der Ausgangswert stammt aus einem Lauf nach dem ersten Refactoring. Die
Abschlusswerte sind Mediane aus drei Läufen nach allen Änderungen.

| Kategorie | Ausgangslauf | Abschlussmedian |
| --- | ---: | ---: |
| Performance | 89 | 86 |
| Barrierefreiheit | 95 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

Die drei mobilen Performance-Werte betragen 96, 82, 86.
Damit ist trotz schnellerem Bildladen kein stabiler Gesamtgewinn beim
Performance-Score nachgewiesen. Die verbleibende Hauptthread-Zeit betrifft
überwiegend native Layout-/Zeichenarbeit und nicht die kleine JavaScript-Ergänzung;
parallel laufende lokale Programme und Browseraufgaben beeinflussen die Messung.

| Messwert | Ausgangslauf | Abschlussmedian |
| --- | ---: | ---: |
| FCP | 0,81 s | 0,95 s |
| LCP | 1,82 s | 1,74 s |
| TBT | 437 ms | 560 ms |
| CLS | 0 | 0 |
| Bilddaten im Lauf | 138,040 Bytes | 115,010 Bytes |

Die Bilddaten sinken in jedem Abschlusslauf um 16.7 Prozent. Jeder
Abschlusslauf lädt genau eine Cover-Quelle (`online-shop-cover-v1-640.webp`) und
meldet keine Lighthouse-Warnungen. Die Kontrastbeanstandung entfällt.

Im zusätzlichen Desktop-Lauf: Performance 100,
Barrierefreiheit 100, Best Practices 100, SEO 100.
LCP 0.4 s, TBT 0 ms;
Lighthouse meldet keine Warnungen. [Desktop-Bericht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/desktop-final.report.html).

## Berichte und Reproduktion

Die Rohdaten und HTML-Berichte liegen im ignorierten Ordner
`runtime/lighthouse/shop-2026-10-10/`:

- [Ausgangslauf](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/before.report.html)
- [Abschlusslauf 1](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/final-run-1.report.html)
- [Abschlusslauf 2](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/final-run-2.report.html)
- [Abschlusslauf 3](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/final-run-3.report.html)
- [Kennzahlen als JSON](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/shop-2026-10-10/summary.json)

```sh
server/.venv/bin/python server/bin/run_browser_checks.py
npm --prefix frontend run lighthouse -- http://127.0.0.1:8765/projekte/online-shop --output=json --output=html --output-path=../runtime/lighthouse/shop-2026-10-10/recheck --quiet
```

Lighthouse und Browserchecks nacheinander ausführen. Den temporären Server nach
der Prüfung mit Ctrl+C beenden.

## Validierung

- `npm test --prefix frontend`: Übersetzungen, Portfolio- und Bibliothekstests bestanden.
- Vite-Build und `git diff --check` bestanden.
- 44 Django-Tests für Projektseiten, Übersicht und Asset-Einbindung bestanden.
- 33 Browserchecks bestanden; ein Test für Hover-Verhalten wird auf Touch-Geräten
  wie vorgesehen übersprungen. Geprüft wurden die sechs Detailseiten gegen den
  React-Fallback, CSS-Kaskade bei 320–1920 Pixeln, Tastaturbedienung, ukrainische
  Navigation, Buttonausrichtung, Cover-Download und lesbare Aktionsbuttons.
- 18 neue WebP-Varianten auf Format und Abmessungen geprüft. Der Generator wurde
  zusätzlich mit einem fiktiven Bild auf Seitenverhältnis, Erhalt des Originals,
  Verzicht auf Hochskalierung und `--missing-only` geprüft.
- `python3 scripts/check_portfolio_data.py` bestanden.
