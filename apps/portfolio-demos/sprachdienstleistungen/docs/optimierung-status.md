# Optimierung Status

Historischer Stand: 2026-08-31. Am 2026-10-09 als Portfolio-Muster anonymisiert.
Alle Hosting-Werte sind Beispiele; automatische Deployments sind deaktiviert.

## Hosting-Muster

- `languages-staging.example.invalid`: Staging/Testdeploy fuer die Sprachservice-Seite.
- `languages.example.invalid`: spaetere Produktionsdomain.
- `portfolio.example.invalid`: getrennte Beirit-Digital-Preview.

## Erledigt

- Security-Header fuer die Sprachservice-App ergaenzt.
- `Strict-Transport-Security` im früheren Stand auf `languages-staging.example.invalid` aktiviert.
- `Permissions-Policy` aktiviert.
- `Content-Security-Policy-Report-Only` aktiviert.
- `Referrer-Policy` auf `strict-origin-when-cross-origin` gesetzt.
- `/.well-known/security.txt` ergaenzt.
- `/healthz/` fuer Monitoring ergaenzt.
- Grosser Inline-CSS-Block aus der Startseite in `home-platform.css` verschoben.
- Unnoetiger Logo-Preload entfernt.
- `fly.toml` auf die Muster-App `language-demo-example` korrigiert.
- Portfolio-Runbook in `apps/portfolio-demos/sprachdienstleistungen/README.md` ergaenzt.

## Verifiziert

- `python3 bin/check_deploy_isolation.py`
- `python manage.py check`
- `python manage.py test pages.tests.PublicSecurityHeaderTests pages.tests.SeoSignalTests pages.tests.LegacyHostRedirectTests pages.tests_domain_isolation pages.tests_asset_tags`
- `npm run test`
- Historische Header-Prüfung; die heutige Muster-Domain ist nicht erreichbar.

## Naechste Sinnvolle Schritte

1. Lighthouse nach dem Deploy erneut messen.
2. CSS weiter aufraeumen: doppelte und ueberschreibende Regeln aus `home-platform.css` entfernen.
3. CSP-Report-Only auswerten und Inline-Scripts/Inline-Styles schrittweise reduzieren.
4. Monitoring fuer `/healthz/`, `/impressum/`, `/datenschutz/` und `/kontakt/` einrichten.
5. Backup-Prozess fuer SQLite pruefen: `backup_db --keep 10` ausfuehren und Restore testen.
6. SEO vor Produktionswechsel vorbereiten: Sitemap, Canonicals, Search Console und 301-Plan.

## Empfohlene Naechste Aufgabe

Als naechstes sollte `home-platform.css` refactored werden. Die Datei ist nach dem Auslagern des Inline-CSS cachbar, aber noch sehr gross und enthaelt viele alte Ueberschreibungen. Ziel: weniger CSS, weniger Style/Layout-Arbeit im Browser und weniger Lighthouse-Warnungen zu ungenutztem CSS.
