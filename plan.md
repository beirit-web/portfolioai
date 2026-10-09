# Vertragsgenerator nach Django umstellen

Ziel: Den bestehenden Vertragsgenerator als eigene App im vorhandenen
Django-Projekt `server` unter `/vertragsgenerator/` betreiben.
HTML bleibt die Benutzeroberflaeche; Django liefert sie als Template aus und
uebernimmt Vertragsvorlagen, Formulardefinitionen, Validierung und TXT-Export.

## Schritte

- [x] 1. Projektstruktur, vorhandene Funktionen und Portfolio-Verweise pruefen.
- [x] 2. Django-App `contracts` registrieren und URLs einrichten.
- [x] 3. HTML als Django-Template integrieren; CSS und JavaScript in App-Static ablegen.
- [x] 4. Die drei Vertragsvorlagen und Formularfelder nach Python/Django verlagern.
- [x] 5. Live-Vorschau mit serverseitiger Validierung und CSRF-Schutz anbinden.
- [x] 6. TXT-Download aus Django bereitstellen; Kopieren und PDF-Druck anbinden.
- [x] 7. Alten Einstieg und Portfolio-Verweise auf die neue URL umstellen.
- [x] 8. Django-Checks, Backend-Tests und Browserpruefung durchfuehren.
- [x] 9. Betrieb, Datenverarbeitung und spaetere Erweiterungen dokumentieren.

## Umfang und Entscheidungen

- Mietvertrag, Fahrzeug-Kaufvertrag und einfacher Kaufvertrag bleiben vorhanden.
- Entwuerfe bleiben im LocalStorage des Browsers, damit bisherige Entwuerfe
  weiter nutzbar sind. Logo und Schriftgroesse bleiben ebenfalls lokal.
- Fuer Vorschau und TXT-Export werden Formulareingaben an Django uebertragen.
  Die App speichert diese Angaben nicht in der Datenbank.
- Leere Pflichtfelder bleiben im Entwurf sichtbar. Ungueltige Datums- und
  Geldangaben werden serverseitig erkannt und nicht als gueltiger Vertrag exportiert.
- PDF wird wie bisher ueber den Druckdialog erzeugt, einschliesslich Logo und
  Schriftgroesse. Ein eigenstaendiger PDF-Dienst ist eine spaetere Erweiterung.
- Benutzerkonten, Datenbank-Entwuerfe und eine Vorlagenverwaltung im Admin sind
  optionale Erweiterungen und fuer diese Umstellung nicht erforderlich.
- `server/staticfiles` ist Build-Ausgabe. Quellcode liegt in `server/contracts`.

## Pruefung und Ergebnis

Abgeschlossen am 02.10.2026.

- Django-Systemcheck: keine Probleme.
- `manage.py makemigrations --check --dry-run`: keine fehlenden Migrationen.
- `manage.py test contracts pages.tests.test_projects`: 18 Tests erfolgreich.
- JavaScript-Syntaxcheck und `git diff --check`: erfolgreich.
- Frontend-Sprachschluesselpruefung und Produktionsbuild: erfolgreich.
- Migration `pages.0040_contract_generator_url`: lokal angewendet; der
  Portfolio-Link lautet jetzt `/vertragsgenerator/`.
- Playwright: alter Einstieg, alle Vorlagen, Desktop-Auswahl und mobile
  Vorlagenbuttons, lokale Entwuerfe, schneller Vorlagenwechsel, Reload,
  ungueltige Pflicht- und optionale Angaben, TXT-Download, Zwischenablage,
  Logo, Schriftgroesse, Druck/PDF und Erholung nach einem Netzwerkfehler geprueft.
- Screenshots fuer 1440, 390 und 320 Pixel Breite kontrolliert;
  kein horizontaler Ueberlauf. HTML-Formular und Vorschau auch ohne JavaScript geprueft.
- Der vorhandene Django-Server auf Port 8000 wurde weiterverwendet.

Zusaetzlicher Befund: `pages.tests.test_vite_assets` erwartet auf der Startseite
ein `rel="stylesheet"`, das dort aktuell nicht vorhanden ist. Dieser unabhaengige
Test schlaegt auch mit dem urspruenglichen Vite-Manifest aus `HEAD` fehl.
Startseitentemplate und Test wurden durch diese Umstellung nicht geaendert.

## Ergebnis

- Neue Seite: `http://localhost:8000/vertragsgenerator/`
- Alte URL: HTML-Weiterleitung zur neuen Seite.
- App und Dokumentation: `server/contracts/README.md`.
- Das Portfolio-Frontend wurde mit den aktualisierten Links neu gebaut.
- Fuer eine spaetere produktive Auslieferung Migrationen und `collectstatic`
  wie in der App-Dokumentation ausfuehren.

## Mobile-First-Dokumenten-Editor

- [x] Kompakte Werkzeugleiste, Vorlagenwahl und Export-Menue.
- [x] Mobile Ansichten `Angaben` und `Dokument` mit Tastatursteuerung.
- [x] Direkt anwaehlbare Formularabschnitte mit Zurueck/Weiter und Feldstatus.
- [x] Desktop-Layout mit Navigation, Formular und Dokument nebeneinander.
- [x] A4-Dokumentvorschau mit Zoom und separatem Drucklayout.
- [x] Einstellungen fuer Schriftgroesse und Logo als Dialog.
- [x] Browserpruefung aller Ablaeufe auf Handy, Tablet und Desktop.
- [x] Dokumentation und abschliessende Checks.

Geprueft mit Playwright bei 280, 320, 390, 768, 1024, 1440 und 1920 Pixel Breite.
Navigation, mobile Tabs, Tastaturbedienung, Zoom, Entwurfsspeicherung, Logo und
Logoverschiebung, Einstellungsdialog, serverseitige Fehleranzeige, Ruecksprung
zu fehlenden Feldern, TXT, Kopieren und PDF-Druck sind erfolgreich geprueft.
Das Formular bleibt auch ohne JavaScript nutzbar. Screenshots liegen lokal in
`/tmp/contract-editor-check`.

Wiederholbare Browserpruefung: `frontend/scripts/check-contract-editor.cjs`.
Icons aus Lucide: `frontend/scripts/build-contract-icons.cjs`.
Die bestehende lokale Django-Instanz wird weiterverwendet.

## Optimierte Vorlagenauswahl

- [x] Auswahl und Optionsliste bleiben innerhalb der Feld- und Bildschirmbreite.
- [x] Lange Vertragsnamen umbrechen, statt abgeschnitten zu werden.
- [x] Menuehoehe passt sich dem verfuegbaren Platz an, einschliesslich Querformat.
- [x] Tastatur: Pfeile, Home/End, Enter/Leertaste, Buchstabensuche, Escape und Tab.
- [x] Native Auswahl als Fallback ohne JavaScript; Entwurfsspeicherung bleibt erhalten.
- [x] Automatisierte Browserpruefung der Optionen und Vorlagenwechsel auf mobilen,
  Tablet- und Desktopbreiten; Django-Tests und JavaScript-Syntaxcheck.

## Eigenstaendige Farbgebung

- [x] Graphit, Weiss und neutrales Grau als Basis; Signalrot fuer Hauptaktionen.
- [x] Gruene Toene in Navigation, Auswahl, Formularfokus und Dokument entfernt.
- [x] Blau mit Haekchen fuer abgeschlossene Schritte; separate Warn- und Fehlerfarben.
- [x] Farbwerte zentralisiert und kleine Begleittexte kontrastreicher gestaltet.
- [x] Kontrastpruefung und Browserchecks fuer Handy, Querformat, Tablet und Desktop.

Die geprueften Text- und Statusfarben erreichen mindestens 4,5:1 Kontrast auf
ihren jeweiligen Flaechen. Playwright prueft die Palette zusammen mit allen
Editor-Ablaeufen bei 280 bis 1920 Pixel Breite, auch bei 320 x 320 und 844 x 390.
Mobile und Desktop-Screenshots wurden visuell kontrolliert.
