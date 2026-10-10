# PayPal als Portfolio-Beispiel

Das öffentliche Portfolio verarbeitet keine Zahlungen. `PORTFOLIO_DEMO_MODE = True`
ist im Code gesetzt und lässt sich durch eine alte `.env` oder Zugangsdaten nicht
abschalten. Checkout-, Capture-, Cancel- und Status-Endpunkte antworten im Demo-Modus
mit HTTP 404, ohne Zahlungsdaten zu ändern oder PayPal aufzurufen. Spendenlinks und
Banküberweisungen sind deaktiviert. Der Client prüft den Demo-Modus zusätzlich vor
jeder Netzwerkoperation.

Die Spendenoberfläche ist ausgeblendet. Alte Spenden- und Zahlungsadressen
leiten zur Projektübersicht unter `/projekte` weiter.

Die Implementierung zeigt als Codebeispiel, wie serverseitig festgelegte Beträge,
EUR, interne Referenzen, Idempotenz und Capture-Antworten geprüft werden. Reale
Konten, Empfänger, Client-IDs und Secrets gehören nicht in dieses Repository.

## Isolierte Sandbox-Tests

Die Tests verwenden `override_settings(PORTFOLIO_DEMO_MODE=False, ...)` mit
fiktiven Sandbox-Zugangsdaten und gemockten Provider-Antworten. Es entstehen keine
echten Netzwerkaufrufe oder Zahlungen. Eine separate lokale Testkonfiguration
kann dieselben Einstellungen verwenden:

```python
PORTFOLIO_DEMO_MODE = False
PAYPAL_INVOICE_CHECKOUT_ENABLED = True
PAYPAL_MODE = "sandbox"
PAYPAL_CURRENCY = "EUR"
PAYPAL_CLIENT_ID = "sandbox-example-client-id"
PAYPAL_CLIENT_SECRET = "sandbox-example-client-secret"
```

Die Beispieldaten funktionieren nicht als Zugangsdaten. Der Backend-Client
akzeptiert ausschließlich `sandbox`; jeder andere Modus wird vor dem ersten
Provider-Aufruf abgelehnt. Live-Zahlungen sind in diesem Portfolio nicht vorgesehen.

## Beispielablauf

1. Eine fiktive Zahlungsanforderung wie `DEMO-INV-2026-001` mit `49.00 EUR` anlegen.
2. Das Backend erstellt in einem isolierten Sandbox-Test eine Bestellung mit
   Betrag und Referenz aus der Zahlungsanforderung; Frontend-Beträge werden ignoriert.
3. Nach Sandbox-Zustimmung prüft das Backend Capture-Status, Betrag, Währung und
   Referenz. Erst dann wird die fiktive Anforderung als bezahlt markiert.
4. Abbrüche lassen die Zahlungsanforderung offen. Wiederholte Capture-Anfragen
   liefern den bereits gespeicherten Abschluss.

DeutschLive-Billing folgt derselben Demo-Sperre. Stripe-Testbeispiele verlangen
`sk_test_`-Zugangsdaten und weisen Events mit `livemode=true` zurück. PayPal-
Subscription-Webhooks sind nur ein vorbereitetes Sandbox-Codebeispiel; sie
aktivieren keine Abonnements.
