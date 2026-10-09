# Production Email

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

Stand: 2026-07-14

DeutschLive nutzt transaktionale E-Mails fuer E-Mail-Bestaetigung und Passwort-Reset. Lokal bleibt der Console- oder LocMem-Backend-Fallback erlaubt; Production muss echte E-Mails ueber SMTP versenden.

## Production ENV

Diese Werte muessen in Production gesetzt sein:

```env
DEUTSCHLIVE_PUBLIC_URL=https://deutschlive.example.invalid
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<smtp-host>
EMAIL_PORT=587
EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<secret>
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
DEFAULT_FROM_EMAIL=noreply@languages-staging.example.invalid
CONTACT_EMAIL=kontakt@languages-staging.example.invalid
```

Wenn der Mailanbieter nur SSL auf Port 465 unterstuetzt, gilt stattdessen:

```env
EMAIL_PORT=465
EMAIL_USE_TLS=false
EMAIL_USE_SSL=true
```

`EMAIL_HOST_PASSWORD` darf niemals im Repository stehen.

## Absenderentscheidung

- `noreply@languages-staging.example.invalid` ist der empfohlene Absender fuer transaktionale Account-Mails.
- `kontakt@languages-staging.example.invalid` bleibt die sichtbare Support- und Kontaktadresse.
- Falls der Mailanbieter kein `noreply`-Postfach zulaesst, kann `DEFAULT_FROM_EMAIL=kontakt@languages-staging.example.invalid` gesetzt werden.

## DNS-Pruefung

Vor dem Public Launch muessen fuer `languages-staging.example.invalid` geprueft und dokumentiert werden:

- MX-Record ist gesetzt und zeigt auf den aktiven Mailanbieter.
- SPF erlaubt den produktiven SMTP-Anbieter.
- DKIM ist beim Mailanbieter aktiviert und im DNS veroeffentlicht.
- DMARC ist vorhanden, mindestens mit Reporting oder Quarantaene-Policy.

Beispielhafte lokale Pruefung:

```bash
python manage.py check_mail_dns --domain languages-staging.example.invalid --dkim-selector <dkim-selector>
python manage.py check_mail_dns --domain languages-staging.example.invalid --dkim-selector <dkim-selector> --json
```

Der DKIM-Selector kommt vom Mailanbieter, z. B. `default`, `mail` oder ein anbieterspezifischer Wert.

## Testablauf

Nach dem Setzen echter SMTP-Secrets:

1. `DJANGO_ENV=production python manage.py production_check --json --fail-on-warning` ausfuehren.
2. Mail-DNS pruefen:

   ```bash
   DJANGO_ENV=production python manage.py check_mail_dns --domain languages-staging.example.invalid --dkim-selector <dkim-selector>
   ```

3. Direkten SMTP-Zustelltest ausfuehren:

   ```bash
   DJANGO_ENV=production python manage.py send_test_email --to <testadresse>
   ```

4. Testnutzer registrieren und E-Mail-Bestaetigung empfangen.
5. Bestaetigungslink oder Token in der App einloesen.
6. Passwort-Reset anfordern und Mail empfangen.
7. Reset-Code einloesen und Login mit neuem Passwort pruefen.
8. Mail-Logs auf Fehler pruefen.
9. Spam-/Junk-Ordner und Absenderdarstellung pruefen.

Fuer lokale Tests ist der Command bewusst nur mit Override erlaubt:

```bash
python manage.py send_test_email --to test@example.com --allow-local-backend
```

`--allow-local-backend` beweist nur, dass der Django-Mailpfad funktioniert. Es beweist keine produktive Inbox-Zustellung.

## Aktueller Blocker

TICKET-190 kann erst abgeschlossen werden, wenn echte SMTP-Zugangsdaten und DNS-Zugriff fuer `languages-staging.example.invalid` vorliegen. Der Codepfad ist lokal getestet, aber ein produktiver Zustelltest ist ohne diese externen Daten nicht aussagekraeftig.
