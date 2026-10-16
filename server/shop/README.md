# Beirit Backstube

Django-Storefront unter `/shop/` in der bestehenden App `shop`.
Die alte URL `/static/portfolio/online-shop/index.html` leitet dorthin weiter.
Die bisherigen React-Quellen und Produktbilder bleiben erhalten; die neue
Storefront verwendet Django-Templates und kein React-Fallback-Sortiment.

## Lokal starten

Installation und gemeinsamer Serverstart stehen in der
[Hauptanleitung](../../README.md#lokal-starten).

Aufruf: <http://localhost:8000/shop/>. Produkte und Anfragen werden ueber den
bestehenden Django-Admin gepflegt. Die erste Shop-Migration legt acht
Beispielprodukte an. Migration `0003` ergaenzt sieben ganze Kuchen und sieben
Torten mit eigenen Bildern: insgesamt 22 Artikel. Die neue Kategorie `Kuchen`
unterscheidet ganze Kuchen von Kuchenstuecken. Bestehende Produkte und
Bestellungen bleiben bei der
Umstellung erhalten. Die Portfolio-Migration aendert die bisherige Demo-URL;
eigene Beschreibungstexte werden nicht ueberschrieben.

Die 14 neuen Produktbilder liegen unter `static/shop/products/` und wurden mit
dem eingebauten Bildgenerator erstellt. Promptset und Bildzuordnung sind dort
in `README.md` dokumentiert. Bilder, Preise, Zutaten und Allergene sind
Beispieldaten, keine verifizierten Angaben eines Lebensmittelbetriebs.

Die Auslieferung nutzt kleinere WebP-Kandidaten für Katalog, Produktdetails
und Warenkorb. Originaldateien und gespeicherte Bild-URLs bleiben erhalten;
eigene Bild-URLs ohne Kandidaten werden unverändert ausgegeben. Kandidaten
und das zugehörige Manifest lassen sich reproduzierbar neu erstellen:

```bash
# vom Repository-Verzeichnis, mit Pillow in der vorhandenen Umgebung
server/.venv/bin/python server/shop/scripts/build_responsive_images.py
```

Der dekorative Tischhintergrund wird erst für Karten nahe dem sichtbaren Bereich
berechnet und nur bei geänderten Abmessungen oder einer neuen Bildquelle erneuert.

## Funktionen und Daten

- Sortiment: Suche, Kategorien, Sortierung, Produktdetails und lokale Fotos.
- Warenkorb: in der Django-Session gespeichert, bleibt beim Neuladen erhalten.
  Er ist browserbezogen und wird nicht zwischen Geraeten synchronisiert.
- Mengen: 1 bis 20 je Artikel, maximal 20 verschiedene Artikel. Entfernen ist
  eine eigene Aktion. Unverfuegbare Artikel blockieren die Anfrage.
- Anfrage: Kontakt, Wunschdatum, Abholung oder lokale Lieferung mit Adresse.
  Das Datum muss die groesste Vorlaufzeit im Warenkorb beruecksichtigen und
  darf hoechstens ein Jahr in der Zukunft liegen.
- Preise und Liefergebuehr stammen vom Server. `services.DELIVERY_FEES` ist
  die gemeinsame Konfiguration fuer HTML, API und Vorschau im Browser.
- Anfrage und Positionen werden atomar gespeichert. Namen und Preise werden
  als Momentaufnahme uebernommen; spaetere Produktaenderungen aendern sie nicht.
- Ein sessiongebundener UUID-Schluessel schuetzt vor wiederholter Speicherung
  derselben Anfrage. Die zufallsbasierte Anfragenummer verwendet keinen Zaehler.
- Gastanfragen sind erlaubt. Ihre Bestaetigung ist nur in der erstellenden
  Session verfuegbar. Angemeldete Nutzer haben eine private Anfragehistorie;
  die Bestellnummer alleine berechtigt nicht zum Lesen.
- Alte Bestellungen ohne Eigentuemer werden keinem Konto anhand seiner
  E-Mail-Adresse zugeordnet; sie bleiben im Admin verfuegbar.
- Wird ein Konto geloescht, bleibt die Anfrage erhalten und verliert die
  Kontozuordnung (`SET_NULL`). Kontaktangaben werden nicht automatisch geloescht.
  Eine passende Datenaufbewahrung und Loeschroutine ist vor Livebetrieb festzulegen.

Die Admin-Ansicht erlaubt Statuspflege, aber keine manuellen Aenderungen an
Mengen und Preispositionen, die nicht mit der gespeicherten Summe uebereinstimmen.
Die wichtigsten Einkaufs- und Anfrageablaeufe funktionieren ohne JavaScript.

## API

Die vorhandenen Endpunkte bleiben unter `/api/shop/`. Schreibzugriffe sind jetzt
CSRF-geschuetzt; die alte CSRF-Ausnahme wurde entfernt. Externe Clients muessen
Cookie und Token weiterreichen. Kein Endpunkt liefert eine fremde Bestellhistorie.

1. `GET /api/shop/products/` liefert `products`, `checkoutToken` und setzt ein
   CSRF-Cookie. Session-Cookie fuer den folgenden POST beibehalten.
2. `POST /api/shop/orders/` sendet JSON sowie den Header `X-CSRFToken`.
   `requestKey` enthaelt den `checkoutToken` aus dem ersten Schritt.

```json
{
  "requestKey": "<checkoutToken>",
  "customer": {"name": "Erika Beispiel", "email": "erika@example.test"},
  "deliveryMethod": "pickup",
  "requestedDate": "<ISO-Datum mit ausreichendem Vorlauf>",
  "items": [{"productId": 1, "quantity": 2}],
  "note": "Ohne Schriftzug"
}
```

Bei `local_delivery` sind `deliveryAddress`, `postalCode` und `city` erforderlich.
Unbekannte Artikel und ungueltige Mengen fuehren zur Ablehnung der gesamten
Anfrage; es wird nichts stillschweigend entfernt oder auf 20 gekuerzt.
Neue Anfrage: HTTP 201. Autorisierte Wiederholung: HTTP 200 mit gleicher Nummer.
Validierungsfehler: HTTP 400. Der Schluessel ist nach erfolgreicher Speicherung
verbraucht; fuer eine neue Anfrage erneut den Produktkatalog abrufen.

## Pruefungen und Werkzeuge

Der [gemeinsame Prüflauf](../../docs/checks.md) beschreibt die regulären
Prüfgruppen. Für die gezielte Backendprüfung und den optionalen Shop-Browsercheck:

```bash
# server
.venv/bin/python manage.py test shop botanic contracts pages.tests.test_projects

# frontend, bei laufendem lokalem Django-Server
node scripts/check-shop.cjs
```

Der Browsercheck prueft Gastanfrage, Login, Historie, Mengen, Lieferadresse,
Validierung, wiederholtes Absenden und Nutzung ohne JavaScript. Sechs Ansichten
werden auf zehn Bildschirmgroessen von 280 bis 3840 Pixeln und zusaetzlich
mit 2560 Pixeln bei 1,5-facher sowie 1920 Pixeln bei doppelter Pixeldichte
geprueft, einschliesslich QHD und 4K.
Das Sortiment erweitert ab 1600 Pixeln seine
Arbeitsflaeche; Full HD nutzt fuenf, QHD sechs und 4K acht Kartenspalten.
Warenkorb und Formulare behalten ihre kompakte Breite.
Screenshots: `runtime/shop-checks/screenshots/` ab Repository-Stamm.
Optional: `SHOP_BASE_URL` für einen lokalen HTTP(S)-Ursprung und
`SHOP_SCREENSHOT_DIR` für einen anderen Ausgabeordner setzen. Relative
Ausgabepfade beziehen sich auf den Repository-Stamm.
Nur gegen eine lokale Entwicklungsdatenbank verwenden. Testkonto und Testanfragen
werden beim Abschluss entfernt; hartes Prozessabbrechen kann Reste hinterlassen.
Vorhandene Produkte werden dabei nicht veraendert.

`build-shop-icons.cjs` erzeugt aus `frontend/` den eingecheckten Lucide-Sprite
bei Icon-Aenderungen. Die gemeinsamen
[Frontend-Builds](../../docs/architecture.md#vom-quellcode-zur-ausgelieferten-seite)
sind in der Architektur beschrieben.

## Grenzen

Es handelt sich um einen gespeicherten Anfrageshop, nicht um einen freigeschalteten
Zahlungs-Checkout. Keine Abbuchung, keine automatische E-Mail, keine automatische
Liefer- oder Terminzusage, keine Bestandsreservierung und keine Rechnungserstellung.
Gastbestaetigungen sind an die Lebensdauer der bestehenden Session gebunden.

Vor echtem oeffentlichem Betrieb fehlen insbesondere reale Anbieter-/Abholdaten,
gepruefte Produktangaben und Fotos, Liefergebiet, Produktionskapazitaet,
Spam-/Abrufschutz, Benachrichtigungen und die betrieblichen Checkout-Texte.
Die Beispieldaten sind keine geprueften Angaben zu tatsaechlich verkauften Lebensmitteln.
Zahlungsintegration und betriebliche Anforderungen sind separate Ausbauschritte.
