# Rückkehr zur Projektstartseite

„Zur Startseite“ in einer Portfolio-Anwendung führt zu ihrer eigenen
Projektseite. Der Rückweg steht direkt in der Oberfläche zur Verfügung und
funktioniert auch bei einem direkten Aufruf einer Unterseite.

| Anwendung | Projektstartseite |
| --- | --- |
| Wohnungssuche Bodensee | `/projekte/wohnungssuche-bodensee` |
| Torten- und Kuchen-Shop | `/projekte/online-shop` |
| Vertragsgenerator | `/projekte/vertragsgenerator` |
| ENBT Botanic, einschließlich Wetter | `/projekte/enbt-botanic` |
| Sprachplattform, einschließlich Vokabelbox und DeutschLive | `https://languages-staging.example.invalid/projekte/sprachdienstleistungen` |

Die Sprachplattform läuft auf einem eigenen Host, deshalb ist ihr Link absolut.
Die interne Navigation zwischen ihren Modulen und der Plattform bleibt erhalten.
Das lokale Aufnahmen-Archiv von DeutschLive verwendet den relativen Projektlink.

Shop, Vertragsgenerator und Botanic verwenden `server/assets/css/project-home.css`.
Die Sprachplattform hat dieselben Styles unter `sprachdienstleistungen/assets/css/`;
beide Dateien bei einer Änderung gemeinsam aktualisieren. Ihre Hauptseite und
öffentlichen Unterseiten verwenden `partials/project_home_nav.html`. DeutschLive
pflegt den Link im React-Quellcode und muss mit `build` und `build:platform` neu
gebaut werden. Wohnungssuche verwendet ihre lesbare Erweiterung `navigation.js`.

Browserprüfungen mit temporären Datenbanken:

```bash
npm --prefix frontend run test:browser -- housing-navigation.spec.cjs housing-responsive.spec.cjs project-home.spec.cjs
npm --prefix frontend run test:vokabelbox -- project-home.spec.cjs deutschlive.spec.cjs
```

Die Tests prüfen Klicks aus Haupt- und Unterseiten, richtige Zielseiten und die
Bedienung auf Handy und Desktop. Die externe Zielseite der Sprachplattform wird
im Browsertest abgefangen, damit keine Live-Seite kontaktiert wird.
