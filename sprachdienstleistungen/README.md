# Sprachliche Begleitung

DeutschLive ist unter `/deutschlive/` als Lernbereich dieser Plattform integriert,
neben der Vokabelbox unter `/vokabelbox/`. Anmeldung, Registrierung, Profil,
Passwortverwaltung, Kontolöschung und Sessionablauf nutzen das Plattformkonto.
Dialoge, Quiz, Schreibübungen und Lernfortschritt werden von der lokalen Django-App
`lessons` verarbeitet. Sie basiert auf dem bisherigen eingebetteten Beirit-Modul;
die eigene Accountverwaltung wurde durch die Plattformanmeldung ersetzt.
Der separate DeutschLive-Backend-Stand unter `apps/deutsch-live/backend` wird für
diese integrierte Demo nicht verwendet.

Frontend für die lokale Demo vom Repository-Stamm aus bauen:
`npm --prefix apps/deutsch-live/frontend run build:platform`.
Der Build liegt in `assets/deutschlive-dist` und wird vom bestehenden Dockerfile
mitgenommen. Anschließend `python manage.py migrate` und `collectstatic` ausführen.
Die Lerninhalte werden durch die Lessons-Migrationen angelegt; bestehende
Plattformnutzer erhalten ihr Lernprofil bei der ersten Verwendung.

Eigene Audiodateien bleiben in IndexedDB im Browser. Es gibt keinen Audio-Upload
und keine Synchronisierung. Die neue Sammlung verwendet eine eigene Datenbank
`sprachplattform-deutschlive-recordings-v1`, damit alte und neue Nutzerkennungen
nicht vermischt werden. Alte lokale Sammlungen bleiben in Beirit über
`/deutschlive/recordings-archiv` zum Herunterladen erreichbar. Dateien müssen im
neuen Lernbereich erneut hinzugefügt werden. Alte Beirit-Lernkonten und deren
Serverdaten bleiben erhalten und werden nicht automatisch in die separate
Plattformdatenbank übernommen.

Prüfungen: `python manage.py test lessons.tests pages.tests_vokabelbox` sowie vom
Repository-Stamm `npm --prefix frontend run test:vokabelbox` (inklusive DeutschLive).

## Portfolio und Repository

Quellcode-Ziel ist ausschließlich
`git@github.com:beiritdigital/angefangenes-portfolio.git`. Frühere Hosting- und
DNS-Werte wurden durch Musterdaten unter `example.invalid` ersetzt.
Die Hosting-Dateien dienen als Architekturbeispiele. Automatische Deployments
und die Skripte für Deployment, Mail-Secrets und Secret-Import sind deaktiviert.
Bewusst veröffentlichte Angaben in Kontakt und Über mich bleiben erhalten.

## Lokal starten

Python 3.13 oder neuer verwenden. In diesem Verzeichnis:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Für die lokale Demo `DJANGO_ENV=local`, `DJANGO_DEBUG=True`,
`DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver` und
`EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` verwenden.
Anfragen und Passwort-Reset-Mails werden damit auf der Konsole ausgegeben.
Echte SMTP-, Hosting-, Zahlungs- und Administratordaten gehören nicht in die Demo.
`.env`, SQLite-Dateien, Medien und Backups bleiben lokal und werden ignoriert.

Statische Dateien liegen unter `assets/`, Templates unter `templates/pages/`.
Der lokale Frontend-Build erfolgt vom Repository-Stamm aus:

```bash
npm --prefix apps/deutsch-live/frontend ci
npm --prefix apps/deutsch-live/frontend run build:platform
```

## Prüfen

```bash
python manage.py check
python manage.py test pages.tests_domain_isolation pages.tests_vokabelbox lessons.tests
python bin/check_deploy_isolation.py
```

Der Isolationscheck prüft die Musterkonfiguration. Er verbindet sich mit keinem
Hosting-Konto. `bin/fly-deploy-local.sh`, `bin/fly-secrets-import.sh` und
`bin/set-mail-secrets.sh` brechen mit einer Portfolio-Meldung ab.
[Hosting-Architektur und Datenmigration als Muster](docs/fly-migration.md).

## Vokabelbox als Lernmodul

Die Route `/vokabelbox/` enthält die integrierte Vokabelbox mit Wortsuche, Artikelfilter, Favoriten, Gelernt-Markierungen und Artikel-Quiz. Sie ist über die Navigation und die Funktionsübersicht der Startseite erreichbar. Die Quellen liegen in `templates/pages/vokabelbox.html` und `assets/vokabelbox/`.

Lernstand und Favoriten bleiben lokal im Browser. Der Speicher ist nach Gastnutzung und Benutzerkonto getrennt; es gibt keine Synchronisierung zwischen Geräten. Ist der Browserspeicher deaktiviert, funktioniert das Modul für die aktuelle Sitzung weiter.
