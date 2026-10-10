# Wohnungssuche — Sicherheitsreview der Portfolio-Demo

Der öffentliche Portfolio-Stand verwendet synthetische Daten und lokale
Laufzeitdateien. Das historische Review vom 2026-07-26 ist am 2026-10-09 als
Portfolio-Dokument überarbeitet worden. Es beschreibt Architektur und frühere
Prüfungen, nicht den Zustand einer produktiven Website.

## Daten und Funktionen

- Bekannte Immobilienportale werden nicht gescrapt; Portal-Automation ist in
  Source-Validierung und Import-Task blockiert.
- Die Demo-Listing-API `/wohnungssuche-api/listings/` dient lokalen Beispielen.
  Suchseiten sind manuell gespeicherte Links, keine verifizierten Einzelangebote.
- Es gibt keinen automatischen Nachrichtenversand oder automatische Bewerbungen.
- Demo-Daten werden als solche markiert und nicht in Live-Kennzahlen gezählt.
- Import-Beispiele verwenden Musterquellen. Reale Postfächer, Nutzerlisten,
  Exporte und Zugangsdaten gehören nicht in das öffentliche Repository.

## Datenschutz und Zugriff

`DATA_RETENTION_DAYS` ist konfigurierbar. `cleanup_housing_data` bereinigt alte
Importprotokolle, Fehlertexte und Demo-Vorschauen. Audit-Logs speichern nur
Metadaten, keine Tokens, Passwörter oder vollständigen E-Mail-Rohdaten.
E-Mail-Zugangsdaten werden über Umgebungsvariablen referenziert; die lokale Demo
verwendet das Console-Mail-Backend.

DRF verwendet `IsAuthenticated`. Listings, Quellen, Profile, Audit-Logs, Notizen
und Termine sind nutzerbezogen oder auth-geschützt. Die Beirit-Listing-API verlangt
einen Token. Beispieltokens und Testkonten haben keine Verbindung zu echten
Nutzerkonten.

## Lokale Konfiguration

Die Demo verwendet lokale Allowed-Hosts ohne Wildcard. Produktionsartige
Konfigurationen in den Dokumenten sind Muster: sichere Cookies, HTTPS-Redirects,
begrenztes CORS und externe Secret-Verwaltung erklären die ursprüngliche
Architektur. Hosting-Zuordnungen und automatische Deployments sind deaktiviert.
Alle Pushes gehen an `git@github.com:beiritdigital/angefangenes-portfolio.git`.

Veröffentlichte `.env`-Dateien enthalten ausschließlich fiktive Musterdaten und
stimmen mit `.env.example` überein. Lokale Varianten wie `.env.local`,
`.env.production` und `.env.original`, Datenbanken, Medien, Backups,
Schlüsselfiles und Git-Historien-Bundles werden ignoriert. Der Quellcode-Audit
prüft zusätzlich veröffentlichbare Dateien:

```bash
python3 scripts/check_portfolio_data.py
```

## Backup-Architektur als Muster

SQLite-Demos erzeugen lokale konsistente Snapshots. Der bisherige PostgreSQL-
Entwurf würde `pg_dump` für Sicherungen und `psql` für einen Restore verwenden.
Snapshots und echte Zugangsdaten werden nicht im Portfolio veröffentlicht.
Ein Restore wird ausschließlich mit synthetischen Daten in einer lokalen
Testumgebung durchgeführt. Medien werden separat gesichert.

## Historische Prüfevidenz

Das ursprüngliche Review dokumentierte erfolgreiche Frontend-Builds,
Django-Checks, Migrationschecks und SQLite-Tests. Zuletzt standen darin drei
Tests der integrierten Housing-API sowie zehn Tests des Wohnungssuche-MVPs.
PostgreSQL wurde damals nicht lokal geprüft. Diese Zahlen sind historische
Nachweise und gelten nicht als neue Prüfung des Portfolio-Stands.

Aktuelle lokale Prüfungen:

```bash
python server/manage.py check
python server/manage.py test pages.tests.test_housing_api
python apps/portfolio-demos/wohnungssuche/manage.py check
python apps/portfolio-demos/wohnungssuche/manage.py test --verbosity 1
```

Externe RSS-, IMAP- oder API-Quellen sind ein Architekturbeispiel. Das öffentliche
Repository enthält dafür Muster statt echter Accounts. Externe Links können
sich ändern; lokale Demo-Daten sind kein Nachweis verfügbarer Wohnungsangebote.
