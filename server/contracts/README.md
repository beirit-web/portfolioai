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
- `views.py` und `urls.py`: Seite, Vorschau und TXT-Download.
- `tests.py`: Tests fuer Vorlagen, Validierung, Endpoints und CSRF-Schutz.

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
| `/vertragsgenerator/vorschau/` | POST | JSON mit Vertragstext und Feldfehlern |
| `/vertragsgenerator/download/` | POST | TXT-Datei; HTTP 400 bei ungueltigen Angaben |

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

- Angemeldete Benutzer und pro Benutzer gespeicherte Datenbank-Entwuerfe.
- Vorlagenverwaltung im Django-Admin statt versionierter Python-Dateien.
- Ein eigenstaendiger PDF-Endpoint fuer direkt herunterladbare PDF-Dateien.

## Django-Referenzen

- [Formularfelder und Validierung](https://docs.djangoproject.com/en/4.2/ref/forms/fields/)
- [CSRF-Schutz fuer Formulare und AJAX](https://docs.djangoproject.com/en/4.2/howto/csrf/)
