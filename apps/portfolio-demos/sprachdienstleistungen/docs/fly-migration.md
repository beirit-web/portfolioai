# Hosting und Datenmigration als Portfolio-Muster

Dieses Dokument zeigt die Architektur der eigenständigen Sprachplattform.
Quellcode-Ziel ist `git@github.com:beiritdigital/angefangenes-portfolio.git`.
Hosting-Aufrufe, automatische Deployments und Secret-Import sind deaktiviert.

## Beispielkonfiguration

- Muster-App: `language-demo-example`
- Staging-Muster: `https://languages-staging.example.invalid`
- Produktions-Muster: `https://languages.example.invalid`
- Muster-Host der Plattform: `languages-host.example.invalid`
- SQLite: `/data/db.sqlite3`
- Medien: `/data/media`
- Backups: `/data/db_backups`

Die TOML- und Render-Dateien enthalten ausschließlich Muster. Der verschachtelte
Workflow zeigt nur einen manuellen Repository-Hinweis; er enthält keinen
Deployment-Schritt. `bin/fly-deploy-local.sh`, `bin/fly-secrets-import.sh` und
`bin/set-mail-secrets.sh` verweigern operative Aufrufe.

## Beispiel einer Datenmigration

Die Plattform speichert lokale Nutzerkonten, Profile, Chat-Nachrichten,
Sprachservice-Anfragen und Lernstände in SQLite. Diese Daten gehören nicht in das
öffentliche Portfolio. Eine Demo verwendet nur synthetische Testdaten.

Eine Migration würde Schreibzugriffe pausieren, über die SQLite-Backup-API eine
konsistente Sicherung erzeugen, die Ziel-Datenbank vor dem Austausch sichern und
anschließend den Integritätscheck ausführen. Nach dem Austausch werden die
Django-Prozesse neu gestartet. Datensatzanzahlen, Login und ausgewählte Lernflows
werden mit Testkonten geprüft. Bei Fehlern wird der vorherige Snapshot
zurückgespielt. Medien und Backup-Dateien bleiben außerhalb des Quellcodes.

SQLite auf einem lokalen Volume passt zu einer einzelnen Maschine. Horizontales
Skalieren erfordert eine gemeinsam erreichbare Datenbank wie PostgreSQL.

## Lokale Prüfung

```bash
python3 bin/check_deploy_isolation.py
python manage.py check
python manage.py test pages.tests_domain_isolation pages.tests_vokabelbox lessons.tests
```

Lokales Setup steht in [../README.md](../README.md). E-Mails laufen in der Demo
über das Console-Backend; Domains unter `example.invalid` sind nicht erreichbar.
