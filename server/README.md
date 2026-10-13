# Gemeinsamer Portfolio-Server

Django stellt Portfolio, Konten, Kontaktformular und die Demos bereit. Es gibt
keine zusätzlich zu startenden Projekt-Backends.

Vom Repository-Stamm:

```bash
server/.venv/bin/python server/manage.py migrate
server/.venv/bin/python server/manage.py runserver
```

Vorher die Frontends gemäß [README](../README.md) bauen.
Demos: `/deutschlive/`, `/vokabelbox/`, `/wohnungssuche/`, `/botanic/`, `/shop/`,
`/vertragsgenerator/` und die statische Notenrechner-Demo.

Die Beispielkonfiguration liest `server/.env`; öffentliche Werte bleiben fiktiv.
Konten, Datenbanken und lokale Dateien gehören nicht in Git. Zahlungen und
Billing-Webhooks sind deaktiviert. Die alten Dienstleistungs-/Rechnungsrouten,
Hosting-Dateien und Exportwerkzeuge sind archiviert. Historische Tabellenmodelle
bleiben für bestehende lokale Datenbanken erhalten.

[Architektur](../docs/architecture.md) · [Prüfungen](../docs/checks.md) · [Lizenz](LICENSE)
