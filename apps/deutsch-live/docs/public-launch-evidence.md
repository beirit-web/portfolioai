# Public Launch Evidence

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

Stand: 2026-07-14

Dieses Dokument ist die Nachweisvorlage fuer den echten Public Launch. Es wird erst final ausgefuellt, wenn Production-ENV, Domain, SMTP, DNS, Datenbank, Redis und Hosting-Zugriff vorhanden sind.

## Automatisierte Reports

| Check | Command | Ergebnis | Datum | Nachweis |
| --- | --- | --- | --- | --- |
| Production Settings | `DJANGO_ENV=production python manage.py production_check --json --fail-on-warning` | offen | offen | offen |
| Public Launch Report | `DJANGO_ENV=production python manage.py public_launch_report --domain languages-staging.example.invalid --dkim-selector <selector> --fail-on-warning` | offen | offen | offen |
| Mail DNS | `DJANGO_ENV=production python manage.py check_mail_dns --domain languages-staging.example.invalid --dkim-selector <selector>` | offen | offen | offen |
| SMTP Zustellung | `DJANGO_ENV=production python manage.py send_test_email --to <testadresse>` | offen | offen | offen |

## Production ENV

| Bereich | Erwartung | Status | Nachweis |
| --- | --- | --- | --- |
| `DJANGO_DEBUG` | `false` | offen | offen |
| `DJANGO_ALLOWED_HOSTS` | echte Domain(s) | offen | offen |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | HTTPS-Origin(s) | offen | offen |
| Cookies | Session und CSRF secure | offen | offen |
| Datenbank | PostgreSQL mit SSL | offen | offen |
| Redis | Cache, Rate-Limits und Channels | offen | offen |
| SMTP | echter SMTP-Backend | offen | offen |
| Public URL | HTTPS-URL | offen | offen |

## Mail

| Bereich | Erwartung | Status | Nachweis |
| --- | --- | --- | --- |
| Absender | `noreply@languages-staging.example.invalid` oder bewusst `kontakt@languages-staging.example.invalid` | offen | offen |
| MX | Mailanbieter aktiv | offen | offen |
| SPF | SMTP-Anbieter erlaubt | offen | offen |
| DKIM | Provider-Selector gesetzt | offen | offen |
| DMARC | Policy vorhanden | offen | offen |
| Registrierungsmail | Testnutzer empfaengt Bestaetigung | offen | offen |
| Passwort-Reset | Testnutzer empfaengt Reset-Mail | offen | offen |

## Domain Und HTTPS

| Check | Erwartung | Status | Nachweis |
| --- | --- | --- | --- |
| `curl -I https://<domain>/` | 200 oder erwartete Weiterleitung | offen | offen |
| `curl -I http://<domain>/` | Redirect auf HTTPS | offen | offen |
| HSTS | `Strict-Transport-Security` gesetzt | offen | offen |
| CSP | CSP oder bewusst dokumentierte Policy | offen | offen |
| Permissions Policy | gesetzt | offen | offen |
| Health | `/api/health/` ohne Secrets | offen | offen |

## Produktive Kernflows

| Flow | Erwartung | Status | Nachweis |
| --- | --- | --- | --- |
| Startseite | laedt mobil und desktop | offen | offen |
| Mobile Navigation | Menue oeffnet/schliesst korrekt | offen | offen |
| Registrierung | Account wird erstellt | offen | offen |
| E-Mail-Bestaetigung | Token/Link funktioniert | offen | offen |
| Login/Logout | Session und Auth-Token funktionieren | offen | offen |
| Passwort-Reset | neues Passwort funktioniert | offen | offen |
| Dashboard | Fortschritt sichtbar | offen | offen |
| Quiz | Ergebnis wird gespeichert | offen | offen |
| Schreibtraining | Antwort wird gespeichert/korrigiert | offen | offen |
| Feedback | Formular sendet ohne falsche Fehlermeldung | offen | offen |
| Rechtliche Seiten | Impressum, Datenschutz, Nutzungsbedingungen, Kontakt erreichbar | offen | offen |
| Dark Mode | Statusmeldungen und Formulare lesbar | offen | offen |

## Backup Und Rollback

| Check | Erwartung | Status | Nachweis |
| --- | --- | --- | --- |
| aktuelles Backup | vor Launch erstellt oder Provider-Backup bestaetigt | offen | offen |
| Restore-Pfad | in Staging oder Provider-Konsole geprueft | offen | offen |
| ENV-Snapshot | gesichert, ohne Secrets im Repository | offen | offen |
| stabiler Release | Commit/Image notiert | offen | offen |
| Rollback-Probe | Health, Login und Kernflow nach Rollback pruefbar | offen | offen |
