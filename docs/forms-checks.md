# Formulare: Kontrast, Übersetzungen und Lighthouse

Lokale Prüfung vom 18. Oktober 2026 mit Lighthouse 13.5.0 und Chromium. Die finalen Messungen erfolgten gegen den temporären Django-Server auf `127.0.0.1:8765` mit fiktiven Daten, nach den Frontend-Builds und ohne parallele Builds oder Tests. Mobile Messungen verwenden das mobile Lighthouse-Standardprofil, Desktop-Messungen die tatsächliche Desktop-Konfiguration. Es sind lokale Einzelmessungen; Laufzeiten und Scores können schwanken.

## Mobile Ergebnisse

| Seite | Performance vorher → nachher | Barrierefreiheit nachher | CLS nachher |
| --- | --- | --- | --- |
| `/login/` | 70 → 100 | 100 | 0.000 |
| `/register/` | 84 → 98 | 100 | 0.000 |
| `/password-reset/` | 100 | 100 | 0.000 |
| `/email-bestaetigung/` | 100 | 100 | 0.000 |
| `/examplemail` | 98 | 100 | 0.000 |
| `/wohnungssuche/register` | 100 | 100 | 0.000 |
| `/deutschlive/account` | 86 → 99 | 100 | 0.000 |
| `/kontakt/` | 78 → 99 | 100 | 0.000 |

Die Ausgangswerte für Anmeldung und Registrierung stammen aus der ursprünglichen Messung. Die Ausgangswerte für Kontakt und DeutschLive stammen aus der anschließenden Messung vor der Korrektur des verzögerten Formularaufbaus. Dabei lag CLS bei Kontakt bei 0,266 und bei DeutschLive bei 0,252.

Die ursprüngliche Anmeldung erreichte 95 Punkte bei Barrierefreiheit. Alle hier aufgeführten Seiten erreichen nach den Anpassungen 100 Punkte bei Best Practices. Die öffentliche Anmeldung und die drei SPA-Seiten erreichen 100 SEO-Punkte. Registrierung, Wiederherstellung, Bestätigung und Beispielpostfach behalten absichtlich `noindex`; Lighthouse bewertet deren SEO deshalb mit 66.

## Desktop

| Seite | Performance | Barrierefreiheit | Best Practices |
| --- | --- | --- | --- |
| `/login/` | 100 | 100 | 100 |
| `/register/` | 100 | 100 | 100 |

## Änderungen und Nachweise

- Die nativen Kontoseiten laden eine eigene, 6,4 kB große CSS-Datei statt der 175,7 kB großen allgemeinen Hauptdatei. Sie verwenden Systemschriften und benötigen das große clientseitige Übersetzungsbundle nicht.
- Deckende Farbpaare halten Beschriftungen, Eingaben, Platzhalter, Hilfen, Fehlermeldungen und gesperrte Anmeldefelder in Hell und Dunkel lesbar.
- Konto- und Kontakttexte einschließlich Validierung, Bestätigungen, Code-Ablauf und Konsolen-E-Mails sind für DE/RU/UK gepflegt. Die bestehenden DeutschLive-Texte für DE/RU wurden dem tatsächlichen Aktivierungsablauf angepasst.
- Kontakt und DeutschLive laden bei direktem Aufruf ihre Formularmodule vor der ersten App-Darstellung. Dadurch verschieben nachgeladene Formulare den sichtbaren Seiteninhalt nicht.
- Die lokale Kontoaktivierung verwendet einen sechsstelligen Code mit genau 60 Sekunden Gültigkeit. Gleichzeitige Aktivierungen funktionieren auch mit SQLite.

Der vollständige Backend-Lauf umfasste 512 erfolgreiche Tests. Nach der Anpassung der Aktivierung und der letzten Kontotexte wurden die 34 betroffenen Tests erneut erfolgreich ausgeführt. Frontend-Tests, Übersetzungsprüfung, TypeScript, alle drei Builds und die Musterdatenprüfung bestanden ebenfalls.

Der abschließende Browserlauf umfasst 48 erfolgreiche Tests und zwei bewusst auf Desktop ausgelassene mobile Prüfungen. Er prüft Anmeldung, Registrierung, Wiederherstellung, Bestätigung, Profil-Persistenz, Rückkehr zu Wohnungssuche und DeutschLive, parallele Aktivierungen, DE/RU/UK-Kontotexte, Kontakt-Rückmeldungen und verzögert geladene Formularmodule.

Die Kontrastprüfung mit axe fand auf 13 Routen in jeweils Hell und Dunkel keine bestätigten Farbkontrastverstöße. Nicht automatisch auswertbare Farbverläufe oder Pseudoelemente werden im Rohbericht separat aufgeführt. Zusätzlich prüfen Browserfälle den berechneten Kontrast der nativen Formulare einschließlich Fehlermeldungen, Aktivierungscodes und gesperrter Felder; ein ergänzender Lauf misst Texte und Platzhalter der sichtbaren Eingabefelder weiterer Demos.

## Nachprüfung am 19. Oktober 2026

Die abschließende Durchsicht hat folgende Ergänzungen ergeben:

- Die Kontosprache gilt auch für den alternativen Anmeldepfad unter `AUTH_URL_PREFIX` und für Bestätigungslinks unter einem eigenen `PASSWORD_RESET_CONFIRM_PREFIX`. Die Tests prüfen Beschriftungen und Django-Validierung in RU/UK, ohne die Anfragesprache im Test künstlich vorzugeben.
- Die Meldung zur automatischen Abmeldung nach Inaktivität ist auch auf Ukrainisch verfügbar. Sie verwendet auf Anmeldung und Startseite die gewählte Sprache und die konfigurierte Minutenzahl.
- Lokale Aktivierungs- und Abbruchaktionen verbrauchen keine Passwort-Anmeldeversuche mehr. Die Begrenzung auf fünf falsche Aktivierungscodes und das gemeinsame Passwortlimit für Anmeldung und APIs bleiben bestehen. Regressionstests prüfen außerdem ungültige Formate, abgelaufene Codes und den Wechsel zu einem anderen Konto.
- Die allgemeinen Browserprüfungen erwarten bei Kontaktbestätigungen die übersetzten Texte. Der DeutschLive-Test berücksichtigt den aktuellen Registrierungshinweis und das lokale Formular zum Erneuern eines Aktivierungscodes.

Der erneute vollständige Backend-Lauf besteht mit 520 Tests einschließlich der acht neuen Regressionstests. Django-Systemcheck, Migrationsprüfung, Abhängigkeitsprüfung, Frontend-Tests, Übersetzungsprüfung, TypeScript und alle drei Builds sind ebenfalls erfolgreich.

Der vor den Testkorrekturen gestartete vollständige Browserlauf umfasst 418 Fälle: 393 bestanden, 15 wurden abhängig von der Bildschirmansicht bewusst ausgelassen und zehn scheiterten an den veralteten Text-Erwartungen. Die anschließende gezielte Prüfung besteht mit allen 18 Fällen: den zehn korrigierten Kontakt- und DeutschLive-Fällen sowie acht erneuten Aktivierungsprüfungen. Damit liegt für jeden der 403 ausgeführten allgemeinen Browserfälle ein erfolgreiches Ergebnis vor. Der [erste Gesamtlauf](../runtime/browser-checks/full-2026-10-19/index.html) bleibt neben dem [erfolgreichen Nachprüfungslauf](../runtime/browser-checks/report/index.html) erhalten.

Die vier zusätzlichen [Wohnungssuche-Prüfungen](../runtime/housing-checks/report/index.html) bestehen ebenfalls. Sie prüfen auf Mobil und Desktop die Speicherung nach Neuladen und Serverneustart, die Trennung zweier fiktiver Konten sowie Rückmeldungen bei ungültigen Eingaben, fehlender Verbindung und abgelaufener Anmeldung. Die abschließende Musterdatenprüfung und `git diff --check` sind erfolgreich.

## Berichte lokal öffnen

- [Mobile Lighthouse-Berichte](../runtime/lighthouse/forms/final-mobile/summary.json)
- [Anmeldung mobil](../runtime/lighthouse/forms/final-mobile/login-mobile.html)
- [Registrierung mobil](../runtime/lighthouse/forms/final-mobile/register-mobile.html)
- [Kontakt mobil](../runtime/lighthouse/forms/final-mobile/kontakt-mobile.html)
- [DeutschLive mobil](../runtime/lighthouse/forms/final-mobile/deutschlive-account-mobile.html)
- [Desktop-Berichte](../runtime/lighthouse/forms/final-desktop/summary.json)
- [Kontrastmessungen](../runtime/lighthouse/forms/final/contrast.json)
- [Eingabe- und Platzhalterkontraste](../runtime/lighthouse/forms/final/input-contrast.json)
- [Playwright-Bericht](../runtime/browser-checks/report/index.html)

Rohberichte und Screenshots liegen unter dem ignorierten Verzeichnis `runtime/`. Die allgemeinen Befehle zum erneuten Messen stehen in [checks.md](checks.md#optionale-performance-messungen).
