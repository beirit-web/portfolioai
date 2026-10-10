# Vokabelbox: Wiederherstellung und Prüfung am 10. Oktober 2026

Die historischen Berichte und Bildvorschauen wurden am 10. Oktober 2026 nach
`~/Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10` archiviert. Die
Berichtslinks öffnen diese lokalen Archivdateien; neue Prüfläufe verwenden
weiterhin ihre bisherigen Ausgabepfade im Projekt.

Der bisherige Einstieg `/static/portfolio/vokabelbox-main/index.html` enthielt nur
einen ungestalteten Hinweis ohne Wortliste, Styles oder JavaScript. Er öffnet jetzt
das vollständige Lernmodul unter `/vokabelbox/` im gemeinsamen Portfolio-Server.
Die Vokabelbox bleibt Teil des Projekts Sprachdienstleistungen.

## Umsetzung

- 30 Vokabeln mit Wortsuche, Artikelfilter, farbigen Karten, Artikel-Quiz,
  Favoriten und gespeichertem Lernstand. Gast- und Kontofortschritte bleiben getrennt.
- Gedeckter Hintergrund, Wortliste links und Trainer rechts auf breiten Bildschirmen;
  auf dem Handy steht das Quiz vor der Liste. Auswahl, Lernstatus und Fokus sind sichtbar.
- Deutsch, Russisch und Ukrainisch mit eigener kleiner Sprachwahl. Fehlender oder
  beschädigter Browserspeicher verhindert das Lernen nicht.
- Gemeinsame Assets in `apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/`
  und gemeinsames Inhalts-Template `templates/modules/vokabelbox_content.html`.
  Beide Django-Server verwenden diese Quellen direkt. Die Portfolio-Hülle benötigt
  nur das Modul-CSS und zwei kleine Scripts, ohne React-Bundle oder externe Schrift.
- Der Projektbutton öffnet die aktive Route; bisherige statische Einstiege bleiben
  als Weiterleitungen erhalten. Der Rücklink führt zum Bericht der Sprachplattform.
- Die Übersetzungsprüfung berücksichtigt nach dem Refactoring auch das gemeinsame
  Modul-Template und dessen DE/RU/UK-Texte. Die Bereinigungsliste unterscheidet
  aktive Modulquellen von den weiterhin ungenutzten alten statischen Sidecars.
- Das Containerbeispiel verwendet den Repository-Stamm als Build-Kontext und
  kopiert gezielt die gemeinsamen Moduldateien und die ursprüngliche MIT-Lizenz.
  Der Docker-Build wurde nicht ausgeführt, da Docker lokal nicht installiert ist.

## Lighthouse

Lighthouse 12.8.2 prüfte `/vokabelbox/` auf `http://127.0.0.1:8765` mit einer
temporären Beispieldatenbank. Je ein Lauf mit dem mobilen Standardprofil und
Desktop-Preset, nacheinander nach den Browserprüfungen. Es sind Einzelmessungen,
keine Mediane und kein Vergleich mit der vorherigen leeren Hinweisseite.

| Messwert | Mobil | Desktop |
| --- | ---: | ---: |
| Performance | 100 | 100 |
| Barrierefreiheit | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 66 | 66 |
| FCP | 0,92 s | 0,29 s |
| LCP | 1,05 s | 0,34 s |
| TBT | 28 ms | 0 ms |
| CLS | 0 | 0 |

Beide Läufe melden keine Lighthouse-Warnungen. Der SEO-Abzug entsteht durch das
bewusste `noindex` des Lernmoduls. Der indexierbare Portfolio-Bericht bleibt unter
`/projekte/sprachdienstleistungen`; das Modul behält die bisherige Indexierungsregel.

[Mobiler HTML-Bericht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/vokabelbox-2026-10-10/mobile.report.html)
und [Desktop-Bericht](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/lighthouse/vokabelbox-2026-10-10/desktop.report.html).
Die JSON-Rohdaten liegen daneben im ignorierten Laufzeitordner.

## Funktionale Prüfung

- 27 gemeinsame Django-Tests und 3 Sprachplattform-Modultests bestanden.
- 28 gemeinsame Browserchecks und 10 Sprachplattform-Browserchecks bestanden:
  Lernen, Quiz, Speicherung, Übersetzungen, Tastaturbedienung, schmale Displays
  sowie echte Hin- und Rücknavigation einschließlich des bisherigen Links.
- Der tatsächliche Nutzerlink auf `localhost:8000` öffnet auf Handy und Desktop
  `/vokabelbox/` mit 30 Wortkarten und ohne JavaScript-Fehler.
- Frontendtests, Vite-Build, Übersetzungsprüfung, Konfigurationsisolation,
  Portfolio-Datenprüfung und `git diff --check` bestanden.

[Desktop-Vorschau](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/vokabelbox-preview/vokabelbox-desktop.png)
und [Handy-Vorschau](../../../../../Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10/runtime/vokabelbox-preview/vokabelbox-mobile.png).
