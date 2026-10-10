# Wohnungssuche als Portfolio-Demo

Dieses Verzeichnis enthält den demonstrativen Django-MVP für gespeicherte
Wohnungssuchen, fiktive Anbieter, Matching, Trefferstatus und lokale
E-Mail-Benachrichtigungen. Es gehört wie die anderen Projektquellen unter
`apps/portfolio-demos/`.

## Gemeinsames Portfolio

Der Projektbericht liegt unter `/projekte/wohnungssuche-bodensee`. Die aktive
React-Demo wird vom gemeinsamen Portfolio-Server unter
`/static/portfolio/wohnungssuche/index.html` bereitgestellt. Ihre Dateien liegen in
`server/assets/portfolio/wohnungssuche/`, die Demo-API in `server/pages/`.
Dieser Django-MVP dokumentiert einen zusätzlichen Backend-Stand und ersetzt
nicht den bestehenden React-Build.

Das gemeinsame Portfolio wird vom Repository-Stamm mit
`server/.venv/bin/python server/manage.py runserver` gestartet.

## Den Django-MVP lokal prüfen

Im Verzeichnis `apps/portfolio-demos/wohnungssuche/`:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python manage.py check
.venv/bin/python manage.py test
```

Für eine separate lokale Demonstration:

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 127.0.0.1:8001
.venv/bin/python manage.py run_housing_search
```

Der Befehl `run_housing_search --send-email` verwendet den konfigurierten
Mail-Backend; die Portfolio-Muster verwenden ausschließlich Konsolenausgabe.
Echte Anbieter sind nicht aktiviert. Vor einer anderen Anbindung sind API,
RSS, Nutzungsbedingungen oder ein manueller Import gesondert zu prüfen.

Die veröffentlichten `.env`- und `.env.example`-Dateien enthalten identische
fiktive Musterdaten. Lokale Overrides, Datenbanken, Medien und virtuelle
Umgebungen bleiben ignoriert. Beim Verschieben wurden vorhandene lokale
Dateien erhalten.
