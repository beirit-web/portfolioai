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
leiten nach `/wohnungssuche/` weiter; Hash und Suchparameter bleiben erhalten.
Die alten allgemeinen URLs führen ebenfalls zum neuen Namensraum.
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
Beispielangebote und Quellen. Neue Konten bleiben bis zur Bestätigung ihrer
E-Mail-Adresse gesperrt. Erst danach gibt die Anmeldung einen Zugangstoken aus.
Abgelaufene Bestätigungslinks und vergessene Passwörter werden über die gemeinsamen
[Kontoformulare](../../server/pages/README.md#account-forms) behandelt.

### Bestätigen und Passwort zurücksetzen ohne E-Mail

Die lokale Demo erklärt bereits auf Login und Registrierung, dass keine E-Mail
an ein echtes Postfach zugestellt wird. Der Modus wird durch Django bestimmt:
`DEBUG=True`, `LOCAL_ACCOUNT_ACTIVATION_ENABLED=True`, abgeschalteter Mailversand,
Console-Mailbackend sowie Loopback-Host und Loopback-Verbindung müssen gemeinsam
vorliegen. Die öffentlichen Musterdateien enthalten diese lokale Konfiguration.

- Nach der Registrierung führt die App zur gemeinsamen Anmeldeseite. Im
  Beispielpostfach `/examplemail` steht der sechsstellige Aktivierungscode für
  genau diesen Browser. Er gilt eine Minute. Nach der Eingabe kann man sich
  anmelden und gelangt zurück zum Dashboard der Wohnungssuche.
- Auch die Anmeldung mit korrekten Zugangsdaten eines noch unbestätigten Kontos
  öffnet diesen Ablauf. Falsche Passwörter oder administrativ gesperrte Konten
  geben keinen Aktivierungscode frei.
- „Passwort vergessen?“ öffnet das gemeinsame Wiederherstellungsformular. Nach
  Eingabe der registrierten Adresse erscheint ein lokaler Wiederherstellungstoken
  im selben Browser. Er gilt zehn Minuten. „Token verwenden und Passwort setzen“
  öffnet direkt das Formular für ein neues Passwort; anschließend führt „Zum
  Login“ zurück zu `/wohnungssuche/login`. Es ist kein Konsolenzugriff nötig.

Lokale Token werden weder per E-Mail versendet noch in erzeugte URLs oder
Konsolenausgaben geschrieben. Die Tokenanzeige ist nur über dieselbe Session
verfügbar, geschützt gegen Caching und Suchmaschinenindexierung. Außerhalb des
ausdrücklich lokalen Modus bleibt der bestehende E-Mail-/Console-Ablauf aktiv.
`GET /wohnungssuche-api/auth/config/` liefert der Oberfläche die passenden
Hinweise und Kontolinks, aber keinen Aktivierungs- oder Wiederherstellungscode.

Suchprofile und Suchorte
werden in der gemeinsamen Django-Datenbank gespeichert. Jeder Zugriff und jede
Ortszuordnung wird auf den angemeldeten Nutzer begrenzt. Anlegen, Bearbeiten,
Löschen und Neuladen verwenden die gespeicherten Datensätze; bei fehlgeschlagenem
Speichern bleiben die Formulare erhalten. Abmeldung sperrt den Token; nach
Anmeldung entsteht ein neuer.

Der Gastmodus zeigt fiktive Angebote. Suchseitenlinks angemeldeter Konten bleiben
als manuelle Quellenlinks gekennzeichnet und sind keine geprüften Wohnungsangebote.
Automatische Anbieterabfragen und Benachrichtigungen sind nicht aktiviert.
Unter „Angebote“ kann eine angemeldete Person zusätzlich ausdrücklich eine
Live-Suche über Somantic auslösen. Diese ist standardmäßig nicht eingerichtet.

## Somantic lokal einrichten

Der Django-Adapter liegt in
[server/pages/housing_live.py](../../server/pages/housing_live.py). Er verwendet
die [dokumentierte GraphQL-API](https://www.somantic.net/developers/docs) und die
Nutzung als Suchdienst auf einzelne Anfragen nach
[Abschnitt 15.5a der Anbieterbedingungen](https://www.somantic.net/agb).
Die Anwendung baut kein öffentliches Inseratverzeichnis auf.

1. Einen kostenlosen Somantic-Zugang im
   [Entwicklerbereich](https://www.somantic.net/developers) erstellen und den
   API-Schlüssel ausschließlich in der ignorierten Datei `server/.env.local`
   hinterlegen. Keinen Schlüssel im Browser, in Git oder in Screenshots ablegen.
2. Folgende lokale Einstellungen setzen; den fiktiven Platzhalter ersetzen:

   ```dotenv
   HOUSING_SOMANTIC_ENABLED=True
   HOUSING_SOMANTIC_API_KEY=example-only-replace-locally
   HOUSING_SOMANTIC_MONTHLY_LIMIT=45
   ```

3. Vom Repository-Stamm `server/.venv/bin/python server/manage.py migrate`
   ausführen und Django neu starten. Danach anmelden, „Angebote“ öffnen und
   „Aktuelle Angebote abrufen“ wählen. Ohne Schlüssel bleiben Demo und Profile
   bedienbar; es erfolgen keine Anbieteranfragen.

`GET /wohnungssuche-api/live-search/status/` zeigt nur den Einrichtungsstatus
und das verbleibende Budget. Erst ein authentifiziertes
`POST /wohnungssuche-api/live-search/` mit `city` sowie optional
`max_cold_rent`, `max_warm_rent` und `min_rooms` fragt Somantic ab.
Der Schlüssel bleibt im Django-Prozess; Zieladresse und GraphQL-Felder sind
festgelegt, Weiterleitungen und automatische Wiederholungen sind deaktiviert.

Das Standardbudget beträgt 45 Anfragen pro Kalendermonat in der Django-Zeitzone
und gilt gemeinsam für alle Konten und Prozesse derselben Datenbank. Auch
fehlgeschlagene Versuche zählen vorsorglich. Eine bedingte SQL-Aktualisierung
reserviert das Budget vor dem Abruf; der Zähler überlebt Prozessneustarts.
Der Code begrenzt jede Konfiguration auf höchstens 50 Anfragen. Ein Abstand von
zwei Sekunden schützt vor Doppelklicks und parallelen Abrufen. Anfragen anderer
Anwendungen mit demselben Schlüssel werden lokal nicht mitgezählt: Dafür einen
eigenen Schlüssel im kostenlosen Tarif verwenden und dessen Kontingent im
Anbieterkonto prüfen. Der Code bucht keinen Tarif und führt keine Zahlungen aus.

Ein Abruf prüft bis zu 20 zuletzt erfasste aktive Mietwohnungen im angegebenen
Ort. Kaltmiete und Zimmerzahl werden beim Anbieter eingegrenzt, Warmmiete und
genaue Budgetgrenzen zusätzlich lokal geprüft. Das ist keine vollständige
Marktübersicht; unbekannte Mietpreise werden bei gesetztem Budget ausgeschlossen.
Ergebnisse tragen Quelle und unveränderten Original-Link. Beschreibungstexte,
Bilder, Straßenadressen und Koordinaten werden nicht abgefragt. Inserate werden
weder in der Datenbank noch im Browser-Speicher abgelegt; beim Neuladen,
Verlassen der Angebotsseite, Ändern der Suchkriterien oder nach 15 Minuten
verschwinden sie ohne erneuten Anbieterabruf. Die Antwort und die App sind
gegen HTTP-Caching beziehungsweise Suchmaschinenindexierung gekennzeichnet.

Automatisierte Prüfungen verwenden ausschließlich fiktive Anbieterantworten.
Ob das eigene Konto freigeschaltet ist und welche aktuellen Bodensee-Angebote
geliefert werden, lässt sich erst mit dem lokal hinterlegten Schlüssel prüfen.

## Dashboard und Filter

Das Demo-Dashboard zählt die Beispielwohnungen, ihre Statuswerte und Orte in einem
ausdrücklich gekennzeichneten Demo-Überblick. Es gibt keine echten Match-Scores
für Demo-Angebote aus. Einzelwohnungen erscheinen unter „Angebote“, gespeicherte
Suchseiten unter „Quellen“. Suchseiten zählen nicht als Wohnungen und unterliegen
nicht den Mietpreisfiltern.

Angewendete Filter und die Sortierung stehen in der URL: `q`, `city`,
`max_cold_rent`, `max_warm_rent`, `social=1`, `hide_demo=1` und `sort`.
Neuladen, Lesezeichen und Browser-Zurück stellen die Suche wieder her.
Filteränderungen werden mit „Suchen“ übernommen; die Sortierung wirkt sofort.
Einzelne aktive Filter lassen sich über ihre Schaltflächen entfernen.

Die Filter verwenden flexible Spalten. Die mobile Navigation unterstützt
Schließen-Knopf, Hintergrundklick, Escape, Fokusbegrenzung, Browser-Zurück und
kleine Querformatbildschirme. Der direkte Rücklink ist auch ohne geöffnetes Menü
erreichbar. Die Erweiterungen liegen in [public/responsive.css](public/responsive.css)
und [public/navigation.js](public/navigation.js).

## Gezielte Prüfungen

Voraussetzungen, Builds, temporäre Testdaten und Berichte beschreibt die
[Prüfanleitung](../../docs/checks.md). App-spezifische Befehle vom Repository-Stamm:

```bash
server/.venv/bin/python server/manage.py test pages.tests.test_housing_api pages.tests.test_housing_live pages.tests.test_housing_local_accounts pages.tests.test_local_password_reset
npm --prefix frontend run test:browser -- housing-responsive.spec.cjs housing-navigation.spec.cjs housing-search.spec.cjs housing-live.spec.cjs housing-local-accounts.spec.cjs
npm --prefix frontend run test:housing
```

Die Browserprüfung `test:housing` verwendet die echte API. Zwei fiktive Konten
prüfen Speicherung, Eigentümerprüfung, Neuladen, einen Django-Prozessneustart,
Abmeldung, Kontowechsel und bedienbare Fehler auf Handy und Desktop.

Die mitgelieferten [Lizenzhinweise](public/THIRD_PARTY_LICENSES.md) bleiben erhalten.
