# Vertragsgenerator

Django-App im bestehenden Projekt `server`. Einstieg:
`http://localhost:8000/vertragsgenerator/`.

## Aufbau

- `definitions.py`: Metadaten, Formularfelder und Beispieldaten der drei Vorlagen.
- `forms.py`: Django-Formulare; Datums-, Geld-, Laengen- und Pflichtfeldpruefung.
- `templates/contracts/documents/*.txt`: Vertragstexte als Django-Templates.
- `templates/contracts/generator.html`: HTML-Oberflaeche mit CSRF-Token und
  sicher eingebetteter Konfiguration (`json_script`).
- `static/contracts/`: CSS und JavaScript fuer die interaktive Oberflaeche.
- `static/contracts/document-design.css`: gemeinsame Dokumentgestaltung und
  eigenes Mietvertragslayout fuer Editor, KI-Vorschau und Druck.
- `static/contracts/clear-inputs.js`: einzelne Eingaben leeren und Vorschau sowie
  lokale Arbeitskopie ueber die normalen Formularereignisse aktualisieren.
- `views.py` und `urls.py`: Seite, Vorschau, TXT-Download und KI-Endpunkt.
- `tests.py`: Tests fuer Vorlagen, Validierung, Endpoints und CSRF-Schutz.
- `test_ai.py`: KI-Anbindung, Antwortvalidierung und Begrenzungen mit simuliertem Anbieter.

## Dokumenten-Editor

Die Oberflaeche ist mobile first aufgebaut. Unter 1024 Pixel Breite wechseln
die Ansichten `Angaben` und `Dokument` zwischen Eingabe und Vorschau.
Die Abschnittsnavigation ist horizontal scrollbar; immer ein Formularabschnitt
ist sichtbar. Zurueck/Weiter und die direkte Abschnittsauswahl erhalten alle
Eingaben. Fehlerlinks in der Vorschau oeffnen den passenden Abschnitt und
fokussieren das betroffene Feld.

Ab 1024 Pixel Breite werden Abschnittsnavigation, Formular und Dokument
nebeneinander angezeigt. Formular und Dokument haben eigene Scrollbereiche.
Die Dokumentvorschau hat eine feste A4-Seitenbreite und wird standardmaessig
an den verfuegbaren Platz angepasst. Zoomstufen reichen von 50 bis 150 Prozent;
vergrosserte Dokumente lassen sich im Dokumentbereich verschieben.

Eingabefelder besitzen eine eigene Leeren-Schaltflaeche. Die gemeinsame Methode
`ContractInputs.clear(fieldOrId)` leert ein Feld, setzt den Fokus und loest
`input`/`change` aus, damit Vorschau und lokale Arbeitskopie aktualisiert werden.
Gespeicherte Momentaufnahmen in der Ablage bleiben erhalten. Beim Leeren der
KI-Beschreibung wird auch der zugehoerige Vorschlag zurueckgesetzt.

Editor und KI-Vorschau verwenden dieselbe Dokumentgestaltung mit Vertragsparteien,
nummerierten Abschnitten, Angaben als Beschriftung/Wert und Unterschriftsbereich.
`createDocumentContent()` erzeugt die Darstellung ausschliesslich mit Textknoten;
TXT und Kopieren verwenden weiterhin den vollstaendigen Servertext.

Der Mietvertrag verwendet eine eigene Gestaltung fuer Mietobjekt/Mietbeginn,
Miete/Kaution und den Abschluss. Vorschau und KI-Antwort liefern dafuer
`documentValues`: dieselben validierten, formatierten Werte wie im TXT-Export.
Mehrzeilige Adressen und eigene nummerierte Absprachen bleiben dadurch in ihrem
Feld; die Darstellung muss diese Inhalte nicht aus Vertragstext zuruecklesen.

Der Dokumentkopf zeigt Vertragsart und Entwurfsstatus. Mietobjekt und Mietbeginn
stehen bei ausreichender Breite nebeneinander; Miete und Kaution werden als
eigene Betraege mit der Zahlungsfrist darunter dargestellt. Auf schmalen
KI-Vorschauen werden diese Bereiche untereinander angeordnet. Der Editor behaelt
seine skalierbare A4-Ansicht. Ort, Datum und Unterschriften bilden einen gemeinsamen
Abschluss. Der ausgefuellte Beispiel-Mietvertrag ohne Logo passt mit normaler
Schriftgroesse im geprueften Chromium-Druck auf eine A4-Seite. Laengere Angaben,
ein Logo oder andere Schriftgroessen koennen weitere Seiten benoetigen.

Das Export-Menue in der Werkzeugleiste enthaelt TXT, Kopieren und PDF/Drucken.
Schriftgroesse und Logo werden in einem Dialog eingestellt; diese Einstellungen
werden sofort uebernommen. Export und Abschnittswechsel funktionieren auch
mit der Tastatur. Ohne JavaScript bleiben das serverseitige Formular und der
TXT-Download verfuegbar.

Die Icons stammen aus der vorhandenen Lucide-Bibliothek. Das SVG-Sprite liegt
als statische Datei in der App und benoetigt keine externe Laufzeitbibliothek.
Nach Aenderungen an der Icon-Auswahl aus `frontend` neu erzeugen:

```sh
node scripts/build-contract-icons.cjs
```

Die Browserpruefung aus `frontend` ausfuehren, waehrend Django laeuft:

```sh
node scripts/check-contract-editor.cjs
```

Screenshots liegen unter `runtime/contracts-checks/screenshots/` ab
Repository-Stamm. Optional: `CONTRACTS_BASE_URL` für einen lokalen
HTTP(S)-Ursprung und `CONTRACTS_SCREENSHOT_DIR` für einen anderen Ausgabeordner
setzen. Relative Ausgabepfade beziehen sich auf den Repository-Stamm.

## URLs

| URL | Methode | Ergebnis |
| --- | --- | --- |
| `/vertragsgenerator/` | GET | Oberflaeche; `?template=vehicle` bzw. `purchase` waehlt eine Vorlage |
| `/vertragsgenerator/vorschau/` | POST | JSON mit Vertragstext, formatierten `documentValues` und Feldfehlern |
| `/vertragsgenerator/download/` | POST | TXT-Datei; HTTP 400 bei ungueltigen Angaben |
| `/vertragsgenerator/assistent/` | POST | KI-Vorschlag; Vertragsentwuerfe enthalten Text, Formularfelder und `documentValues` |

POST-Anfragen enthalten `template=rent`, `vehicle` oder `purchase` und die
jeweiligen Formularfelder. Der CSRF-Token wird als Formularfeld oder im Header
`X-CSRFToken` uebermittelt. Unbekannte Vorlagen liefern HTTP 404.

Unvollstaendige Entwuerfe lassen sich weiterhin exportieren. Fehlende Angaben
erscheinen als Platzhalter. Ungueltige vorhandene Angaben, beispielsweise
negative Geldbetraege oder ungueltige Datumswerte, blockieren den Export.
Geldbetraege akzeptieren maximal zwei Nachkommastellen und keine negativen Werte.

## Daten und Export

Entwuerfe verwenden die bisherigen LocalStorage-Schluessel
`beirit-contract-generator:*`. Vorhandene Entwuerfe desselben Browser-Ursprungs
bleiben nutzbar. Beim Wechsel des Ursprungs, etwa von `localhost` auf
`127.0.0.1` oder von HTTP auf HTTPS, sind diese lokalen Daten getrennt.

Die Formulareingaben werden fuer Vorschau und TXT-Export an Django gesendet.
Die App schreibt keine Vertragsdaten in Datenbank, Session oder Dateien.
Antworten mit Vertragsdaten erhalten `Cache-Control: no-store`.
Logo, Position, Groesse und Schriftgroesse bleiben lokal.

Kopieren verwendet den vom Server erzeugten Text. PDF wird ueber den
Browser-Druckdialog erzeugt und beruecksichtigt Logo und Schriftgroesse.
Der TXT-Export enthaelt Text und Unterschriftslinien, keine Bilder.
Die Vertragstexte entsprechen den bisherigen Demo-Vorlagen.

## Lokal starten und pruefen

Installation und gemeinsamer Serverstart stehen in der
[Hauptanleitung](../../README.md#lokal-starten), die regulären Prüfgruppen in der
[Prüfanleitung](../../docs/checks.md). Die gezielte Backendprüfung aus dem
Repository-Stamm:

```sh
server/.venv/bin/python server/manage.py test contracts pages.tests.test_projects
```

Die Migration `pages.0040_contract_generator_url` stellt ausschliesslich den
bisherigen Demo-Link des Portfolio-Projekts `vertragsgenerator` um. Individuell
geaenderte Links werden nicht ueberschrieben. Sie aendert kein Datenbankschema.

## Build und Weiterleitung

Die gemeinsamen [Frontend-Builds](../../docs/architecture.md#vom-quellcode-zur-ausgelieferten-seite)
sind in der Architektur beschrieben. Die Links zum Vertragsgenerator gehören
zum Portfolio-Build.

Der bisherige Einstieg
`/static/portfolio/vertragsgenerator-main/index.html` leitet ueber eine kleine
HTML-Datei zur Django-Seite weiter. Auch fuer die Weiterleitung muss die aktuelle
statische Ausgabe ausgeliefert werden. `server/staticfiles` nicht manuell bearbeiten.

## Moegliche Erweiterungen

Die folgenden Punkte sind noch nicht umgesetzt. Als naechste Verbesserungen
sind vorgesehen:

- Mobiler Lesemodus mit lesbarer Schrift unabhaengig von der verkleinerten A4-Ansicht.
- Gezielte KI-Rueckfragen, um fehlende Angaben gemeinsam zu ergaenzen.
- Direkter PDF-Download ueber einen eigenen Endpoint ohne Browser-Druckdialog.
- Versionsvergleich, der Aenderungen zwischen gespeicherten Entwuerfen hervorhebt.

Weitere Ausbauideen:

- Angemeldete Benutzer und pro Benutzer gespeicherte Datenbank-Entwuerfe.
- Vorlagenverwaltung im Django-Admin statt versionierter Python-Dateien.

## Performance messen

Beim Tippen werden nur geänderte Feld- und Statusanzeigen aktualisiert.
Feldbeschriftungen, Fehlermeldungslinks und Rückmeldungsicons werden
wiederverwendet. Die Übersicht und der KI-Bereich laden keine verborgene
Editor-Vorschau; beim Öffnen des Editors wird der aktuelle Stand angefordert.
Ein unveränderter, bereits geladener Stand benötigt keine erneute Anfrage.
Die Icon-Sprite-URL wird einmal pro Seitenrender ermittelt und in den Includes
wiederverwendet. Vertragsdaten werden dafür nicht auf dem Server gecacht.

Der lokale Vergleich misst Übersicht und Editor in Desktop- und Mobilansicht.
Chromium startet für jeden Durchlauf mit leerem Browsercache und vierfach
gedrosselter CPU; die Netzwerkverbindung bleibt lokal. Pro Ansicht werden drei
Durchläufe erfasst und deren Median ausgegeben. Während Django läuft, vom
Repository-Stamm aus ausführen:

```sh
node frontend/scripts/measure-contract-performance.cjs before
# Nach der zu vergleichenden Änderung:
node frontend/scripts/measure-contract-performance.cjs after
```

Optional legt `CONTRACTS_BASE_URL` einen anderen lokalen Ursprung fest. Ergebnisse
liegen in `runtime/contracts-performance/before.json` und `after.json` und werden
nicht committed. Gemessen werden unter anderem TTFB, FCP, LCP, Vorschauanfragen
beim Einstieg sowie JavaScript-Laufzeit und DOM-Änderungen für 200 synthetische
Eingabeereignisse. Dieser Eingabetest misst den Aufwand der Ereignisbehandlung,
keinen INP-Wert und keine reale Tippgeschwindigkeit. Es werden ausschließlich
fiktive Eingaben verwendet und keine KI-Anfragen gesendet.

Für die grüne Performance-Bewertung zusätzlich Lighthouse verwenden. Ziel sind
mindestens 90 von 100 Punkten für Übersicht und Editor, jeweils mobil und am
Desktop. Der synthetische Eingabetest oben liefert keinen Lighthouse-Score.
Die optionalen Messwerkzeuge liegen unter `tools/performance`; falls sie noch
fehlen, vom Repository-Stamm mit `npm --prefix tools/performance ci` installieren.
Mit laufendem Django-Server:

```sh
cd frontend
npm run lighthouse -- http://localhost:8000/vertragsgenerator/ \
  --only-categories=performance --output=json --output=html \
  --output-path=../runtime/contracts-performance/lighthouse-overview-mobile
```

Für den Editor die URL durch
`http://localhost:8000/vertragsgenerator/?template=rent` ersetzen. Für Desktop
`--preset=desktop` ergänzen und einen eigenen Ausgabepfad verwenden. Ohne dieses
Argument gilt das mobile Standardprofil. Wenn kein Browser automatisch gefunden
wird, `CHROME_PATH` auf die lokale Chrome-/Chromium-Datei setzen. CPU- und
Netzwerkdrosselung der Lighthouse-Standardprofile unverändert lassen.

Jede Kombination dreimal nacheinander messen und separate Ausgabepfade nutzen;
Median und Spannweite festhalten. Währenddessen keine parallelen Browsertests
starten. Lokale Messungen können von einer späteren Hosting-Umgebung abweichen.
Die HTML-Berichte zeigen die tatsächliche Bewertung und bleiben wie die
JSON-Rohwerte unter `runtime/` ignoriert.

## Django-Referenzen

- [Formularfelder und Validierung](https://docs.djangoproject.com/en/4.2/ref/forms/fields/)
- [CSRF-Schutz fuer Formulare und AJAX](https://docs.djangoproject.com/en/4.2/howto/csrf/)

## Vertragsstudio und lokale Entwurfsablage

Die Startseite zeigt eine responsive Übersicht mit eigener SVG-Illustration,
Vorlagenkarten, Navigation und Entwurfsablage. `?workspace=editor` öffnet den
bestehenden Editor direkt; `?template=vehicle` bleibt kompatibel.

`In Ablage speichern` speichert eine benannte Momentaufnahme der Formularwerte
unter `beirit-contract-generator:library-v1`. Suche, Vertragsartfilter,
Duplizieren und Löschen arbeiten lokal. Beim Wiederöffnen eines Entwurfs wird
eine abweichende Arbeitskopie vorher gesichert. Die Ablage ersetzt keine
Datensicherung: Löschen der Browserdaten entfernt diese Entwürfe. Logo und
Schriftgröße sind weiterhin gemeinsame Einstellungen, kein Teil der Kopie.

## Optionaler KI-Assistent mit Gemini

Der Bereich `#assistant` bereitet aus einer Beschreibung die Felder einer der
drei vorhandenen Vorlagen vor. Der Server prüft die Feldtypen und erzeugt daraus
die Dokumentvorschau. Erst `Im Editor übernehmen` verändert die Arbeitskopie.
Sprachliches Verbessern und Kürzen liefern einen separat kopierbaren Vorschlag.
KI-Ergebnisse sind ungeprüfte Demo-Entwürfe, keine verbindliche Rechtsberatung.

Vertragsentwürfe erscheinen in einer formatierten Dokumentvorschau; überarbeitete
Texte bleiben direkt bearbeitbar. Fehlt in einem älteren geöffneten Browser-Tab
die gemeinsame Darstellungsfunktion, wird ein erfolgreicher Vorschlag als
schreibgeschützter Text mit Kopier- und Übernahmefunktion angezeigt. Die aktuelle
Gestaltung wird nach erneutem Laden der Seite verwendet.

Die Anbindung nutzt die Gemini REST API mit `gemini-3.5-flash-lite`.
Gemini 2.5 ist laut [Google-Modellhinweis](https://ai.google.dev/gemini-api/docs/deprecations)
auf zuvor aktive Projekte beschränkt und kann bei neuen Zugängen trotz eines
Eintrags in der Modellliste HTTP 404 liefern. Alte lokale Modell-Overrides auf
`gemini-3.5-flash-lite` ändern und Django neu starten.
[Google dokumentiert einen begrenzten kostenlosen Tarif](https://ai.google.dev/gemini-api/docs/pricing).
Ein Schlüssel lässt sich in [Google AI Studio](https://aistudio.google.com/apikey)
erstellen. Für kostenlosen Betrieb ein Projekt ohne aktivierte Abrechnung
verwenden. Die App kann die Abrechnungsstufe eines Schlüssels nicht prüfen.
Provider-Limits können variieren und niedriger als die eigene Grenze sein.
Es gibt keine automatischen Wiederholungen, Anbieterwechsel oder Upgrades.

Auf ausdrücklichen Wunsch wird die private Datei `server/.env.orig` geladen.
Sie ist ausdrücklich in `.gitignore` eingetragen und darf niemals committed
werden. Öffentliche `.env`-Dateien und `.env.example` bleiben reine Beispiele.
Lokales Konfigurationsbeispiel (der folgende Schlüssel ist fiktiv):

```dotenv
CONTRACTS_AI_ENABLED=True
CONTRACTS_GEMINI_API_KEY=fictional-replace-locally
CONTRACTS_GEMINI_MODEL=gemini-3.5-flash-lite
CONTRACTS_AI_DAILY_LIMIT=20
```

Ladereihenfolge: Prozessumgebung, `.env.local`, `.env.orig`, öffentliches `.env`.
Nach Änderungen Django neu starten. Schlüssel weder im Browser noch im Chat
hinterlegen. Dateirechte der privaten Konfiguration auf `600` setzen.

Die Anwendung erlaubt maximal 20 Versuche pro UTC-Tag, mindestens zehn Sekunden
Abstand und maximal 4096 Ausgabetokens pro Anfrage. Auch fehlgeschlagene Versuche
zählen. Der Zähler liegt pro Installation prozessübergreifend in einer ignorierten
SQLite-Datei neben der konfigurierten Datenbank. Er enthält ausschließlich Tag,
Anzahl und Zeitstempel, keine Vertragsdaten. Kann der Zähler nicht geprüft werden,
wird keine Anfrage gesendet. Die Grenze ist eine Demo-Bremse, keine Garantie für
ein kostenloses Provider-Kontingent. Öffentlicher Mehrbenutzerbetrieb benötigt
ein eigenes Zugriffs- und Quotenmodell.

Nur eine ausdrückliche Aktion mit bestätigter Übermittlung sendet den eingegebenen
Text an Google. Der Assistent ist für fiktive Beispieldaten vorgesehen. Es gelten
[Googles Datenverarbeitungsbedingungen](https://ai.google.dev/gemini-api/terms).
Prompts und Ergebnisse werden auf unserem Server nicht dauerhaft gespeichert.
API-Schlüssel gelangen nur in den Request-Header zur fest definierten Google-API;
Weiterleitungen werden nicht verfolgt. CSRF-Prüfung, Eingabelimits, Timeout und
Antwortvalidierung gelten auch für den KI-Endpunkt.

Prüfung ohne echte KI-Anfragen:

```sh
DJANGO_ENV=local STATICFILES_STORAGE=django.contrib.staticfiles.storage.StaticFilesStorage \
  server/.venv/bin/python server/manage.py test contracts --noinput
cd frontend
npx playwright test \
  tests/browser/contracts-workspace.spec.cjs \
  tests/browser/contracts-performance.spec.cjs \
  tests/browser/contracts-efficiency.spec.cjs \
  tests/browser/contracts-clear.spec.cjs \
  tests/browser/contracts-document.spec.cjs \
  tests/browser/contracts-assistant-layout.spec.cjs \
  tests/browser/contracts-rent-layout.spec.cjs
```

Die Browserprüfungen deaktivieren die echte KI und verwenden für den Assistenten
simulierte Antworten. Ein erfolgreicher Test mit simulierten Antworten bestätigt
keine erfolgreiche Verbindung zum Anbieter.

Die Browserprüfungen decken unter anderem Einzel-Leeren, lokale Speicherung,
mehrzeilige Mietvertragsangaben, eigene nummerierte Absprachen, schmale Ansichten,
den KI-Vorschau-Fallback sowie Formular und TXT-Export ohne JavaScript ab.
Die Mietvertragsprüfung erzeugt Screenshots und eine Beispiel-PDF unter
`runtime/browser-checks/results/`. Diese lokalen Prüfartefakte bleiben ignoriert.
