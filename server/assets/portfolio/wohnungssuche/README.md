# Wohnungssuche Bodensee: Portfolio-Webapp

`index.html` lädt den bestehenden React-Build in `assets/` sowie anschließend
`responsive.css` und `navigation.js`. Die Layoutkorrekturen und die zusätzlichen
Menüfunktionen werden in diesen lesbaren Dateien gepflegt. Bei einem Austausch
des Builds beide zusätzlichen Verweise beibehalten.

Die Filter verwenden flexible Spalten. Karten, Suchprofil-Formulare und lange
Texte passen sich der verfügbaren Breite an. Die Desktop-Navigation bleibt im
Bildschirm; das mobile Menü kann auf niedrigen Bildschirmen gescrollt werden.
Es schließt über den Menüknopf, den Schließen-Knopf, einen Klick auf den
Hintergrund, Escape oder die Auswahl einer Seite. Während es geöffnet ist,
bleiben Tastaturfokus und Scrollen im Menü. Der Link „Zur Startseite“ führt auf
Handys und am Desktop zurück zur Projektseite „Wohnungssuche Bodensee“ unter
`/projekte/wohnungssuche-bodensee`. Er steht auch direkt im
Seitenkopf des Dashboards und auf den Anmelde- und Registrierungsseiten zur
Verfügung. Im Dashboard ist dafür kein Öffnen des Menüs nötig.

Browser-Prüfung vom Repository-Stamm:

```bash
npm --prefix frontend run test:browser -- housing-responsive.spec.cjs housing-navigation.spec.cjs
```

Prüft Breiten von 320 bis 1920 Pixeln, Filter, Suchprofile, lange Quellennamen,
Login/Registrierung, Menübedienung, Tastaturfokus, Größenwechsel, Browser-Zurück
und die Rückkehr zur Startseite. API-Daten werden für die
Formularprüfung im Browser ersetzt; dabei werden keine echten Daten geändert.
