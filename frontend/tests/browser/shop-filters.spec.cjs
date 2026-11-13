const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const storageKey = "beirit:shop:filters:v1";
const settled = page => expect(page.locator(".product-grid")).not.toHaveAttribute("aria-busy", "true");

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test("filters open, apply automatically and persist through reloads and product visits", async ({ page, context }) => {
  await page.goto("/shop/");
  const panel = page.getByRole("group", { name: "Filterauswahl" });
  await expect(panel).toBeHidden();
  await page.getByRole("button", { name: "Filter öffnen", exact: true }).click();
  await expect(panel).toBeVisible();
  await page.locator("#categorySelect").selectOption("kuchen");
  await page.locator("#sortSelect").selectOption("priceDesc");
  await expect(page).toHaveURL(/sort=priceDesc/);
  await settled(page);
  const categories = await page.locator(".product-copy > .eyebrow").allTextContents();
  expect(categories.length).toBeGreaterThan(0);
  expect(new Set(categories)).toEqual(new Set(["Kuchen"]));
  const prices = await page.locator(".product-footer > strong").allTextContents();
  const amounts = prices.map(price => Number(price.replace(/[^\d,]/g, "").replace(",", ".")));
  expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
  await page.evaluate(() => { window.filterPageMarker = true; });
  await page.locator("#productSearch").fill("Apfel");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator("#productSearch")).toBeFocused();
  expect(await page.evaluate(() => window.filterPageMarker)).toBe(true);
  await expect(panel).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey))
    .toEqual({q: "Apfel", category: "kuchen", sort: "priceDesc"});
  await page.locator("#productSearch").press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Filter öffnen", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator("#productSearch")).toHaveValue("Apfel");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.locator(".product-card h3 a").click();
  await page.getByRole("link", { name: "Zur Startseite des Torten- und Kuchen-Shops", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator("#categorySelect")).toHaveValue("kuchen");
  await expect(page.locator("#sortSelect")).toHaveValue("priceDesc");
  const revisit = await context.newPage();
  await revisit.goto("/shop/");
  await expect(revisit.locator(".product-card")).toHaveCount(1);
  await expect(revisit.locator("#productSearch")).toHaveValue("Apfel");
  await revisit.close();
  await page.getByRole("link", { name: "Filter zurücksetzen", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(22);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await page.reload();
  await expect(page.locator("#productSearch")).toHaveValue("");
  await expect(page.locator(".product-card")).toHaveCount(22);
});

test("new search categories replace inferred ones while explicit category choices remain strict", async ({ page }) => {
  await page.goto("/shop/?q=Kuchen");
  await expect(page.locator("#categorySelect")).toHaveValue("all");
  expect(new Set(await page.locator(".product-copy > .eyebrow").allTextContents())).toEqual(new Set(["Kuchen"]));
  await page.locator("#productSearch").fill("Torten");
  await expect(page).toHaveURL(/q=Torten/);
  expect(new Set(await page.locator(".product-copy > .eyebrow").allTextContents())).toEqual(new Set(["Torten"]));
  await page.reload();
  await expect(page.locator("#categorySelect")).toHaveValue("all");
  await page.getByRole("button", { name: "Filter öffnen", exact: true }).click();
  await page.locator("#categorySelect").selectOption("torte");
  await page.locator("#productSearch").fill("Kuchen");
  await expect(page.getByRole("heading", { name: "Keine Artikel gefunden" })).toBeVisible();
  await expect(page.locator("#categorySelect")).toHaveValue("torte");
  await page.locator(".empty-state").getByRole("link", { name: "Filter zurücksetzen" }).click();
  await expect(page.locator(".product-card")).toHaveCount(22);
  for (const width of [280, 768, 1440, 1920]) {
    await page.setViewportSize({width, height: 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("search waits for a typing pause and delayed older responses cannot replace new results", async ({ page }) => {
  await page.goto("/shop/");
  const requests = [];
  page.on("request", request => {
    if (request.resourceType() === "fetch") requests.push(new URL(request.url()).searchParams.get("q"));
  });
  await page.locator("#productSearch").pressSequentially("Mokka", {delay: 35});
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(requests).toEqual(["Mokka"]);
  let releaseOld;
  let oldStarted;
  let oldFinished;
  const blocked = new Promise(resolve => { releaseOld = resolve; });
  const started = new Promise(resolve => { oldStarted = resolve; });
  const finished = new Promise(resolve => { oldFinished = resolve; });
  await page.route(url => url.pathname === "/shop/" && url.searchParams.get("q") === "Apfel", async route => {
    try {
      const response = await route.fetch();
      oldStarted();
      await blocked;
      await route.fulfill({response});
    } finally { oldFinished(); }
  });
  await page.locator("#productSearch").fill("Apfel");
  await started;
  await page.locator("#productSearch").fill("Schoko");
  await expect(page).toHaveURL(/q=Schoko/);
  const newest = await page.locator(".product-card").evaluateAll(cards => cards.map(card => card.dataset.productId));
  releaseOld();
  await finished;
  await settled(page);
  await expect(page).toHaveURL(/q=Schoko/);
  expect(await page.locator(".product-card").evaluateAll(cards => cards.map(card => card.dataset.productId))).toEqual(newest);
  await expect(page.locator(".product-tabletop").first()).toBeAttached();
});

test("explicit filter links replace saved values and storage restrictions do not break filtering", async ({ page, context }) => {
  await page.goto("/shop/?q=Apfel&category=kuchen&sort=priceDesc");
  await page.goto("/shop/?category=torte");
  await expect(page.locator("#productSearch")).toHaveValue("");
  await expect(page.locator("#sortSelect")).toHaveValue("priceAsc");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey))
    .toEqual({q: "", category: "torte", sort: "priceAsc"});
  await page.goto("/shop/?reset=1");
  await expect(page.locator(".product-card")).toHaveCount(22);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await context.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Storage.prototype[method] = () => { throw new DOMException("Unavailable", "SecurityError"); };
    }
  });
  await page.goto("/shop/");
  await page.locator("#productSearch").fill("Mokka");
  await expect(page.locator(".product-card")).toHaveCount(1);
});

test("failed requests show a retry and leave the current results intact", async ({ page }) => {
  await page.goto("/shop/");
  const failure = url => url.pathname === "/shop/" && url.searchParams.get("q") === "Mokka";
  await page.route(failure, route => route.abort());
  await page.locator("#productSearch").fill("Mokka");
  await expect(page.getByRole("status")).toContainText("Bitte mit der Lupe erneut versuchen");
  await expect(page.locator(".product-card")).toHaveCount(22);
  await page.unroute(failure);
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("1 Artikel gefunden.");
});

test.describe("without JavaScript", () => {
  test.use({javaScriptEnabled: false});
  test("search and filters still work as a native form", async ({ page }) => {
    await page.goto("/shop/");
    await expect(page.getByRole("group", { name: "Filterauswahl" })).toBeVisible();
    await page.locator("#categorySelect").selectOption("torte");
    await page.locator("#productSearch").fill("Mokka");
    await page.getByRole("button", { name: "Produkte filtern", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Mokka-Torte", exact: true })).toBeVisible();
  });
});
