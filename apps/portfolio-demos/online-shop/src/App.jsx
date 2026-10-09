import React, { useEffect, useMemo, useState } from "react";

const fallbackProducts = [
  {
    id: 1,
    sku: "BK-ERD-001",
    name: "Erdbeer-Sahne-Torte",
    category: "torte",
    categoryLabel: "Torten",
    description: "Lockerer Biskuit, Vanillesahne und frische Erdbeeren als klassische Festtagstorte.",
    price: "39.90",
    imageUrl: "/static/portfolio/online-shop/assets/erdbeer-sahne-torte.jpg",
    ingredients: "Biskuit, Sahne, Erdbeeren, Vanille, Zucker",
    allergens: "Gluten, Milch, Eier",
    serves: "10-12 Stücke",
    leadTimeDays: 2,
    stockStatus: "Frisch auf Bestellung",
    isFeatured: true,
  },
  {
    id: 2,
    sku: "BK-SCH-002",
    name: "Schoko-Ganache-Stück",
    category: "stueck",
    categoryLabel: "Kuchenstücke",
    description: "Intensiver Schokoladenkuchen mit glänzender Ganache und saftigem Boden.",
    price: "4.90",
    imageUrl: "/static/portfolio/online-shop/assets/schoko-ganache-stueck.jpg",
    ingredients: "Kakao, Butter, Eier, Zucker, Sahne, Mehl",
    allergens: "Gluten, Milch, Eier",
    serves: "1 Stück",
    leadTimeDays: 1,
    stockStatus: "Heute verfügbar",
  },
  {
    id: 3,
    sku: "BK-HIM-003",
    name: "Himbeer-Cheesecake",
    category: "torte",
    categoryLabel: "Torten",
    description: "Cremiger Cheesecake mit Himbeerspiegel, Keksboden und frischen Beeren.",
    price: "34.90",
    imageUrl: "/static/portfolio/online-shop/assets/himbeer-cheesecake.jpg",
    ingredients: "Frischkäse, Himbeeren, Butterkeks, Zucker, Eier",
    allergens: "Gluten, Milch, Eier",
    serves: "8-10 Stücke",
    leadTimeDays: 2,
    stockStatus: "Frisch auf Bestellung",
    isFeatured: true,
  },
  {
    id: 4,
    sku: "BK-ZIT-004",
    name: "Zitronen-Tarte",
    category: "tarte",
    categoryLabel: "Tartes",
    description: "Feine Tarte mit knusprigem Mürbeteig und frischer Zitronencreme.",
    price: "24.90",
    imageUrl: "/static/portfolio/online-shop/assets/zitronen-tarte.jpg",
    ingredients: "Mürbeteig, Zitrone, Butter, Eier, Zucker",
    allergens: "Gluten, Milch, Eier",
    serves: "6-8 Stücke",
    leadTimeDays: 1,
    stockStatus: "Heute verfügbar",
  },
  {
    id: 5,
    sku: "BK-SWA-005",
    name: "Schwarzwälder Kirschtorte",
    category: "torte",
    categoryLabel: "Torten",
    description: "Schokoladenbiskuit, Kirschfüllung, Sahne und feine Schokoladenspäne.",
    price: "42.00",
    imageUrl: "/static/portfolio/online-shop/assets/schwarzwaelder-torte.jpg",
    ingredients: "Schokoladenbiskuit, Kirschen, Sahne, Schokolade",
    allergens: "Gluten, Milch, Eier",
    serves: "10-12 Stücke",
    leadTimeDays: 2,
    stockStatus: "Frisch auf Bestellung",
    isFeatured: true,
  },
  {
    id: 6,
    sku: "BK-KAR-006",
    name: "Karotten-Walnuss-Kuchen",
    category: "torte",
    categoryLabel: "Torten",
    description: "Saftiger Karottenkuchen mit Frischkäsecreme und Walnussrand.",
    price: "31.90",
    imageUrl: "/static/portfolio/online-shop/assets/karotten-walnuss-kuchen.jpg",
    ingredients: "Karotten, Walnüsse, Frischkäse, Eier, Mehl",
    allergens: "Gluten, Milch, Eier, Nüsse",
    serves: "8-10 Stücke",
    leadTimeDays: 2,
    stockStatus: "Frisch auf Bestellung",
  },
  {
    id: 7,
    sku: "BK-APF-007",
    name: "Apfel-Streusel-Stück",
    category: "stueck",
    categoryLabel: "Kuchenstücke",
    description: "Klassischer Apfelkuchen mit buttrigen Streuseln und saftiger Füllung.",
    price: "4.40",
    imageUrl: "/static/portfolio/online-shop/assets/apfel-streusel-stueck.jpg",
    ingredients: "Äpfel, Butter, Mehl, Zucker, Zimt",
    allergens: "Gluten, Milch",
    serves: "1 Stück",
    leadTimeDays: 1,
    stockStatus: "Heute verfügbar",
  },
  {
    id: 8,
    sku: "BK-MIN-008",
    name: "Mini-Törtchen Box",
    category: "box",
    categoryLabel: "Geschenkboxen",
    description: "Gemischte Box mit kleinen Törtchen für Büro, Besuch oder Geschenk.",
    price: "27.90",
    imageUrl: "/static/portfolio/online-shop/assets/mini-toertchen-box.jpg",
    ingredients: "Sahne, Schokolade, Beeren, Frischkäse, Biskuit",
    allergens: "Gluten, Milch, Eier, Nüsse möglich",
    serves: "9 Mini-Törtchen",
    leadTimeDays: 1,
    stockStatus: "Begrenzt verfügbar",
    isFeatured: true,
  },
];

const deliveryFees = {
  pickup: 0,
  local_delivery: 8.9,
};

const apiBase = "/api/shop";

function currency(value) {
  return Number(value).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function normalizeImageUrl(url) {
  if (!url) return "";
  if (window.location.protocol === "file:" && url.startsWith("/static/portfolio/online-shop/")) {
    return url.replace("/static/portfolio/online-shop/", "./");
  }
  return url;
}

export function App() {
  const [products, setProducts] = useState(fallbackProducts);
  const [apiState, setApiState] = useState("fallback");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/products/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Shop API nicht erreichbar");
        return response.json();
      })
      .then((payload) => {
        if (Array.isArray(payload.products) && payload.products.length > 0) {
          setProducts(payload.products);
          setApiState("connected");
        }
      })
      .catch(() => setApiState("fallback"));
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const labels = new Map(products.map((product) => [product.category, product.categoryLabel]));
    return [["all", "Alle"], ...Array.from(labels.entries())];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de-DE");
    return products
      .filter((product) => {
        const searchable = `${product.name} ${product.categoryLabel} ${product.description} ${product.ingredients} ${product.allergens}`.toLocaleLowerCase("de-DE");
        return (category === "all" || product.category === category) && searchable.includes(needle);
      })
      .sort((a, b) => {
        if (sortMode === "priceAsc") return Number(a.price) - Number(b.price);
        if (sortMode === "priceDesc") return Number(b.price) - Number(a.price);
        if (sortMode === "leadTime") return Number(a.leadTimeDays) - Number(b.leadTimeDays);
        return Number(b.isFeatured) - Number(a.isFeatured);
      });
  }, [category, products, query, sortMode]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? deliveryFees[deliveryMethod] : 0;
  const total = subtotal + deliveryFee;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { product, quantity: 1 }];
    });
    setCheckoutStatus(`${product.name} wurde zur Bestellung hinzugefügt.`);
  }

  function updateQuantity(productId, quantity) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== productId) return item;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }

  function submitOrder(event) {
    event.preventDefault();
    if (cart.length === 0) {
      setCheckoutStatus("Bitte zuerst eine Torte oder einen Kuchen auswählen.");
      return;
    }
    if (apiState !== "connected") {
      const demoNumber = `DEMO-${Date.now().toString().slice(-6)}`;
      setCheckoutStatus(`Demo-Bestellanfrage ${demoNumber} vorbereitet. Mit Django wird daraus eine echte gespeicherte Bestellung.`);
      setCart([]);
      return;
    }
    setIsSubmitting(true);
    setCheckoutStatus("Bestellanfrage wird gesendet...");
    fetch(`${apiBase}/orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        deliveryMethod,
        requestedDate,
        note,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(Object.values(payload.errors || {}).flat().join(" ") || "Bestellung konnte nicht angelegt werden.");
        }
        return payload;
      })
      .then((payload) => {
        setCheckoutStatus(`Bestellanfrage ${payload.orderNumber} wurde vorbereitet. Gesamt: ${currency(payload.total)}.`);
        setCart([]);
      })
      .catch((error) => setCheckoutStatus(error.message))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <main className="shop-shell">
      <section className="shop-hero" aria-labelledby="shop-title">
        <p className="eyebrow">React und Django Shop</p>
        <h1 id="shop-title">Beirit Backstube</h1>
        <p>
          Ein Onlineshop-Konzept nur für Torten und Kuchen: mit echten Produktdaten aus Django,
          appetitlichen Artikelbildern, Warenkorb, Wunschdatum und Bestellanfrage.
        </p>
        <div className="hero-metrics" aria-label="Shop-Eigenschaften">
          <span><strong>8</strong> Backwaren</span>
          <span><strong>1-2 Tage</strong> Vorlaufzeit</span>
          <span><strong>{apiState === "connected" ? "Django" : "Demo"}</strong> Datenquelle</span>
        </div>
      </section>

      <section className="shop-layout">
        <section className="catalog-panel" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sortiment</p>
              <h2 id="catalog-title">Torten und Kuchen</h2>
            </div>
            <span>{filteredProducts.length} Artikel</span>
          </div>

          <div className="toolbar" aria-label="Produktfilter">
            <label>
              <span>Suche</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Erdbeer, Schoko, Allergene..." />
            </label>
            <label>
              <span>Kategorie</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Sortierung</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                <option value="featured">Empfohlen</option>
                <option value="leadTime">Schnell verfügbar</option>
                <option value="priceAsc">Preis aufsteigend</option>
                <option value="priceDesc">Preis absteigend</option>
              </select>
            </label>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <button className="image-button" type="button" onClick={() => setSelectedProduct(product)} aria-label={`${product.name} ansehen`}>
                  <img src={normalizeImageUrl(product.imageUrl)} alt={product.name} width="620" height="620" />
                  {product.isFeatured ? <span>Empfohlen</span> : null}
                </button>
                <div className="product-copy">
                  <p>{product.categoryLabel}</p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
                <dl className="product-facts">
                  <div><dt>Portionen</dt><dd>{product.serves}</dd></div>
                  <div><dt>Vorlauf</dt><dd>{product.leadTimeDays} Tag{product.leadTimeDays === 1 ? "" : "e"}</dd></div>
                </dl>
                <p className="allergens">Allergene: {product.allergens}</p>
                <div className="product-card__footer">
                  <strong>{currency(product.price)}</strong>
                  <button type="button" onClick={() => addToCart(product)}>Auswählen</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="checkout-panel" aria-labelledby="checkout-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Bestellanfrage</p>
              <h2 id="checkout-title">Warenkorb</h2>
            </div>
            <span>{itemCount}</span>
          </div>

          <form onSubmit={submitOrder}>
            <div className="cart-list" aria-live="polite">
              {cart.length === 0 ? (
                <p className="empty-cart">Noch keine Backware ausgewählt.</p>
              ) : cart.map((item) => (
                <article className="cart-item" key={item.product.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{currency(item.product.price)} pro Stück</span>
                  </div>
                  <div className="quantity-controls">
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                  </div>
                </article>
              ))}
            </div>

            <label>
              <span>Übergabe</span>
              <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
                <option value="pickup">Abholung - 0,00 €</option>
                <option value="local_delivery">Lokale Lieferung - 8,90 €</option>
              </select>
            </label>
            <label>
              <span>Wunschdatum</span>
              <input value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} type="date" />
            </label>
            <label>
              <span>Name</span>
              <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} type="text" autoComplete="name" required />
            </label>
            <label>
              <span>E-Mail</span>
              <input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Telefon</span>
              <input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} type="tel" autoComplete="tel" />
            </label>
            <label>
              <span>Hinweis zur Torte</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="z. B. Anlass, Schriftzug, Allergiehinweis" />
            </label>

            <dl className="summary">
              <div><dt>Artikel</dt><dd>{currency(subtotal)}</dd></div>
              <div><dt>Übergabe</dt><dd>{currency(deliveryFee)}</dd></div>
              <div className="summary-total"><dt>Gesamt</dt><dd>{currency(total)}</dd></div>
            </dl>
            <button className="checkout-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gesendet..." : "Bestellanfrage vorbereiten"}
            </button>
            <p className="checkout-status" role="status">{checkoutStatus}</p>
          </form>
        </aside>
      </section>

      {selectedProduct ? (
        <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-backdrop" type="button" onClick={() => setSelectedProduct(null)} aria-label="Detailansicht schließen" />
          <article className="modal-card">
            <button className="modal-close" type="button" onClick={() => setSelectedProduct(null)} aria-label="Schließen">x</button>
            <img src={normalizeImageUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} />
            <div>
              <p className="eyebrow">{selectedProduct.categoryLabel}</p>
              <h2 id="modal-title">{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              <dl className="product-facts">
                <div><dt>Portionen</dt><dd>{selectedProduct.serves}</dd></div>
                <div><dt>Vorlauf</dt><dd>{selectedProduct.leadTimeDays} Tag{selectedProduct.leadTimeDays === 1 ? "" : "e"}</dd></div>
                <div><dt>Status</dt><dd>{selectedProduct.stockStatus}</dd></div>
              </dl>
              <p className="allergens">Zutaten: {selectedProduct.ingredients}</p>
              <p className="allergens">Allergene: {selectedProduct.allergens}</p>
              <button type="button" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>
                Für {currency(selectedProduct.price)} auswählen
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}
