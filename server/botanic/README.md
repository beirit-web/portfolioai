# ENBT Botanic

Django-App im bestehenden Projekt, erreichbar unter `/botanic/`.
Die bisherige statische URL leitet zur neuen App weiter. Die alte React-Quelle
bleibt als Archiv erhalten und wird von dieser App nicht mehr verwendet.

## Lokal starten

Im Verzeichnis `server` mit der vorhandenen virtuellen Umgebung:

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py check
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Aufruf: <http://localhost:8000/botanic/>. Anmeldung und Registrierung nutzen die
vorhandenen Beirit-Konten. Bei neuen Registrierungen gilt weiterhin die bestehende
E-Mail-Verifizierung; deren Mail-Konfiguration muss funktionieren.

## Daten und Funktionen

- `Species`: gemeinsam gespeicherte, oeffentliche Pflanzenarten von iNaturalist.
- `Plant`: private Exemplare mit Eigentuemer, Namen, Standort, Notizen,
  frei waehlbarem Intervall (1 bis 365 Tage), naechstem Termin und Pause.
- `Watering`: ein Giessvorgang je Pflanze und Kalendertag.
- `ApiBudget`: installationsweites Abrufbudget, auch fuer mehrere Worker.

Die Suche ist ohne Konto moeglich. Sammlung und Giessplan sind benutzergetrennt;
alle Aenderungen verlangen Anmeldung, POST und CSRF-Schutz. Mehrere Exemplare
derselben Art sind erlaubt. Loeschen entfernt auch deren Giessprotokoll, nicht
aber die gemeinsame Pflanzenart. Admin-Zugriff folgt den bestehenden Rechten.

Beim Markieren als gegossen wird der naechste Termin vom tatsaechlichen Giessdatum
aus berechnet. Wiederholte Klicks am selben Tag erzeugen keinen weiteren Eintrag.
Termine lassen sich um 1, 3 oder 7 Tage verschieben. Pausierte Pflanzen werden
nicht als faellig angezeigt. Es gibt keine Hintergrundjobs, E-Mail- oder
Push-Erinnerungen. Die wesentlichen Ablaeufe funktionieren ohne JavaScript.

## API und Bilder

Verwendet wird die oeffentliche iNaturalist-v1-Taxa-API; kein API-Schluessel und
kein zusaetzliches Abo erforderlich. Verfuegbarkeit und Nutzungsbedingungen des
Anbieters bleiben eine externe Abhaengigkeit. Es werden nur Suchbegriffe und
Pflanzenart-IDs uebertragen, keine Kontodaten, Notizen oder Giessplaene.

- Suche: 12 Ergebnisse je Seite, maximal 20 Seiten je Suchbegriff.
- Cache: 24 Stunden, Django-Alias `botanic`, FileBasedCache im Verzeichnis
  `botanic-cache` neben der konfigurierten SQLite-Datei. Schreibrechte erforderlich.
  Das Verzeichnis liegt ausserhalb der statischen Auslieferung und ist Git-ignoriert.
- Abrufbudget: maximal ein neuer API-Aufruf pro Sekunde und 9.500 pro lokalem
  Kalendertag. Ein HTTP 429 des Anbieters setzt eine Abrufpause von 60 Sekunden.
- Fehlende freigegebene Fotos werden mit einem zusaetzlichen gebuendelten
  Artenabruf gesucht. Kein Einzelabruf fuer jede Karte.
- Netzwerk-Timeout: 8 Sekunden pro Abruf; Antwortgroesse maximal 2 MiB.
- Bei Ausfaellen bleiben gespeicherte Sammlungen und Giessplaene nutzbar.

Fotos werden ausschliesslich mit CC0 oder CC BY uebernommen. Bildnachweis,
Originalseite und Lizenz sind in der Oberflaeche verlinkt. Nicht freigegebene
oder fehlende Fotos erhalten einen Platzhalter. Die Bilder werden direkt von
freigegebenen iNaturalist-Bildhosts geladen, ohne Referrer. Diese Hosts erhalten
dadurch die IP-Adresse des Browsers. Die CSP-Ausnahme gilt nur fuer Botanic-Seiten.
Diese externen Bildabrufe sind bei einer Veroeffentlichung in der
Datenschutzinformation zu beruecksichtigen.

## Pflegehinweise

iNaturalist liefert Taxonomie und Fotos, nicht artspezifische Giessintervalle.
`care.py` enthaelt separat recherchierte Pflegehinweise mit Quellen. Zuordnung
erfolgt nach exaktem botanischem Namen, einschliesslich expliziter Synonyme.

Nur belegte Tagesbereiche liefern einen Startvorschlag fuer ein neues Exemplar.
Bestehende Intervalle werden niemals dadurch ueberschrieben. Wo die Quelle nur
Erdfeuchte beschreibt, wird kein artspezifischer Tagesabstand erfunden. Der
allgemeine Formularwert von 7 Tagen ist ausdruecklich kein Pflegewert dieser Art.
Jede Art hat einen Google-Link fuer weitere Recherche; kein Google-Scraping.

Beim Erweitern von `CARE` Originalquelle, Namenszuordnung und Aktualitaet pruefen.
Das Pruefdatum in Kommentar und Template gemeinsam aktualisieren. Licht, Erde,
Topfgroesse und Jahreszeit veraendern den Wasserbedarf; Termine sind Erinnerungen.

## Pruefung und Deployment

```bash
# server
.venv/bin/python manage.py test botanic contracts pages.tests.test_projects
.venv/bin/python manage.py makemigrations --check --dry-run

# frontend, bei laufendem Django-Server und Netzwerkzugriff
node scripts/check-botanic.cjs
npm run check:i18n
npm run build
```

Der Browsercheck legt ein temporaeres Testkonto mit zufaelligen Zugangsdaten an
und entfernt es samt Pflanzen am Ende, auch bei regulaeren Testfehlern. Er prueft
echte API-Fotos, Anmeldung, alle Schreibablaeufe, Nutzung ohne JavaScript und
acht Bildschirmgroessen (280 bis 1920 Pixel). Screenshots: `/tmp/botanic-check`.
Optional: `BOTANIC_BASE_URL` und `BOTANIC_SCREENSHOT_DIR` setzen. Nur gegen die
lokale Entwicklungsdatenbank verwenden; ein hart beendeter Prozess kann ein
`botanic-check-...@example.test`-Konto zuruecklassen.

Nach Deployment Migrationen anwenden, Frontend bauen, `collectstatic` ausfuehren
und den Django-Prozess neu starten. Es sind keine neuen Python-Abhaengigkeiten
oder Geheimnisse noetig. `build-botanic-icons.cjs` erzeugt den Lucide-Sprite bei
Icon-Aenderungen; der fertige Sprite ist eingecheckt.

API-Quellen: [Dokumentation](https://api.inaturalist.org/v1/docs/),
[empfohlene Nutzung](https://www.inaturalist.org/pages/api+recommended+practices),
[Bildlizenzen](https://help.inaturalist.org/en/support/solutions/articles/151000169918).

Bekannter unabhaengiger Teststand: `pages.tests.test_portfolio_transition`
erwartet fuer Zahlung und Spenden eine Weiterleitung nach `/projekte`, waehrend
die bereits vorhandenen Routen nach `/spenden/` bzw. auf die Spendenseite fuehren.
Diese beiden Abweichungen wurden nicht im Rahmen von Botanic veraendert.

## Integriertes Wetter

Unter `/botanic/wetter/` ist das Wettermodul über die Botanic-Navigation erreichbar. Die bestehende Wetteroberfläche und `weather-widget.js` werden gemeinsam weiterverwendet: Ortssuche, aktuelle Werte, Regenfenster, Sonnenzeiten, stündlicher Verlauf, 5-Tage-Vorhersage und Luftqualität. Letzte Orte und Cache bleiben im Browser erhalten. Das Modul ist auch ohne Anmeldung nutzbar. Gießtermine werden weiterhin individuell verwaltet.

Die früheren Routen `/wetter` und `/wetter/` leiten dauerhaft zum Modul weiter. Wetter wird im Portfolio als Funktion von ENBT Botanic geführt; die bisherige Projektkarte bleibt unveröffentlicht im internen Datenbestand erhalten. Der Vite-Einstieg `src/botanic-weather.jsx` wird mit `npm --prefix frontend run build` gebaut.
