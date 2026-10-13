# Vokabelbox

Der kleine statische Einstieg leitet auf `/vokabelbox/` im gemeinsamen Server.
Die aktiven Quellen liegen in `server/assets/vokabelbox/`,
`server/templates/modules/vokabelbox_content.html` und
`server/templates/pages/vokabelbox.html`.

Wortsuche, Artikelfilter, Favoriten, Lernmarkierungen und Quiz funktionieren lokal.
Der Browser speichert Fortschritt getrennt für Gäste und angemeldete Demo-Konten.
Prüfungen: `server/.venv/bin/python server/manage.py test pages.tests.test_vokabelbox`
und die gemeinsame Playwright-Suite.
