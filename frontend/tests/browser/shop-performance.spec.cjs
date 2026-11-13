const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("shop uses responsive local candidates with one prioritized catalog image", async ({ page }) => {
  const imageRequests = [];
  page.on("request", request => {
    if (request.resourceType() === "image") imageRequests.push(new URL(request.url()).pathname);
  });
  await page.goto("/shop/");
  const photos = page.locator(".product-photo img");
  await expect(photos).toHaveCount(22);
  await expect(photos.first()).toHaveAttribute("fetchpriority", "high");
  await expect(photos.first()).toHaveAttribute("loading", "eager");
  await expect(photos.nth(1)).toHaveAttribute("loading", "lazy");
  await expect.poll(() => photos.first().evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await photos.first().evaluate(image => image.currentSrc)).toContain("/shop/products/responsive/");
  expect(imageRequests.filter(path => /\.(?:jpg|jpeg)$/.test(path))).toEqual([]);
  const firstButton = page.locator(".product-card").first().getByRole("button");
  await expect(firstButton).toHaveAccessibleName(/^Auswählen:/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
});

test("offscreen product images leave texture work until approach and reuse unchanged textures", async ({ page }) => {
  await page.goto("/shop/");
  const first = page.locator(".product-card").first();
  const last = page.locator(".product-card").last();
  await last.locator("img").evaluate(image => { image.loading = "eager"; });
  await expect.poll(() => last.locator("img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(last.locator(".product-tabletop")).toHaveCount(0);
  await last.scrollIntoViewIfNeeded();
  await expect(last.locator(".product-tabletop")).toHaveCount(1);
  await last.evaluate(card => { window.checkedTabletop = card.querySelector(".product-tabletop"); });
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator(".product-tabletop")).toHaveCount(1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await last.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(() => last.evaluate(card => card.querySelector(".product-tabletop") === window.checkedTabletop)).toBe(true);
});

test("white marble stays light beneath the text when responsive image candidates change", async ({ page }) => {
  await page.goto("/shop/?q=Marmorkuchen");
  const copy = page.locator(".product-copy");
  for (const width of [page.viewportSize().width, 768, 1920, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await copy.scrollIntoViewIfNeeded();
    await expect.poll(() => copy.evaluate(element => {
      const rgb = getComputedStyle(element).backgroundColor.match(/\d+/g).map(Number);
      return Math.min(...rgb) > 210 && Math.max(...rgb) - Math.min(...rgb) < 20;
    })).toBe(true);
    await expect(copy).toHaveAttribute("data-text-tone", "default");
    await expect(copy.locator("h3")).toHaveCSS("color", "rgb(40, 38, 44)");
    await expect(copy.locator(".product-tabletop")).toHaveCount(1);
  }
});

test("every catalog background stays bright while responsive photos load", async ({ page }) => {
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop/");
    const cards = page.locator(".product-card");
    await expect(cards).toHaveCount(22);
    for (const card of await cards.all()) {
      const copy = card.locator(".product-copy");
      await copy.scrollIntoViewIfNeeded();
      await expect(copy.locator(".product-tabletop")).toHaveCount(1);
      const channels = await copy.evaluate(element =>
        getComputedStyle(element).backgroundColor.match(/\d+/g).map(Number));
      expect(Math.min(...channels), await card.locator("h3").innerText()).toBeGreaterThan(150);
    }
  }
});

test("shop filtering, detail and cart retain their native form flow", async ({ page }) => {
  await page.goto("/shop/");
  await page.locator("#productSearch").fill("Mokka");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("heading", { name: "Mokka-Torte", exact: true }).getByRole("link").click();
  await expect(page.locator(".product-information")).toContainText("Mokka-Torte");
  await page.locator("#productQuantity").fill("2");
  await page.getByRole("button", { name: "In den Warenkorb", exact: true }).click();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(page.locator('input[name="quantity"]')).toHaveValue("2");
  await page.getByRole("button", { name: "Menge erhöhen", exact: true }).click();
  await expect(page.locator('input[name="quantity"]')).toHaveValue("3");
  await page.getByRole("link", { name: "Zur Bestellanfrage", exact: true }).click();
  await expect(page.locator("#checkoutForm")).toBeVisible();
});
