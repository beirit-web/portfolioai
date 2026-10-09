# DeutschLive production database

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

## Ziel

Production nutzt PostgreSQL. SQLite bleibt nur fuer lokale Entwicklung und Tests vorgesehen.

## Erforderliche ENV

```env
DATABASE_URL=postgresql://deutschlive:CHANGE_ME@HOST:5432/deutschlive
DATABASE_CONN_MAX_AGE=600
DATABASE_SSL_REQUIRE=true
DATABASE_BACKUP_STRATEGY=managed-postgres-snapshot
DATABASE_BACKUP_RETENTION_DAYS=14
```

`DATABASE_URL` darf nicht committed werden. Werte werden als Server-Secret gesetzt.

## Migrationen

Vor einem Release:

```bash
python manage.py migrate --check
python manage.py production_check --fail-on-warning
```

Beim Deploy muss danach `python manage.py migrate` gegen die Ziel-Datenbank laufen.

## Backup-Strategie

MVP-Standard:

- PostgreSQL-Backups werden vom Hosting-/Datenbankanbieter verwaltet.
- Retention mindestens 7 Tage, empfohlen 14 Tage.
- Vor Domain-Umschaltung oder Datenmigration wird ein frisches Backup erstellt.
- Restore muss vor Public Launch mindestens einmal in einer Staging-Umgebung getestet werden.

## Launch-Gate

`production_check` blockiert Production, wenn:

- `DEBUG=False` aktiv ist und keine PostgreSQL-Datenbank genutzt wird
- keine Backup-Strategie mit mindestens 7 Tagen Retention konfiguriert ist

Der Check warnt, wenn PostgreSQL ohne SSL-Erzwingung oder ohne Connection-Health-Checks konfiguriert ist.
