# :shopping_cart: Mini Online-Shop

**Diese Übung behandelt die JavaScript-Konzepte von Klassen und Instanzobjekten**

Deine Aufgabe ist es, eine Produkt- und eine Warenkorbklasse zu erstellen, die einen Online-Shop darstellen.

---

## 1. Produkt

Schreibe eine Klasse `Product`, die 2 Eigenschaften haben soll

- einen `name` als String
- einen `price` als Zahl

Der Konstruktor sollte 2 Parameter haben, die diese Eigenschaften initialisieren. Zum Beispiel:

```js
const adidasShoes = new Product("Adidas running shoes", 150.0)
const tracksuit = new Product("Puma tracksuit", 99.99)
const socks = new Product("Socks set", 4.99)
```

Die Klasse sollte außerdem 2 Methoden haben

- `toText()` - gibt einen String mit dem Produktnamen, dem Bruttopreis und der enthaltenen Mehrwertsteuer zurück.
- `containedVAT()` - gibt die im Bruttopreis enthaltene Mehrwertsteuer zurück

- So berechnest du den Mehrwertsteuerbetrag aus dem Bruttopreis:
  1. Bestimme den Mehrwertsteuersatz in Prozent: Mehrwertsteuersatz = 16/100 = 0,16
  2. Berechne den Nettopreis: Nettopreis = Bruttopreis / (1 + Mehrwertsteuersatz) = 150 / (1 + 0,16) = 129,31
  3. Berechne den Mehrwertsteuerbetrag: Mehrwertsteuerbetrag = Bruttopreis - Nettopreis = 150 - 129,31 = 20,69

```js
adidasShoes.toText() // Adidas Laufschuhe 150,00 € insgesamt. 20,69 € inkl. MwSt. (16%).
adidasShoes.containedVAT() // 20,69 € inkl. MwSt.
```

## 2. Warenkorb

Schreibe eine weitere Klasse `Cart`, die eine Eigenschaft haben sollte

- `products`, ein Array von Produkten

Wenn du eine Instanz von Cart erstellst, gibt es keine Produkte, also ist das Array leer. Dein Konstruktor nimmt keine Parameter an.

Erstelle drei Methoden für die Klasse Cart:

- `addProduct(shoppedProduct)`, die einen Parameter benötigt
  - Die Methode sollte zuerst testen, ob `shoppedProduct` eine Instanz der Klasse `Product` ist [mdn instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)
  - wenn `shoppedProduct` eine Instanz von Product ist, füge es zum Array der Produkte hinzu und gib einen String mit der Anzahl der Produkte im Warenkorb zurück.
  - wenn `shoppedProduct` keine Instanz von Product ist, wird ein String zurückgegeben, der besagt, dass das Produkt nicht im Shop verfügbar ist
- `getProductInfoCart()`, die keine Parameter benötigt
  - die Methode sollte über das Array der Produkte iterieren
  - für jedes in der Liste enthaltene Produkt die Methode `toText()` aufrufen und auf der Konsole ausgeben.
- `getTotalItemsPrice()`, die keine Parameter benötigt
  - Die Methode sollte das Array mit den Produkten durchlaufen und den Gesamtpreis der Artikel im Warenkorb berechnen und als String zurückgeben.

## 3. Teste deinen Warenkorb mit Produkten

Hinweis: Du musst eventuell `console.log()` verwenden, um zu sehen, was zurückgegeben wurde.

Erstelle zunächst eine Instanz von Cart und lege deine Produkte in deinen Warenkorb. Zum Beispiel:

```js
const cart = new Cart()
cart.addProduct("potato") // Diese ist in unserem Shop nicht erhältlich!
cart.addProduct(tracksuit) // Dein Warenkorb enthält jetzt 1 Produkt
cart.addProduct(adidasShoes) // Dein Warenkorb enthält jetzt 2 Produkte
cart.addProduct(socks) // Dein Einkaufswagen enthält jetzt 3 Produkte
```

Rufe dann die Methoden `getProductInfoCart()` und `getTotalItemsPrice()` deines Warenkorbs auf. Zum Beispiel:

```js
cart.getProductInfoCart()
// Adidas Laufschuhe 150,00 € insgesamt. 20,69 € inkl. MwSt. (16%).
// Puma Trainingsanzug 99,99 € insgesamt. 13,79 € inkl. MwSt. (16%).
// Socken Set 4,99 € insgesamt. 0,69 € inkl. MwSt. (16%).

cart.getTotalItemsPrice()
// Die Gesamtsumme für 3 Artikel in deinem Warenkorb beträgt 254,98 €.
```
