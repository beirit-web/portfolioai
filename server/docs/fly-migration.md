# Hosting-Architektur als Portfolio-Muster

Dieses Dokument beschreibt eine Beispielarchitektur des Django-Projekts.
Das öffentliche Repository hat kein aktives Hosting-Ziel. Quellcode wird nach
`git@github.com:beiritdigital/angefangenes-portfolio.git` gepusht.

## Musterkonfiguration

`server/fly.toml` zeigt eine einzelne Django-Maschine mit persistentem Volume:

- Muster-App: `portfolio-demo-example`
- Muster-Domain: `https://portfolio.example.invalid`
- SQLite: `/data/db.sqlite3`
- Medien: `/data/media`
- Backups: `/data/db_backups`
- Statische Dateien: `/code/staticfiles`

Alle Domains und App-Namen sind Platzhalter. Konfigurationen enthalten keine
Konten, Mail-Zugangsdaten, DNS-Verifizierungen oder Zahlungsdaten.

## Wichtige Architekturentscheidungen

SQLite auf einem lokalen Volume setzt eine einzelne Maschine voraus. Mehrere
unabhängige Maschinen benötigen eine gemeinsam erreichbare Datenbank, etwa
PostgreSQL. Datenbanken und Medien sind Laufzeitdaten und werden nicht als
Portfolio-Quellcode veröffentlicht.

Eine Datenmigration würde Schreibzugriffe pausieren, einen konsistenten
SQLite-Backup-Snapshot erstellen, die Integrität prüfen, den Zielprozess neu
starten und eine Anmeldung mit synthetischen Testdaten prüfen. Vor dem Austausch
wird eine lokale Sicherung erstellt. Portfolio-Demos nutzen nur Musterdaten.

## Deaktivierte Betriebsaktionen

`bin/fly-deploy-local.sh` und `bin/fly-secrets-import.sh` brechen vor jedem
Hosting-Aufruf ab. GitHub Actions enthält nur Builds und Prüfungen. Es wird kein
Hosting-Token benötigt. Für die öffentliche Demo werden weder Secrets importiert
noch Zertifikate beantragt oder DNS-Einträge geändert.

Die lokalen Prüfungen stehen in [../README.md](../README.md).
