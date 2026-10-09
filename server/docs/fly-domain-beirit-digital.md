# Domain-Konfiguration als Portfolio-Muster

Frühere Hosting- und DNS-Zuordnungen wurden durch synthetische Werte ersetzt.
Dieses Dokument ist ein Architekturbeispiel, keine aktive Betriebsanweisung.

```env
SITE_URL=https://portfolio.example.invalid
DJANGO_ALLOWED_HOSTS=portfolio.example.invalid
CSRF_TRUSTED_ORIGINS=https://portfolio.example.invalid
REDIRECT_OLD_HOSTS=
PASSWORD_RESET_DOMAIN=portfolio.example.invalid
PASSWORD_RESET_USE_HTTPS=True
CONTACT_EMAIL=contact@portfolio.example.invalid
DEFAULT_FROM_EMAIL=demo@portfolio.example.invalid
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

`example.invalid` ist absichtlich nicht erreichbar. DNS-, Zertifikats-, SSH- und
Mailanbieter-Daten sind in dieser Portfolio-Version nicht hinterlegt.
Die echte lokale Demo läuft auf `http://127.0.0.1:8000` mit lokalen Allowed-Hosts
und Console-Mail-Backend. Bewusst veröffentlichte persönliche Kontaktangaben auf
der Website sind unabhängig von technischen Hosting- und Mail-Konten.

Die Host-, CSRF- und Reset-Domain müssen stets zur jeweiligen App gehören.
Muster werden mit `python3 server/bin/check_deploy_isolation.py` geprüft.
GitHub erhält ausschließlich Quellcode unter
`git@github.com:beiritdigital/angefangenes-portfolio.git`; automatische
Hosting-Deployments sind deaktiviert.
