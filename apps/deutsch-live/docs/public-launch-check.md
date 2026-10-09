# Public Launch Check

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

Stand: 2026-07-14

Diese Checkliste ist das Gate vor einer oeffentlichen DeutschLive-Freischaltung. Sie ersetzt keinen echten Produktivtest, dokumentiert aber klar, welche Punkte lokal vorbereitet sind und welche externen Production-Daten noch fehlen.

Die auszufuellenden Launch-Nachweise stehen in [public-launch-evidence.md](public-launch-evidence.md).

## Aktueller Status

| Bereich | Status | Nachweis |
| --- | --- | --- |
| Impressum | vorbereitet | Route `/impressum`, Footer-Link, `ImpressumPage` |
| Datenschutz | vorbereitet | Route `/datenschutz`, Footer-Link, `LegalPages` |
| Nutzungsbedingungen | vorbereitet | Route `/nutzungsbedingungen`, Footer-Link, `LegalPages` |
| Kontakt | vorbereitet | Route `/kontakt`, Footer-Link, Feedbackformular |
| Footer | vorbereitet | Public-Launch-Links in `App.tsx` |
| Production Security | vorbereitet | `docs/production-security.md`, `production_check` |
| Monitoring/Logging | vorbereitet | `docs/monitoring.md`, strukturierte Logger |
| Backups | vorbereitet | `docs/production-database.md`, Production-Check-Gate |
| Rollback | vorbereitet | letzter stabiler Release, Datenbank-Backup, ENV-Snapshot |
| Redis/Rate-Limits/Channels | vorbereitet | `docs/production-redis.md`, Production-Check-Gate |
| E-Mail | blockiert | echte SMTP-Secrets und DNS-Zugriff fehlen |
| Domain/HTTPS | blockiert | echte Domain-Ziel-URL und Deployment-Zustand muessen geprueft werden |
| Produktive Kernflows | blockiert | brauchen deployed App, Domain, SMTP und Production-ENV |

## Vor Deployment

Production-ENV setzen und pruefen:

```bash
DJANGO_ENV=production python manage.py production_check --json --fail-on-warning
DJANGO_ENV=production python manage.py public_launch_report --domain languages-staging.example.invalid --dkim-selector <dkim-selector> --json
```

Pflichtbereiche:

- `DJANGO_DEBUG=false`
- explizite `DJANGO_ALLOWED_HOSTS`
- HTTPS-Origins in `DJANGO_CSRF_TRUSTED_ORIGINS`
- sichere Session- und CSRF-Cookies
- SSL-Redirect und HSTS
- PostgreSQL mit Backup-Strategie
- Redis fuer Cache, Rate-Limits und Channels
- SMTP-Mailbackend
- MX, SPF, DKIM und DMARC per `check_mail_dns`
- `DEUTSCHLIVE_PUBLIC_URL=https://...`
- Frontend-Build-Artefakte vorhanden

`public_launch_report` buendelt `production_check`, Mail-DNS-Pruefung und manuelle Production-Gates in einem JSON-Report. `ok=true` bedeutet, dass keine harten technischen Fehler gefunden wurden. `launchReady=true` ist erst erreicht, wenn auch Warnings und manuelle Production-Pruefungen erledigt sind.

## Nach Deployment

Externe Pruefung:

```bash
curl -I https://<domain>/
curl -I http://<domain>/
curl -sS https://<domain>/api/health/
DJANGO_ENV=production python manage.py public_launch_report --domain <domain> --dkim-selector <dkim-selector> --fail-on-warning
```

Erwartung:

- HTTPS liefert die App oder einen erwarteten 200/3xx-Status.
- HTTP leitet auf HTTPS weiter.
- `Strict-Transport-Security`, CSP, Permissions-Policy, Referrer-Policy und `X-Frame-Options` sind gesetzt.
- `/api/health/` liefert keine Secrets und meldet Datenbankstatus.

## Backup Und Rollback

Vor jedem Public-Launch-Deployment:

1. Aktuellen Git-Commit oder Release-Artefakt notieren.
2. Production-ENV-Snapshot im Hosting-Provider sichern, ohne Secrets ins Repository zu kopieren.
3. Frisches Datenbank-Backup erstellen oder vom Provider bestaetigen lassen.
4. Migrationen nur ausfuehren, wenn ein Restore-Pfad bekannt ist.
5. Bei Fehlern zuerst Traffic stoppen oder Maintenance Mode aktivieren.
6. Letzten stabilen Release redeployen.
7. Nur bei datenveraendernden Fehlern Datenbank aus Backup wiederherstellen.
8. `/api/health/`, Login und Kernflows nach Rollback erneut pruefen.

## Kernflows

Nach erfolgreichem Deployment manuell testen:

1. Startseite oeffnen.
2. Mobile Navigation oeffnen und schliessen.
3. Registrierung mit Testnutzer durchfuehren.
4. E-Mail-Bestaetigung empfangen und einloesen.
5. Login und Logout pruefen.
6. Passwort-Reset anfordern, Mail empfangen und neues Passwort setzen.
7. Dashboard oeffnen.
8. Quiz abschliessen und Ergebnis speichern.
9. Schreibtraining absenden.
10. Feedbackformular absenden.
11. Impressum, Datenschutz, Nutzungsbedingungen und Kontakt aus dem Footer oeffnen.
12. Dark Mode und Mobile-Layout auf Smartphone-Breite pruefen.

## Offene Blocker

- SMTP-Zugangsdaten fehlen.
- DNS-Pruefung fuer MX, SPF, DKIM und DMARC ist noch nicht produktiv durchgefuehrt.
- Echte Domain und HTTPS-Ziel-URL muessen nach Deployment geprueft werden.
- Produktive Kernflows koennen erst nach Deployment und gesetzten Secrets getestet werden.
- Backup-/Restore-Test braucht Zugriff auf die produktive Datenbank- oder Staging-Umgebung.
