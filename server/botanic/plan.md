# ENBT Botanic: Django-Umstellung

## Umfang

Die statische Demo wird durch eine Django-App unter `/botanic/` ersetzt.
Oeffentliche Suche; private Sammlung und Giessplanung im bestehenden Konto.
Keine weiteren Zugangsdaten oder kostenpflichtigen API-Abos erforderlich.

## Schritte

- [x] Bestehende Demo, Anmeldung und Django-Konfiguration untersuchen.
- [x] iNaturalist-Suche live und API-Nutzungsbedingungen pruefen.
- [x] Datenmodelle, Migrationen, Formulare und Benutzertrennung erstellen.
- [x] API-Anbindung mit Cache, globalem Abruflimit und Fehlerbehandlung.
- [x] Suche, Sammlung, bearbeitbare Giessplaene und Giessprotokoll.
- [x] Mobile-first-Oberflaeche mit echten Pflanzenfotos und Bildnachweisen.
- [x] Alte URL umleiten und Portfolio-Verweise aktualisieren.
- [x] Django-Tests, echte API und Browserablaeufe pruefen.
- [x] Migrationen anwenden und Betrieb dokumentieren.

Abnahme: Django-Tests, reale API-Suche und Browserablaeufe erfolgreich;
acht Bildschirmgroessen sowie Nutzung ohne JavaScript geprueft.
Betrieb und Grenzen: [README.md](README.md).

## Entscheidungen

- Pflanzenarten werden aus iNaturalist uebernommen. Eigene Pflanzenexemplare,
  Standorte, Notizen und Termine gehoeren ausschliesslich dem angemeldeten Nutzer.
- API liefert keine Pflegeempfehlungen. Ergaenzend gibt es recherchierte,
  artspezifisch zugeordnete Pflegehinweise mit Quellen und Pruefdatum. Nur bei
  belegtem Tagesbereich wird ein passender Startwert vorgeschlagen. Ansonsten
  bleibt der allgemeine 7-Tage-Wert ausdruecklich nicht artspezifisch.
  Intervalle bleiben frei gewaehlte Erinnerungen; Erdfeuchte ist massgeblich.
- Bilder werden nur mit CC0 oder CC BY uebernommen; Quelle und Lizenz bleiben
  sichtbar. Nicht passende oder fehlende Fotos erhalten einen neutralen Platzhalter.
- Suche wird serverseitig gecacht. Ein datenbankgestuetztes Abrufbudget gilt
  pro Installation, auch bei mehreren Django-Workern: hoechstens ein neuer
  API-Aufruf je Sekunde und 9.500 je Tag. HTTP 429 fuehrt zu einer Abrufpause.
- Giessen wird pro Exemplar und Tag einmal protokolliert. Der naechste Termin
  wird vom tatsaechlichen Giesstag aus berechnet, nicht vom ueberfaelligen Datum.
- Pausierte Pflanzen bleiben in der Sammlung; ausstehende Termine werden
  nicht als faellig angezeigt. Es gibt keine E-Mail- oder Push-Erinnerungen.

## Quellen

- https://api.inaturalist.org/v1/docs/
- https://www.inaturalist.org/pages/api+recommended+practices
- https://help.inaturalist.org/en/support/solutions/articles/151000169918
