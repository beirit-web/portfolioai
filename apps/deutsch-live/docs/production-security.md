# DeutschLive production HTTPS and cookies

Portfolio-Muster: Domains und Konten sind synthetisch. Die folgenden
Production-Abläufe dokumentieren die Architektur; sie aktivieren keinen
Livebetrieb in diesem Repository. Automatische Deployments sind deaktiviert.

## Pflichtwerte

```env
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=deutschlive.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://deutschlive.example.com
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true
DJANGO_SECURE_HSTS_PRELOAD=false
DJANGO_USE_X_FORWARDED_PROTO=true
DEUTSCHLIVE_PUBLIC_URL=https://deutschlive.example.com
DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY=false
```

`DJANGO_SECURE_HSTS_PRELOAD` bleibt erst `false`, bis Domain, Subdomains und Rollback-Plan stabil sind.

## Browser Security Headers

DeutschLive nutzt Djangos `SecurityMiddleware` plus `lessons.middleware.SecurityHeadersMiddleware`.

Zentrale Header:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` oder im Development `Content-Security-Policy-Report-Only`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`

ENV-Schalter:

```env
DJANGO_SECURE_REFERRER_POLICY=same-origin
DJANGO_CONTENT_SECURITY_POLICY=
DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY=false
DJANGO_PERMISSIONS_POLICY=accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
DJANGO_CROSS_ORIGIN_OPENER_POLICY=same-origin
```

Wenn `DJANGO_CONTENT_SECURITY_POLICY` leer bleibt, baut `settings.py` eine Default-CSP.

Development:

- CSP laeuft standardmaessig im Report-Only-Modus, damit Vite/HMR und lokale Tests nicht hart blockiert werden.
- `connect-src` erlaubt lokale Dev-Origins und WebSocket-Origins.

Production:

- CSP soll enforcement sein: `DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY=false`.
- Externe Quellen werden nur bewusst in `DJANGO_CONTENT_SECURITY_POLICY` ergaenzt.
- `production_check` meldet fehlende CSP-, Permissions-Policy- oder Opener-Policy-Konfiguration als Fehler.

## Launch-Gate

`production_check` blockiert Production, wenn:

- HTTPS-Redirect deaktiviert ist
- Session- oder CSRF-Cookies nicht secure sind
- HSTS kuerzer als ein Jahr ist
- CSRF-Origins fehlen oder nicht auf HTTPS zeigen
- kein Proxy-SSL-Header fuer den HTTPS-Terminator gesetzt ist
- Browser-Security-Header fehlen

## Externe Pruefung

Nach Deployment:

```bash
curl -I https://deutschlive.example.com/
curl -I http://deutschlive.example.com/
python manage.py production_check --fail-on-warning
```

Erwartung:

- HTTPS liefert `200` oder die App-Startseite.
- HTTP leitet auf HTTPS weiter.
- Cookies haben `Secure`.
- `Strict-Transport-Security` ist gesetzt.
- CSP, Permissions-Policy, Referrer-Policy und Cross-Origin-Opener-Policy sind gesetzt.
