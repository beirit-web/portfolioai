# Beirit Web prüfen

Der gemeinsame Check prüft das aktive Projekt in `frontend/` und `server/`:

```bash
server/.venv/bin/python server/bin/check_beirit.py
```

Er setzt eine Python-Umgebung mit `server/requirements.txt`, installierte
Frontend-Abhängigkeiten (`npm ci` in `frontend/`) und Chromium für Playwright
voraus. Den Browser einmalig in `frontend/` installieren:

```bash
npx playwright install chromium
```

Der Ablauf führt Übersetzungs- und Frontend-Regressionstests, den Build,
Deploy-Isolation, Django-Systemprüfung, die Prüfung auf fehlende Migrationen,
alle Backend-Tests und die Browser-Prüfungen aus. Der erste Fehler stoppt den
Ablauf. Die Backend-Prüfungen verwenden temporäre Datenpfade und ein lokales
E-Mail-Testbackend.

## Gezielt prüfen

In `frontend/`:

```bash
npm test
npm run check
```

`npm test` prüft Portfolio-Daten, Sprachschlüssel, Konfiguration, öffentliche
URLs und das Auslesen von Cookies. `npm run check` ergänzt Build und Browser.
Nach Änderungen am Quellcode vor einem einzelnen Browserlauf erst
`npm run build` ausführen; der Browser verwendet die gebauten Django-Assets.

Die Browser-Prüfungen starten ihren eigenen Django-Server auf
`127.0.0.1:8765`. Dieser Port muss frei sein. Die Datenbank wird neu migriert
und nach dem Lauf entfernt. Externe Browseranfragen werden abgefangen;
Wetterdaten und Kontaktantworten werden simuliert. Die tatsächliche Kontaktverarbeitung,
CSRF-Abweisung und Begrenzung von Anfragen werden separat im Backend geprüft.

## Funktion und Darstellung

Die Browser-Prüfungen erfassen die sechs öffentlichen React-Seiten auf Desktop
und Mobilgerät. Sie kontrollieren sichtbare Inhalte, das Logo, horizontales
Überlaufen sowie Bildschirmgrenzen wichtiger Bedienelemente. Navigation,
Tastaturbedienung des Mobilmenüs, Verlauf und Neuladen werden geprüft.
Das Kontaktformular wird mit ungültigen Eingaben, Erfolg, Serverfehler,
Netzwerkfehler, erneutem Senden und angepasster Kontakt-URL getestet.
Das Portfolio wird auch bei API-Ausfall, per Tastatur und beim Öffnen einer
Projektdetailseite geprüft. Sichtbare Projektbilder müssen geladen sein.
Die Wetterprüfung deckt die Ortssuche, aktuelle Werte, 24-Stunden- und
5-Tage-Vorschau sowie erneutes Laden nach einem API-Fehler ab.
Zusätzliche Layoutprüfungen laufen bei 320, 768 und 1024 Pixeln Breite.

Die HTML-Auswertung liegt unter `runtime/browser-checks/report/index.html`.
Bildvorschauen liegen unter `runtime/browser-checks/previews/`. Bei Fehlern
werden auch Screenshots und Playwright-Traces erzeugt. Diese Dateien bleiben
lokal; GitHub Actions speichert sie als Prüfartefakte.

Für vollständige Bildvorschauen werden Bilder vorab geladen und die
Darstellungsoptimierung `content-visibility` für außerhalb des Bildschirms
liegende Abschnitte aufgehoben. Die Layoutprüfungen laufen zuvor mit den
unveränderten Darstellungseinstellungen der Anwendung.

Die Bildvorschauen dienen der manuellen Sichtprüfung. Es gibt derzeit keine
freigegebenen Referenzbilder für automatische Pixelvergleiche. Die Prüfungen
decken Chromium ab; Live-Mailzustellung, externe Wetterdaten, PayPal sowie
Firefox und Safari werden durch diesen Ablauf nicht bestätigt.

## Teststruktur erhalten

Django-Seitentests gehören unter `server/pages/tests/test_*.py`.
Eine parallele Datei `server/pages/tests.py` wird durch das gleichnamige
Package verdeckt und darf nicht erneut angelegt werden.
Frontend-Hilfsfunktionen werden unter `frontend/src/lib/*.test.mjs` geprüft;
Browserabläufe liegen unter `frontend/tests/browser/`.
