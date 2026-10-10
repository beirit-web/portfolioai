# Bereinigungsstand am 10. Oktober 2026

In zwei Transfers wurden **71 bestätigte ungenutzte Projektdateien mit 4,56 MiB** archiviert. Zusätzlich wurden alte lokale Screenshots, Messberichte, Bytecode-Caches und bisherige collectstatic-Ausgaben ausgelagert. Alle Dateien sind auf dem PC unter `Bilder/Bilder` erhalten.

- Erstes Archiv: `~/Bilder/Bilder/Beirit-Digital-ungenutzt-2026-10-10` — 43 ungenutzte Dateien.
- Zweites Archiv: `~/Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10` — 28 weitere ungenutzte Dateien und generierte Altbestände, insgesamt 2.052 Dateien.

Beide Archive enthalten die ursprüngliche Verzeichnisstruktur, eine README und `verschiebung.json` mit Größen und SHA-256-Prüfsummen. Lizenzen wurden zusätzlich kopiert; ihre Originale bleiben im Projekt.

Bereits vor den Transfers entfernt: **27 Bilder und Videos mit 315,64 MiB**. `ladeseite.mp4` war bereits entfernt und gehört nicht zu den verschobenen Dateien.

## Originale aus der früheren Prüfliste erhalten

Von den 22 früher vorgemerkten Bildern wurden 15 bestätigte Varianten/Dubletten archiviert. Diese sieben Originale bleiben im Projekt:

| Datei | Größe |
| --- | ---: |
| `server/assets/images/portfolio-deutschlive-mobile.webp` | 0,03 MiB |
| `server/assets/images/portfolio-deutschlive-tablet.webp` | 0,05 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair.png` | 1,84 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait.png` | 1,82 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur.png` | 0,25 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-balanced.png` | 0,23 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched.png` | 0,26 MiB |

Öffentliche Eigentümerdetails, aktive Porträts, Avatar-srcset, Kontaktgrafiken, Favicons, verwendete Shopfotos und dokumentierte Originalcover bleiben erhalten. Die gemeinsamen Vokabelbox-Quellen sowie das aktive FAQ-/TechnologyProof-CSS sind unverändert.

## Statische Dateien und Prüfungen

Die beiden bisherigen statischen Ausgaben liegen im zweiten Archiv. Im Projekt stehen neu aufgebaute Ausgaben mit allen benötigten Assets und vollständigem Sprachplattform-Manifest. 31 alte Bild-/Videokopien mit 316,49 MiB fehlen dort.

Frontendtests, 86 Django-Tests und 28 Browserprüfungen sind bestanden. Alle 2.052 Dateien des zweiten Archivs wurden mit Prüfsummen unabhängig nachgeprüft. Auf localhost:8000 liefern 44 aktive Assets HTTP 200; drei Altdateien liefern HTTP 404. Alle 42 angepassten Berichtslinks führen zu vorhandenen Archivdateien.

[Einzeldateien und Archivstatus des weiteren Transfers](further-cleanup-2026-10-10.md).

[Maschinenlesbare Gesamtübersicht der 71 archivierten Projektdateien](unused-files-2026-10-10.json).
