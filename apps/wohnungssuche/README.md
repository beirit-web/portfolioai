# Wohnungssuche

Die aktive React/Preact-Oberfläche liegt in diesem Ordner; die persistente API
und ihre Eigentümerprüfungen liegen in
[server/pages/housing_api.py](../../server/pages/housing_api.py).

Installation, Builds und Start stehen in der [Hauptanleitung](../../README.md#lokal-starten),
der technische Aufbau und die Ausgabeordner in der
[Architektur](../../docs/architecture.md#vom-quellcode-zur-ausgelieferten-seite).
Änderungen erfolgen hier an den Quellen; der Build ersetzt die erzeugte App-Ausgabe.

## Einstieg und Entwicklung

Einstieg: `http://127.0.0.1:8000/wohnungssuche/`. Unterseiten sind `dashboard`,
`apartments`, `search-profiles`, `sources`, `notifications`, `information`,
`login` und `register`. Der bisherige statische Einstieg und seine Hash-Routen
bleiben nutzbar; die alten allgemeinen URLs führen zum neuen Namensraum.
Der Rücklink führt auf `/projekte/wohnungssuche-bodensee`.

Für Entwicklung vom Repository-Stamm:

```bash
npm --prefix apps/wohnungssuche run dev
```

Die API-Basis ist standardmäßig `/wohnungssuche-api/`. Ein abweichender lokaler
Pfad kann beim Build über `VITE_API_BASE` gesetzt werden. Musterdaten verwenden;
keine Anmeldetokens oder Zugangsdaten in einen Build einbetten.

## Daten und Bedienung

Die API bietet Registrierung, Anmeldung, Abmeldung, Suchprofile, Suchorte,
Beispielangebote und Quellen. Suchprofile und Suchorte
werden in der gemeinsamen Django-Datenbank gespeichert. Jeder Zugriff und jede
Ortszuordnung wird auf den angemeldeten Nutzer begrenzt. Anlegen, Bearbeiten,
Löschen und Neuladen verwenden die gespeicherten Datensätze; bei fehlgeschlagenem
Speichern bleiben die Formulare erhalten. Abmeldung sperrt den Token; nach
Anmeldung entsteht ein neuer.

Der Gastmodus zeigt fiktive Angebote. Suchseitenlinks angemeldeter Konten bleiben
als manuelle Quellenlinks gekennzeichnet und sind keine geprüften Wohnungsangebote.
Automatische Anbieterabfragen und Benachrichtigungen sind nicht aktiviert.

Die Filter verwenden flexible Spalten. Die mobile Navigation unterstützt
Schließen-Knopf, Hintergrundklick, Escape, Fokusbegrenzung, Browser-Zurück und
kleine Querformatbildschirme. Der direkte Rücklink ist auch ohne geöffnetes Menü
erreichbar. Die Erweiterungen liegen in [public/responsive.css](public/responsive.css)
und [public/navigation.js](public/navigation.js).

## Gezielte Prüfungen

Voraussetzungen, Builds, temporäre Testdaten und Berichte beschreibt die
[Prüfanleitung](../../docs/checks.md). App-spezifische Befehle vom Repository-Stamm:

```bash
server/.venv/bin/python server/manage.py test pages.tests.test_housing_api
npm --prefix frontend run test:browser -- housing-responsive.spec.cjs housing-navigation.spec.cjs
npm --prefix frontend run test:housing
```

Die Browserprüfung `test:housing` verwendet die echte API. Zwei fiktive Konten
prüfen Speicherung, Eigentümerprüfung, Neuladen, einen Django-Prozessneustart,
Abmeldung, Kontowechsel und bedienbare Fehler auf Handy und Desktop.

Die mitgelieferten [Lizenzhinweise](public/THIRD_PARTY_LICENSES.md) bleiben erhalten.
