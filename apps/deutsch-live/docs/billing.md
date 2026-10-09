# DeutschLive-Billing als Portfolio-Demo

Zahlungen und Billing-Webhooks sind im öffentlichen Projekt deaktiviert.
`PORTFOLIO_DEMO_MODE = True` steht im Code und wird durch keine ENV-Variable
ausgeschaltet. Vorhandene Provider-Zugangsdaten aktivieren deshalb keinen Checkout.
`GET /api/billing/status/` meldet beide Provider als nicht konfiguriert und als Demo.
Checkout antwortet mit HTTP 501 und `code=portfolio_demo`; Stripe- und PayPal-
Webhooks antworten mit HTTP 404. Dabei werden keine Provider aufgerufen,
Subscriptions angelegt oder Events gespeichert.

## Stripe-Testbeispiel

Die Implementierung bleibt als überprüfbares Codebeispiel erhalten. Nur eine
isolierte Testkonfiguration darf `PORTFOLIO_DEMO_MODE=False` setzen. Die zugehörigen
Tests verwenden Mock-Antworten und fiktive Werte:

```env
STRIPE_SECRET_KEY=sk_test_example_not_a_real_key
STRIPE_WEBHOOK_SECRET=whsec_example_not_a_real_secret
STRIPE_WEBHOOK_TOLERANCE_SECONDS=300
STRIPE_PRICE_PREMIUM_MONTHLY=price_example
STRIPE_API_BASE=https://api.stripe.com/v1
BILLING_SUCCESS_URL=https://languages.example.com/dashboard?checkout=success
BILLING_CANCEL_URL=https://languages.example.com/dashboard?checkout=cancel
```

Diese Werte sind Musterdaten. Ein Stripe-Codebeispiel darf nur Testzugangsdaten
mit `sk_test_` und die offizielle API-Adresse verwenden. Der Backend-Code erstellt
eine Checkout-Session im Subscription-Modus und eine lokale Subscription mit
Status `pending`. Erst ein verifiziertes Testevent aktiviert die Subscription.
Live-Zugangsdaten und Events mit `livemode=true` werden zurückgewiesen.

Der Webhook-Code prüft die HMAC-Signatur, Zeitstempel und Wiederholungen. Die
Beispiele decken `checkout.session.completed` sowie angelegte, geänderte und
beendete Subscriptions ab. Status und Laufzeiten werden ausschließlich auf dem
Server geändert.

## Vorbereitetes PayPal-Sandbox-Beispiel

```env
PAYPAL_CLIENT_ID=sandbox_example_client_id
PAYPAL_CLIENT_SECRET=sandbox_example_client_secret
PAYPAL_PLAN_PREMIUM_MONTHLY=P-EXAMPLE
PAYPAL_WEBHOOK_ID=WH-EXAMPLE
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

Auch diese Werte sind fiktiv. Das Codebeispiel liefert eine vorbereitete Payload,
erstellt aber keine echte PayPal-Subscription. Außerhalb des Demo-Modus ist nur
die Sandbox-Adresse zulässig. Ein vorbereiteter Sandbox-Webhook kann Events
idempotent speichern; er aktiviert keine Subscription und bietet noch keine
PayPal-Signaturverifikation. Der öffentliche Portfolio-Modus sperrt ihn vollständig.

## Prüfung

```sh
python manage.py test lessons.tests.test_billing
```

Die Tests prüfen insbesondere, dass vorhandene oder live markierte Musterdaten
die Demo-Sperre nicht umgehen und weder Netzwerkaufrufe noch Datenänderungen
verursachen. Separate Sandbox-Tests verifizieren die Beispielimplementierung
mit gemockten Antworten.
