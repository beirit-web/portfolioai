# Vokabelbox

Die Vokabelbox ist als Lernmodul in die Sprachdienstleistungsplattform integriert.

Aktive Quellen:
- `server/templates/pages/vokabelbox.html`: schlanke Portfolio-Oberfläche
- `apps/portfolio-demos/sprachdienstleistungen/templates/pages/vokabelbox.html`
- `apps/portfolio-demos/sprachdienstleistungen/templates/modules/vokabelbox_content.html`: gemeinsame Wortliste und Quiz-Oberfläche
- `apps/portfolio-demos/sprachdienstleistungen/assets/vokabelbox/`
- Django-Route: `/vokabelbox/` im gemeinsamen Portfolio-Server und im zusätzlichen Sprachplattform-Beispiel.

Der gemeinsame Server bindet die Modulassets direkt aus der Sprachplattform ein.
Es gibt keine zweite Kopie des Trainers. Lernstand und Favoriten bleiben im Browser,
getrennt für Gäste und angemeldete Konten. Die Portfolio-Oberfläche bietet Deutsch,
Russisch und Ukrainisch an und führt zurück zum Bericht der Sprachplattform.

Dieser Demo-Ordner bleibt als Altbestand erhalten. Sein Einstieg und der bisherige
Link `/static/portfolio/vokabelbox-main/index.html` öffnen das aktive Lernmodul unter
`/vokabelbox/`. Die Vokabelbox wird weiterhin als Teil des Projekts Sprachdienstleistungen geführt.

Die ursprüngliche MIT-Lizenz und der Urheberhinweis stehen unverändert in `LICENSE`.
