# Notenrechner

Statische Demo für eine Durchschnittsnote mit bis zu 20 Fächern, optionalem Namen,
Komma-/Punktwerten und Ergebnisbild samt Ton. Fachzahlen müssen ganzzahlig sein.
Die Aufrundung verwendet ganze Hundertstel; ein Durchschnitt von `4,0` gilt als
nicht bestanden. Neue Noten und Neustart verwerfen das Ergebnis und stoppen Audio.

Die gepflegten Quellen liegen direkt in `server/assets/portfolio/notenrechner/`
und werden von Django ohne zusätzliche Auslieferungskopie bereitgestellt.
Einstieg: `/static/portfolio/notenrechner/index.html`.
Die React-Variante gehört zu DeutschLive und wird mit dessen Frontend gebaut.

## Gestaltung und Rückmeldung

Die Oberfläche verwendet eine helle Grünpalette, eine eigene SVG-Illustration
und eine dreistufige Fortschrittsanzeige. Der Notenspiegel zeigt während der
Eingabe den Durchschnitt der gültigen Noten und eine Verteilung auf die sechs
Notenstufen. Bei fehlenden oder ungültigen Werten ist der Durchschnitt ausdrücklich
vorläufig. Dezimalnoten werden nur für das Balkendiagramm der nächsten ganzen
Note zugeordnet; die Berechnung verwendet weiterhin die genauen Eingaben.
Der Ring zeigt den Anteil der ausgefüllten, gültigen Noten.

„Mit Beispiel ausprobieren“ lädt sechs bearbeitbare Beispielnoten. Die
Fächeranzahl lässt sich per Schnellauswahl oder frei eingeben. „Neu starten“
setzt alle Eingaben, Ergebnisse und Diagramme zurück und beendet laufende
Ergebnistöne. Die Auswertung enthält zusätzlich eine Skala von 1 bis 6 mit
markiertem Durchschnitt und der gewählten Bestehensgrenze (standardmäßig unter 4).

Illustration und Bedienelemente benötigen keine zusätzlichen Bibliotheken oder
Webfonts. Diagrammübergänge und kurze Einstiegsanimationen berücksichtigen
`prefers-reduced-motion`. Die Ergebnisbilder und Audiodateien werden weiterhin
erst bei Bedarf geladen. Kontolinks und anonyme Nutzung bleiben verfügbar.

## Einstellungen und Offline-Nutzung

Die Bestehensgrenze kann zwischen 1 und 6 mit bis zu zwei Nachkommastellen
eingestellt werden. Eine Checkbox legt fest, ob die Grenznote noch als bestanden
zählt. Die Regel wird lokal im Browser gespeichert; bei gesperrtem Speicher gilt
sie für die aktuelle Sitzung. Änderungen erhalten die Noten, setzen das bisherige
Ergebnis zurück und aktualisieren die Live-Ansicht und Skalenmarkierung.

„Offline bereitmachen“ speichert die App samt Ergebnismedien ausdrücklich auf
Wunsch. Erst dann wird ein Service Worker für diesen Rechner registriert.
API-Antworten, Kontoseiten und andere Apps werden nicht zwischengespeichert.
Nach erfolgreicher Vorbereitung funktioniert auch ein erneutes Öffnen ohne Netz.
Kontolinks werden offline ausgeblendet. Unterstützende Browser bieten zusätzlich
eine Installation an. Das Offline-Speichern benötigt HTTPS oder localhost;
gelöschte Browserdaten müssen bei bestehender Verbindung neu vorbereitet werden.

## Prüfen

```bash
npm --prefix frontend run test:browser -- grade-responsive.spec.cjs
npm --prefix frontend run test:browser -- grades-visual.spec.cjs
npm --prefix frontend run test:browser -- grades-settings-offline.spec.cjs
```

Die Prüfungen decken schmale und breite Bildschirme, vergrößerte Schrift,
Validierung, Rundung, Ergebnisbilder, Audiosteuerung, Beispieldaten,
Live-Diagramme, vollständiges Zurücksetzen, gespeicherte Bestehensregeln und
erneutes Laden ohne Netzwerk ab.
Die ursprünglichen PNGs und Audiodateien bleiben als Medienquellen erhalten;
kleine WebP-Ausgaben und das 32px-Favicon werden im Browser verwendet.

Die ursprüngliche Projektbeschreibung nennt die MIT-Lizenz; eine separate
LICENSE-Datei liegt in diesem Demo-Ordner nicht vor. Medienherkunft des Moduls:
`apps/deutsch-live/src/assets/grade-calculator/README.md`.
