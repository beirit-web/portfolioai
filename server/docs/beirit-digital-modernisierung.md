# Beirit Digital Modernisierung

## Umgesetzter Stand

- Marke auf der öffentlichen Startseite, Navigation, Footer und Basis-Metadaten auf `Beirit Digital` umgestellt.
- Startseite auf digitale Remote-Leistungen ausgerichtet: Web & Software, Lokalisierung, digitale Inhalte und KI-gestützte Prozesse.
- Alte Marketing-CTAs für WhatsApp, Telegram, Messenger, Anruf und Terminbuchung auf der Startseite entfernt.
- Kontaktformular als Hauptkontaktweg ergänzt. Die Anfrage wird serverseitig validiert, mit CSRF geschützt und als `ChatMessage` gespeichert.
- Preislogik auf digitale Richtpreise umgestellt.
- FAQ auf Remote-Arbeit, Smartphone-Abgrenzung, JSON/UI-Dateien, KI-Tools, Ablauf und beglaubigte Übersetzungen angepasst.
- Impressum und Nutzungsbedingungen vorsichtig angepasst: Marke aktualisiert, Messenger-Aussagen entschärft, rechtliche Kontaktdaten nicht entfernt.
- Payment-Hinweis ergänzt: PDF-Rechnung, Überweisung, PayPal und Stripe als geplante Zahlungswege.

## Entfernte oder entschärfte öffentliche Inhalte

- Smartphone-Hilfe als Leistungsbereich.
- Klassische Computerhilfe, Drucker/WLAN-Hilfe und Hardware-Fokus.
- Vor-Ort-Service als Standardangebot.
- Arzt-/Behördenbegleitung und Telefon-Dolmetschen als Hauptangebot.
- WhatsApp-/Telegram-/Messenger-CTAs auf der Startseite.
- Barzahlung oder Quittungsmodell als Hauptprozess.

## Payment-Vorbereitung

Vorbereitet in `.env.example` und `server/config/settings.py`:

- `PAYMENT_BANK_TRANSFER_ENABLED`
- `PAYPAL_BUSINESS_EMAIL`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Keine Payment-Secrets werden in Templates oder JavaScript ausgegeben. Spätere sichere Endpoints sollten serverseitig unter eigenen Views/API-Routen umgesetzt werden.

## Sicherheit und Datenschutz

- Kontaktformular nutzt Django-CSRF.
- Serverseitige Formularvalidierung und Honeypot-Feld sind aktiv.
- Es werden keine Payment-Keys im Frontend hardcodiert.
- Rechtliche Seiten wurden nicht vollständig neu formuliert, sondern nur auf die neue Positionierung und das Kontaktformular angepasst.

## Frontend-Empfehlung

Aktuell bleibt das bestehende CSS erhalten. Tailwind sollte erst in einer späteren React-Frontend-Phase geprüft werden. Für die jetzige Django-Seite ist eine komplette Tailwind-Migration nicht notwendig.

## Offene Risiken

- Übersetzungsdateien enthalten noch historische Inhalte für ältere oder weniger zentrale Bereiche. Die neue Startseite vermeidet diese i18n-Keys, aber eine spätere vollständige DE/RU-Content-Bereinigung ist sinnvoll.
- Geschützte Dashboard- und Dolmetscher-Funktionen sind technisch weiterhin vorhanden. Eine spätere Produktentscheidung sollte klären, ob sie deaktiviert, umbenannt oder archiviert werden.
- Keine Lighthouse-Messung wurde in diesem Schritt durchgeführt; HTML, CSS und Formularstruktur wurden aber mit Performance und Accessibility im Blick geändert.
