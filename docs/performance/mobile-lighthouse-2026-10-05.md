# Mobile Lighthouse – 5. Oktober 2026

Erster Optimierungslauf für Startseite, Kontakt, Kompetenzen und Über mich. Gemessen wurde lokal mit den gebauten Vite-Assets über Django auf `http://127.0.0.1:8001`, nicht gegen die veröffentlichte Website.

## Ergebnisse

| Seite | Performance vorher | Performance nachher | Barrierefreiheit vorher → nachher |
| --- | ---: | ---: | ---: |
| Startseite | 99 | 99 | 100 → 100 |
| Kontakt | 93 | 99 | 100 → 100 |
| Kompetenzen | 89 | 95 | 100 → 100 |
| Über mich | 93 | 93 | 95 → 100 |

Best Practices und SEO erreichen auf allen vier Seiten jeweils 100 Punkte. Die Performance von Über mich bleibt in diesem Lauf unverändert.

| Seite | LCP vorher → nachher | TBT vorher → nachher | CLS vorher → nachher |
| --- | ---: | ---: | ---: |
| Startseite | 1,76 → 1,76 s | 51 → 24 ms | 0 → 0 |
| Kontakt | 2,24 → 1,90 s | 216 → 21 ms | 0,044 → 0 |
| Kompetenzen | 1,90 → 1,66 s | 408 → 250 ms | 0,051 → 0 |
| Über mich | 2,57 → 2,57 s | 201 → 211 ms | 0 → 0 |

LCP misst die Anzeige des größten sichtbaren Elements, TBT die blockierte Hauptthread-Zeit und CLS Layout-Verschiebungen. Lighthouse 12.8.2 nutzte das Mobile-Profil mit 412 × 823 px, simuliertem Netzwerk (150 ms RTT, 1.638,4 Kbit/s) und vierfacher CPU-Verlangsamung. Vorher wurde jede Seite einmal gemessen. Die abschließenden Messungen liefen nacheinander ohne parallele Builds oder Browserprüfungen. Die Startseite wurde dreimal gemessen: jeweils 99 Punkte; ihre Kennzahlen sind die Mediane dieser drei Läufe. Die übrigen Ergebnisse stammen jeweils aus einem abschließenden Lauf. Messwerte können zwischen Läufen schwanken.

## Änderungen

- Kontakt und Kompetenzen laden auf Mobile ein eigenes kleines CSS-Paket. Die drei großen allgemeinen Stylesheets werden erst ab Desktop-Breite geladen; der Wechsel zwischen den Ansichten funktioniert weiterhin. Die betreffenden Basis-Styles schrumpfen von rund 63 KB auf 6,6 KB gzip, jeweils ohne das gemeinsame Header-CSS und das Formular-CSS.
- Das Kontaktformular reserviert seine Höhe bereits während des Ladens. Formular-CSS und Formular-Modul werden auf der Kontaktseite früh bereitgestellt. Der mobile Hintergrund ist auch während des Ladens durchgehend blau.
- Dokumentklassen für Ladezustand und Farbschema werden ohne zusätzliche Renderdurchläufe der gesamten App aktualisiert. Unveränderte Portfolio-Daten lösen ebenfalls keinen neuen Renderdurchlauf aus. Die erste Abfrage der Footer-Scrollposition erfolgt nach dem initialen Layout.
- Das Technologie-Karussell auf Über mich pausiert außerhalb des sichtbaren Bereichs. Das sichtbare Hintergrundbild wird früh angefordert. Die Positionsanzeige und Einblendanimation erfüllen jetzt die geprüften Kontrastanforderungen.

## Prüfung und Berichte

Frontend-Build, Frontend-Tests und die vier Django-Tests für die Asset-Auslieferung sind erfolgreich. Browserprüfungen bestätigen 320, 375 und 767 px ohne horizontalen Überlauf, den Wechsel zur Desktop-Ansicht und zurück, Hell-/Dunkelmodus, Menübedienung, Formularvalidierung und eine im Browser abgefangene erfolgreiche Formularanfrage. Das Karussell pausiert außerhalb des sichtbaren Bereichs und setzt sich beim Scrollen fort.

Die vollständigen lokalen Berichte liegen unter `runtime/lighthouse/mobile-2026-10-05/`. Dieser Ordner wird von Git ignoriert. Die HTML-Berichte lassen sich im Browser öffnen; daneben liegen die JSON-Rohdaten.

| Seite | Vorher | Nachher |
| --- | --- | --- |
| Startseite | [HTML](../../runtime/lighthouse/mobile-2026-10-05/home-before.report.html) | [Lauf 1](../../runtime/lighthouse/mobile-2026-10-05/home-run-1.report.html), [Lauf 2](../../runtime/lighthouse/mobile-2026-10-05/home-run-2.report.html), [Lauf 3](../../runtime/lighthouse/mobile-2026-10-05/home-run-3.report.html) |
| Kontakt | [HTML](../../runtime/lighthouse/mobile-2026-10-05/contact-before.report.html) | [HTML](../../runtime/lighthouse/mobile-2026-10-05/contact-final.report.html) |
| Kompetenzen | [HTML](../../runtime/lighthouse/mobile-2026-10-05/skills-before.report.html) | [HTML](../../runtime/lighthouse/mobile-2026-10-05/skills-final.report.html) |
| Über mich | [HTML](../../runtime/lighthouse/mobile-2026-10-05/about-before.report.html) | [HTML](../../runtime/lighthouse/mobile-2026-10-05/about-final.report.html) |

Für eine erneute Messung zuerst `npm --prefix frontend run build` ausführen und Django lokal mit den statischen Assets starten. Dann die tatsächlich verwendete URL ausdrücklich angeben:

```bash
CHROME_PATH=/pfad/zu/chromium npm --prefix frontend run lighthouse -- \
  http://127.0.0.1:8000/kontakt/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html --output-path=/tmp/beirit-mobile-contact
```

Ein veröffentlichter Server kann wegen Netzwerk, Hosting und Cache andere Ergebnisse liefern.
