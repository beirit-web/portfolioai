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
| Sprachplattform, einschließlich Vokabelbox und DeutschLive | `/projekte/sprachdienstleistungen` |

Die Sprachplattform gehört zur gemeinsamen Portfolio-Navigation.
Die interne Navigation zwischen ihren Modulen und der Plattform bleibt erhalten.
Das lokale Aufnahmen-Archiv von DeutschLive verwendet den relativen Projektlink.
Die Vokabelbox läuft im gemeinsamen Portfolio unter `/vokabelbox/`. Ihr Rücklink führt
direkt zu `/projekte/sprachdienstleistungen/#vokabelbox`. Der bisherige statische
Einstieg `/static/portfolio/vokabelbox-main/index.html` öffnet das vollständige Modul.
Trainer, Styles und Inhalts-Template werden mit dem Sprachplattform-Beispiel geteilt.

Shop, Vertragsgenerator und Botanic verwenden `server/assets/css/project-home.css`.
Die Sprachplattform hat dieselben Styles unter `apps/portfolio-demos/sprachdienstleistungen/assets/css/`;
beide Dateien bei einer Änderung gemeinsam aktualisieren. Ihre Hauptseite und
öffentlichen Unterseiten verwenden `partials/project_home_nav.html`. DeutschLive
pflegt den Link im React-Quellcode und muss mit `build` und `build:platform` neu
gebaut werden. Wohnungssuche verwendet ihre lesbare Erweiterung `navigation.js`.

Browserprüfungen mit temporären Datenbanken:

```bash
npm --prefix frontend run test:browser -- housing-navigation.spec.cjs housing-responsive.spec.cjs project-home.spec.cjs
npm --prefix frontend run test:browser -- vokabelbox.spec.cjs portfolio-module.spec.cjs
npm --prefix frontend run test:vokabelbox -- project-home.spec.cjs deutschlive.spec.cjs
```

Die Tests prüfen Klicks aus Haupt- und Unterseiten, richtige Zielseiten und die
Bedienung auf Handy und Desktop. Die Zielseite der Sprachplattform wird bei der isolierten Modulprüfung
im Browsertest abgefangen. Das gemeinsame Portfolio verwendet den lokalen Projektlink.
