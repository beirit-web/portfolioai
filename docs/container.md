# Portfolio-Container

Die geprüften Python-Versionen sind in `server/requirements.lock` festgehalten;
Container und CI installieren diese Versionen. `requirements.txt` beschreibt
die zulässigen Versionsbereiche. Bei Updates Lockdatei, Sicherheitsabgleich
und Tests gemeinsam aktualisieren.

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
Header und einen erlaubten Host senden. Debug-Modus, Uploads, lokale Kontoaktivierung und KI-Dienste bleiben im Container deaktiviert.
Externer Mailversand ist standardmäßig deaktiviert und kann für echte Konten
gezielt über `ACCOUNT_EMAIL_DELIVERY_ENABLED=true` aktiviert werden.
Der Upload-Schalter verhindert auch das Dekodieren und Speichern von Profilbildern
bei der Registrierung, selbst wenn eine Datei direkt per HTTP eingereicht wird.
Bei deaktiviertem Versand verwirft das Mail-Backend Nachrichten ohne Ausgabe
ihrer Inhalte in Logs. Registrierungen dürfen dabei keinen erfolgreichen Versand
vortäuschen: Ohne Bestätigungsversand wird kein neues Konto angelegt.
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

Die frühere Service-Website kann separat als Demo erhalten bleiben.
`LANGUAGE_SERVICES_DEMO_URL=https://languages.example.com/` konfiguriert das
HTTPS-Ziel des Links „Service-Website als Demo öffnen“ auf der Projektseite.
Der lokale Einstieg `/demos/sprachdienstleistungen/` leitet ausschließlich
GET- und HEAD-Aufrufe weiter, ohne Besucherparameter oder Formulardaten.
Das Ziel muss ohne Zugangsdaten, Query-String und Fragment konfiguriert sein.
Ohne gültiges Ziel erscheint eine Nichtverfügbarkeitsseite. Die eigenständige
Demo muss weiterhin ohne Buchungen oder aktive Zahlungsfunktionen betrieben
werden; ihre Datenbank und Dateien gehören nicht in dieses Repository.


## Echte Konten vor einer Veröffentlichung

SMTP wird ausschließlich über Runtime-Prozessvariablen konfiguriert:
`ACCOUNT_EMAIL_DELIVERY_ENABLED=true`, `EMAIL_HOST`, `EMAIL_PORT`,
`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` und genau eines
von `EMAIL_USE_TLS` oder `EMAIL_USE_SSL`. Zertifikatsprüfung bleibt aktiv.
Bei aktiviertem Versand führt der Container vor Migrationen `check_release`
aus und startet bei ungültiger Konfiguration nicht. Dieser Check stellt keine
Verbindung her und sendet keine Mail. Ein vorheriger manueller Lauf von
`python manage.py check_release --connect-mail` prüft zusätzlich TLS und
SMTP-Anmeldung, aber noch nicht die Zustellung ins Postfach.

`SITE_URL`, `ALLOWED_HOSTS` und `CSRF_TRUSTED_ORIGINS` müssen zum öffentlichen
HTTPS-Ursprung passen, beispielsweise `https://portfolio.example.com`.
`PASSWORD_RESET_DOMAIN` bleibt leer oder entspricht dessen Host.
Der lokale SMTP-Teststarter mit localhost-Links ist keine Produktionskonfiguration.
Ein privater, stabiler `DJANGO_SECRET_KEY` bleibt bei Neustarts erhalten.
Keine Zugangsdaten in Repository-Dateien oder Docker-Build-Argumenten ablegen.

Hinter einem Reverse-Proxy werden Client-Adressen nur bei explizitem Vertrauen
übernommen: `TRUSTED_PROXY_CIDRS` enthält die tatsächlich verwendeten direkten
Proxy-Peers; `CLIENT_IP_HEADER=HTTP_FLY_CLIENT_IP` verwendet bei Fly den vom
Proxy gesetzten Einzelwert. Als Alternative ist `HTTP_X_REAL_IP` möglich.
Keine allgemeine Freigabe von `0.0.0.0/0` oder `::/0`. Direkter öffentlicher
Zugriff auf Gunicorn muss ausgeschlossen sein; vorgeschaltete Proxies müssen
fremde Header überschreiben. Ungeprüfte `X-Forwarded-For`-Werte werden ignoriert.
Siehe [Fly-Headerdokumentation](https://docs.fly.io/networking/request-headers).
Vor Veröffentlichung prüfen, dass zwei externe Clients unterschiedliche
Missbrauchsbudgets erhalten und manipulierte Header keinen Bypass ermöglichen.

E-Mail-Änderungen im Profil erfordern das aktuelle Passwort. Die bisherige
Adresse wird informiert, die neue Adresse bekommt einen 30 Minuten gültigen
Einmallink. Erst dessen Bestätigung mit Passwort ändert Login und Wiederherstellung.
Alle bisherigen Sitzungen und API-Anmeldetokens werden dabei ungültig.

## Datensicherung und Abnahme

`/data` benötigt ein persistentes Volume. Für die SQLite-Konfiguration nur eine
schreibende App-Instanz verwenden, sofern keine zusätzliche Replikationslösung
getestet wurde. Migrationen sichern den vorhandenen Datenbestand vorab.
Zusätzlich `python manage.py backup_db --keep 10` regelmäßig durch den
Hosting-Scheduler ausführen und verschlüsselte Kopien außerhalb des App-Volumes
aufbewahren. Der Befehl erstellt private Dateien mit Modus 0600, prüft die
SQLite-Integrität und veröffentlicht erst danach die fertige Sicherung.
Unvollständige Dateien werden entfernt; ältere Sicherungen werden erst nach
Erfolg rotiert. Der Scheduler
und die externe Sicherung werden durch den Code nicht automatisch eingerichtet.

Zur Wiederherstellungsprobe eine Sicherung in ein getrenntes Testvolume kopieren,
`DB_PATH` auf diese Kopie setzen, `PRAGMA integrity_check` ausführen und die App
mit dieser Datenbank prüfen. Niemals die aktive Datenbank für die Probe ersetzen.
Die automatischen Tests prüfen die Wiederherstellung ausschließlich mit fiktiven
Kontodaten. Die Wiederherstellbarkeit der tatsächlichen Hosting-Sicherung muss
zusätzlich nachgewiesen werden.

Vor Freigabe offen zu prüfen:

- Container-Image bauen und `scripts/check_container.sh IMAGE` ausführen. Der
  Test erstellt und entfernt ausschließlich eigene temporäre Container und Volumes.
- Registrierung, tatsächliche Bestätigungsmail, Login, Passwort-Reset,
  E-Mail-Wechsel und Kontolöschung über den öffentlichen HTTPS-Ursprung testen.
- Mailzustellung, Spamordner und Absenderauthentifizierung beim Mailanbieter prüfen.
- Vorhandene fiktive Impressums- und Datenschutzhinweise für einen Dienst mit
  echten Konten durch freigegebene passende Texte ersetzen. Persönliche Daten
  bleiben entsprechend den Repository-Regeln außerhalb des öffentlichen Quellcodes.
- Scheduler, externe Sicherung, Wiederherstellungsprobe und Fehlerüberwachung
  auf dem konkreten Hosting nachweisen.

Diese Dokumentation veröffentlicht nichts. Eine Freigabe erfolgt erst nach
Abschluss der technischen und betrieblichen Abnahme.
