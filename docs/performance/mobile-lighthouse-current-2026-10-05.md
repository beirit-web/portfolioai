# Aktueller Mobile-Lighthouse-Stand – 5. Oktober 2026

Erneut gemessen nach den Änderungen an Formular, Neigung, Farben und mobilem Footer. Die Messungen liefen am 5. Oktober 2026 zwischen 13:04 und 13:05 Uhr (Europe/Berlin) nacheinander gegen die lokal gebauten Assets über Django auf `http://127.0.0.1:8001`.

| Seite | Performance | Barrierefreiheit | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Startseite | 99 | 100 | 100 | 100 |
| Kontakt | 99 | 100 | 100 | 100 |
| Kompetenzen | 96 | 100 | 100 | 100 |
| Über mich | 94 | 100 | 100 | 100 |

Kontakt wurde dreimal gemessen: 99, 99 und 98 Performance-Punkte. Die Tabelle verwendet den Median von 99. Die übrigen Seiten wurden jeweils einmal gemessen. Alle Läufe melden keine Lighthouse-Warnungen.

| Seite | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: |
| Startseite | 1,46 s | 1,76 s | 29 ms | 0 |
| Kontakt | 1,69 s | 1,92 s | 0 ms | 0 |
| Kompetenzen | 1,37 s | 1,60 s | 208 ms | 0 |
| Über mich | 1,46 s | 2,57 s | 180 ms | 0 |

Die Kontakt-Kennzahlen sind ebenfalls Mediane; TBT betrug in den drei Läufen 0, 50,5 und 0 ms. FCP beschreibt die erste sichtbare Darstellung, LCP die Darstellung des größten sichtbaren Elements, TBT die blockierte Hauptthread-Zeit und CLS Layout-Verschiebungen.

Lighthouse 12.8.2 nutzte das Mobile-Profil mit 412 × 823 px, simuliertem Netzwerk (150 ms RTT, 1.638,4 Kbit/s) und vierfacher CPU-Verlangsamung. Während der Messungen liefen keine parallelen Builds oder Browserprüfungen. Kleine Score-Unterschiede zwischen Läufen sind normale Messschwankungen. Diese lokalen Ergebnisse sind keine Messung der veröffentlichten Website.

Die vollständigen HTML- und JSON-Berichte liegen im von Git ignorierten Ordner `runtime/lighthouse/mobile-2026-10-05-current/`:

- [Startseite](../../runtime/lighthouse/mobile-2026-10-05-current/home.report.html)
- Kontakt: [Lauf 1](../../runtime/lighthouse/mobile-2026-10-05-current/contact-run-1.report.html), [Lauf 2](../../runtime/lighthouse/mobile-2026-10-05-current/contact-run-2.report.html), [Lauf 3](../../runtime/lighthouse/mobile-2026-10-05-current/contact-run-3.report.html)
- [Kompetenzen](../../runtime/lighthouse/mobile-2026-10-05-current/skills.report.html)
- [Über mich](../../runtime/lighthouse/mobile-2026-10-05-current/about.report.html)

Zum Vergleich: [erster Optimierungslauf](mobile-lighthouse-2026-10-05.md).
