# Wohnungssuche

Die aktive React/Preact-Oberfläche liegt in `frontend/`; die persistente API
und ihre Eigentümerprüfungen liegen in `server/pages/housing_api.py`.
Der frühere zusätzliche Django-MVP ist extern archiviert.

```bash
npm --prefix frontend ci
npm --prefix frontend run build:housing
server/.venv/bin/python server/manage.py migrate
server/.venv/bin/python server/manage.py runserver
```

Einstieg: `http://127.0.0.1:8000/wohnungssuche/`. Der Build nutzt das gemeinsame
Vite-Werkzeugpaket und schreibt nach `server/assets/portfolio/wohnungssuche/`.
Für Entwicklung: `npm --prefix apps/portfolio-demos/wohnungssuche/frontend run dev`.

Unter `/wohnungssuche-api/` liegen Registrierung, Anmeldung, Abmeldung,
Suchprofile, Suchorte, Beispielangebote und Quellen. Änderungen prüfen den
Eigentümer. Abmeldung sperrt den Token; nach Anmeldung entsteht ein neuer.
Gastangebote und Konten in den Prüfungen sind fiktiv. Quellenlinks sind manuell
zu öffnen; automatische Anbieterabfragen und Benachrichtigungen sind nicht aktiviert.

Backendprüfung: `server/.venv/bin/python server/manage.py test pages.tests.test_housing_api`.
Browserprüfung: `npm --prefix frontend run test:housing`.
Die mitgelieferten [Lizenzhinweise](frontend/public/THIRD_PARTY_LICENSES.md) bleiben erhalten.
