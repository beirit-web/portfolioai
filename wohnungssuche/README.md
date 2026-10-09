# Wohnungsassistent Bodensee

Django-MVP fuer gespeicherte Wohnungssuchen, Fake-Provider, Matching, Trefferstatus und E-Mail-Benachrichtigungen.

## Entwicklung

Die veröffentlichte `.env` enthält ausschließlich fiktive Musterdaten und stimmt
mit `.env.example` überein. Lokale Varianten wie `.env.local`, `.env.production`
und `.env.original`, Datenbanken und Backups bleiben ignoriert. Echte Zugangsdaten
gehören nicht in die Portfolio-Demo.

```bash
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py createsuperuser
../.venv/bin/python manage.py runserver 127.0.0.1:8001
```

Die App liegt danach unter:

```text
http://127.0.0.1:8001/
```

## Suche ausfuehren

```bash
../.venv/bin/python manage.py run_housing_search
```

Optional mit E-Mail-Versand fuer neue Treffer:

```bash
../.venv/bin/python manage.py run_housing_search --send-email
```

Echte Anbieter sind bewusst noch nicht aktiv. Vor jeder automatischen Anbindung muessen API, RSS, E-Mail-Suchauftrag, Nutzungsbedingungen oder eine manuelle Importoption geprueft werden.
