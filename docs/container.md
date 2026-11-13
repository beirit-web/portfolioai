# Portfolio-Container

Das Dockerfile baut Portfolio, DeutschLive und Wohnungssuche mit Node 22 und
liefert sie über Django, WhiteNoise und Gunicorn aus. Für `collectstatic` wird
ausschließlich `server/.env.example` verwendet. Umgebungsdateien, lokale
Datenbanken, Uploads, virtuelle Umgebungen und Git-Verlauf sind vom Build-Kontext
ausgeschlossen. Das Laufzeit-Image enthält keine `.env` und benötigt keine
Zugangsdaten zum Bauen.

Lokal wird ausschließlich `server/.env.local` automatisch geladen; eine neue
Installation erstellt sie einmalig aus `.env.example`. Die Vorlage wird zur
Laufzeit nicht automatisch als Ersatz geladen. Im Container liefern
Prozessvariablen die Konfiguration; `.env.local` und alte `.env.orig` werden
nicht ins Image kopiert.

Der Asset-Build berücksichtigt auch die Django-Templates für die generierten
Tailwind-Klassen. Der gemeinsame DeutschLive-Routenkatalog liegt im Image unter
`/apps/deutsch-live/src/seo/routes.json`, damit Django ihn beim Start laden kann.

Runtime-Werte werden vom Hosting-Dienst als Prozessvariablen übergeben. Eine
vorhandene Hosting-Konfiguration und deren Secrets bleiben dort erhalten.
Mindestens erforderlich sind:

- `DJANGO_SECRET_KEY` oder `SECRET_KEY`: privater Wert, kein Sample-Platzhalter.
- `DJANGO_ALLOWED_HOSTS` oder `ALLOWED_HOSTS`, etwa `portfolio.example.com`.
- `CSRF_TRUSTED_ORIGINS`, etwa `https://portfolio.example.com`.
- `SITE_URL`, etwa `https://portfolio.example.com`.
- `DJANGO_ADMIN_URL` oder `ADMIN_URL` sowie `AUTH_URL_PREFIX`,
  `PASSWORD_RESET_INVALID_URL`, `PASSWORD_RESET_URL`, `PASSWORD_RESET_DONE_URL`,
  `PASSWORD_RESET_CONFIRM_PREFIX`, `PASSWORD_RESET_COMPLETE_URL`.

Die Auth-Pfade können alternativ mit `DJANGO_`-Präfix angegeben werden.
Öffentlich freigegebene Kontaktangaben kommen aus der vorhandenen Runtime-
Konfiguration; Zugangsdaten gehören weder in Dateien dieses Repositories noch
in Docker-Build-Argumente.

Der Container verwendet `/code`, statische Dateien unter `/code/staticfiles`,
Port `8000` und standardmäßig `DB_PATH=/data/db.sqlite3`,
`DB_BACKUP_PATH=/data/db_backups`, `MEDIA_ROOT=/data/media`. Für persistente
Daten muss `/data` auf einem Volume liegen. Ein vorhandener Datenbankpfad muss
beibehalten werden. `PORT`, `WEB_CONCURRENCY` und `GUNICORN_THREADS` sind
konfigurierbar; Standard ist ein Worker mit vier Threads.

Der Einstiegspunkt bereitet nur die konfigurierten Datenverzeichnisse und
SQLite-Dateien vor und wechselt anschließend zum Benutzer `app` (UID 10001).
Der Image-Build stellt lesbare Rechte für den öffentlichen Anwendungscode her
und prüft Django-Start, Konfiguration und Template-Zugriff bereits als UID 10001.
Dabei werden ausschließlich die fiktive Vorlage und temporäre Datenpfade verwendet.
Vor ausstehenden Migrationen sichert er eine vorhandene Datenbank mit der
SQLite-Backup-API. Sicherungen werden nicht automatisch gelöscht. Schlägt die
Sicherung fehl, startet keine Migration. Danach startet Gunicorn.

HTTPS wird am vertrauenswürdigen Reverse-Proxy terminiert, der
`X-Forwarded-Proto: https` setzt. HTTP-Healthchecks müssen ebenfalls diesen
Header und einen erlaubten Host senden. Debug-Modus, externer Mailversand,
Uploads, lokale Kontoaktivierung und KI-Dienste bleiben im Container deaktiviert.
Der Upload-Schalter verhindert auch das Dekodieren und Speichern von Profilbildern
bei der Registrierung, selbst wenn eine Datei direkt per HTTP eingereicht wird.
Das Mail-Backend verwirft Nachrichten ohne Ausgabe ihrer Inhalte in Logs.
Zahlungen und Billing-Webhooks bleiben durch den vorhandenen Anwendungscode
deaktiviert.

Der Container erzwingt die Content Security Policy. Eingebettete Skripte aus
den Django-Templates erhalten pro Antwort einen zufälligen Nonce; JavaScript
in HTML-Ereignisattributen und Skripte ohne passende Freigabe werden blockiert.
Inline-CSS bleibt für die bestehenden Oberflächen erlaubt. Eine eigene
`CONTENT_SECURITY_POLICY` muss für Template-Skripte den Platzhalter
`'nonce-{nonce}'` enthalten. Dynamisches HTML darf nicht unabhängig vom
zugehörigen CSP-Header zwischengespeichert werden. Die Browserprüfungen laufen
ebenfalls mit aktiv erzwungener CSP und prüfen erlaubte sowie blockierte Skripte.

Ein Build mit `docker build -t portfolio-demo .` erzeugt ausschließlich ein
Image. Dieses Repository enthält keinen automatischen Deployment-Workflow.
Ein konkretes Hosting-Ziel wird nur durch eine ausdrücklich autorisierte
Bereitstellung außerhalb des öffentlichen Beispielcodes festgelegt.
