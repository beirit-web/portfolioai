# Beirit Digital — Portfolio-Backend

Dieses Django-Projekt gehört zum öffentlichen Portfolio. Der Quellcode wird nach
`git@github.com:beiritdigital/angefangenes-portfolio.git` gepusht. Hosting-Dateien
zeigen ausschließlich Muster; Deployment und Secret-Import sind deaktiviert.
Kontakt und Über mich enthalten die bewusst veröffentlichten Angaben des Autors.

## Lokal starten

Python 3.13 oder neuer verwenden. In `server/`:

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
Die `.env` und lokale Laufzeitdaten bleiben unversioniert. Keine echten SMTP-,
Hosting-, Zahlungs- oder Administratorkonten in eine Demo übernehmen.

Das React/Vite-Frontend liegt unter `../frontend/`:

```bash
npm --prefix ../frontend ci
npm --prefix ../frontend run build
```

Assets liegen unter `assets/`, Django-Templates unter `templates/pages/`.

## Demo und Checks

Zahlungsfunktionen sind für die Portfolio-Demo abgesichert. Echte PayPal- oder
Stripe-Zugangsdaten gehören nicht ins Repository. E-Mails werden lokal auf der
Konsole ausgegeben. Datenbanken, Medien, Exportdateien und Backups bleiben lokal.

```bash
python manage.py check
python manage.py test
python bin/check_deploy_isolation.py
```

Der letzte Check prüft ausschließlich die Musterdaten in den Hosting-Dateien.
`bin/fly-deploy-local.sh` und `bin/fly-secrets-import.sh` brechen ohne
Hosting-Aufruf ab. Die [Hosting-Dokumentation](docs/fly-migration.md) erläutert
die Beispielarchitektur.
