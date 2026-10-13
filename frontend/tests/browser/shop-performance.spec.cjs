const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
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

test("shop filtering, detail and cart retain their native form flow", async ({ page }) => {
  await page.goto("/shop/");
  await page.locator("#productSearch").fill("Mokka");
  await page.getByRole("button", { name: "Produkte filtern", exact: true }).click();
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
