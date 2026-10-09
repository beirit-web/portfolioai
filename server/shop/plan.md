# Beirit Backstube: Django-Umstellung

## Ziel

Die statische Storefront wird durch die bestehende Django-App unter `/shop/`
ersetzt. Produkte und Bestellanfragen bleiben im Django-Admin verwaltbar.
Keine Zahlungsabbuchung, keine automatische Lieferzusage, keine E-Mail-Zusage.

## Schritte

- [x] Bestehende Storefront, Produktdaten, API und Anmeldung untersuchen.
- [x] Modelle fuer Kontozuordnung, Lieferadresse und doppelte Anfragen erweitern.
- [x] Session-Warenkorb, Produktdetail, Filter und Checkout implementieren.
- [x] API und HTML nutzen dieselbe Validierung und Preisberechnung.
- [x] Mobile-first Templates mit vorhandenen Produktfotos und Lucide-Icons.
- [x] Private Anfragehistorie und geschuetzte Bestaetigung implementieren.
- [x] Alte URL umleiten, Portfolio und Entwicklungsproxy aktualisieren.
- [x] Migrationen, Django-Tests und Browserablaeufe pruefen.
- [x] Betrieb und Grenzen dokumentieren.
- [x] Sortiment um sieben Kuchen und sieben Torten mit eigenen lokalen Bildern
  erweitern; neue Kategorie, Suche, Datenmigration und Warenkorb pruefen.

Abnahme: 88 gezielte Django-Tests erfolgreich, sechs Shop-Ansichten auf zehn
Bildschirmgroessen bis 4K geprueft, inklusive Nutzung ohne JavaScript. Migrationen
sind lokal angewendet; Frontend-Build und i18n-Pruefung erfolgreich.
Betrieb, API-Aenderungen und Grenzen: [README.md](README.md).

## Entscheidungen

- Vorhandene App `shop` ausbauen, kein zweites Django-Projekt duplizieren.
- Preise, Verfuegbarkeit, Mengen und Vorlauf werden serverseitig geprueft.
- Mengen: 1 bis 20 je Artikel; maximal 20 verschiedene Artikel.
- Eine Anfrage samt Positionen wird atomar gespeichert. Wiederholtes Absenden
  derselben Checkout-Anfrage erzeugt keine zweite Bestellung.
- Warenkorb bleibt in der Django-Session ueber Seitenwechsel und Neuladen erhalten.
- Gastanfragen sind erlaubt. Angemeldete Nutzer sehen nur ihre eigenen Anfragen.
- Lokale Lieferung verlangt eine Adresse; Wunschdatum beruecksichtigt Vorlauf.
- HTML-Formulare und API-Schreibzugriffe verlangen CSRF-Schutz.
- Die Bestellnummer ist zufallsbasiert, nicht von einem konkurrierenden Zaehler
  abhaengig. Eine Nummer alleine berechtigt nicht zum Lesen einer Anfrage.
