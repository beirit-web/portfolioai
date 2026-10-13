# Wohnungssuche Bodensee: erzeugte Portfolio-Webapp

Die lesbaren Quellen liegen unter `apps/portfolio-demos/wohnungssuche/frontend/`.
Dieses Verzeichnis wird vollständig daraus gebaut. Änderungen an Komponenten,
Styles, Navigation und dieser Dokumentation deshalb an den Quellen vornehmen.

Vom Repository-Stamm:

```bash
npm --prefix frontend ci
npm --prefix frontend run build:housing
server/.venv/bin/python server/manage.py migrate
server/.venv/bin/python server/manage.py runserver
```

Der Build verwendet die Versionen aus `frontend/package-lock.json` und erzeugt
`server/assets/portfolio/wohnungssuche/` mit gehashten Assets und Source Maps.
React-Importe werden wie im Portfolio auf `preact/compat` abgebildet.
Die Drittanbieterhinweise liegen in `THIRD_PARTY_LICENSES.md`.

Die Anwendung läuft unter `/wohnungssuche/` und den Unterseiten
`dashboard`, `apartments`, `search-profiles`, `sources`, `notifications`,
`information`, `login` und `register`. Der bisherige statische Einstieg und seine
Hash-Routen bleiben nutzbar; die alten allgemeinen URLs führen zum neuen
Namensraum. Der Rücklink führt auf `/projekte/wohnungssuche-bodensee`.

Die API-Basis ist standardmäßig `/wohnungssuche-api/`. Ein abweichender lokaler
Pfad kann beim Build über `VITE_API_BASE` gesetzt werden. Musterdaten verwenden;
keine Anmeldetokens oder Zugangsdaten in einen Build einbetten.

Suchprofile und Suchorte werden über diese API in der gemeinsamen Django-Datenbank
gespeichert. Jeder Zugriff und jede Ortszuordnung wird auf den angemeldeten Nutzer
begrenzt. Anlegen, Bearbeiten, Löschen und Neuladen verwenden die gespeicherten
Datensätze; bei fehlgeschlagenem Speichern bleiben die Formulare erhalten.
Der Gastmodus zeigt fiktive Angebote. Suchseitenlinks angemeldeter Konten bleiben
als manuelle Quellenlinks gekennzeichnet und sind keine geprüften Wohnungsangebote.

Die Filter verwenden flexible Spalten. Die mobile Navigation unterstützt
Schließen-Knopf, Hintergrundklick, Escape, Fokusbegrenzung, Browser-Zurück und
kleine Querformatbildschirme. Der direkte Rücklink ist auch ohne geöffnetes Menü
erreichbar. Die gepflegten Erweiterungen `responsive.css` und `navigation.js`
liegen im Quellverzeichnis `frontend/public/`.

Browserprüfungen vom Repository-Stamm:

```bash
npm --prefix frontend run test:browser -- housing-responsive.spec.cjs housing-navigation.spec.cjs
npm --prefix frontend run test:housing
```

Die Wohnungssuche-API wird dabei nicht simuliert. Zwei fiktive Konten prüfen
Speicherung, Eigentümerprüfung, Neuladen, einen echten Django-Prozessneustart,
Abmeldung, Kontowechsel und bedienbare Fehler auf Handy und Desktop. Jeder
Prüfserver verwendet eine temporäre Datenbank; lokale Nutzerdaten werden nicht
verändert. Browserberichte und Screenshots bleiben ignoriert unter `runtime/`.
