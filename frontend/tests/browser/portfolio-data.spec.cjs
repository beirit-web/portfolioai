const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("contact shows only the first name and portrait, while the imprint uses sample data", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.locator("main form")).toBeVisible();
  await expect(page.locator("main address")).toBeVisible();
  await expect(page.locator(".contact-details__name")).toHaveText("Eugen");
  await expect(page.locator(".contact-details address")).toHaveText("Eugen");
  await expect(page.locator(".contact-details img")).toBeVisible();
  await expect(page.locator('.contact-details a, .contact-details__address, .contact-details__methods')).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me/"]')).toHaveCount(0);
  await expect(page.locator(".site-footer__brand-main")).toContainText("© 2026 Beirit Web - Eugen");
  await page.goto("/impressum/");
  await expect(page.locator("main")).toContainText("Musterstraße 1");
  await expect(page.locator("main")).toContainText("Fiktive Musterangaben");
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("donation and payment routes lead to projects without contacting PayPal", async ({ page, baseURL }) => {
  const paymentRequests = [];
  page.on("request", request => {
    if (/paypal\.(?:com|me)|\/api\/payments\//i.test(request.url())) paymentRequests.push(request.url());
  });
  for (const path of ["/spenden", "/spenden/", "/zahlung", "/zahlung/erfolg/?token=MUSTER-ORDER", "/zahlung/abbruch/?token=MUSTER-ORDER"]) {
    await page.goto(path);
    await expect(page).toHaveURL(`${baseURL}/projekte`);
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Beispiel einer Spendenoberfläche");
    await expect(page.locator('a[href*="/spenden"], a[href*="intent=donation"]')).toHaveCount(0);
    await expect(page.locator('a[href*="paypal.com"], a[href*="paypal.me"]')).toHaveCount(0);
  }
  expect(paymentRequests).toEqual([]);
});

test("portfolio navigation has no donation links and contact stays neutral", async ({ page }) => {
  for (const path of ["/", "/kompetenzen", "/projekte", "/ueber-mich", "/kontakt", "/projekte/enbt-botanic", "/impressum", "/datenschutz/"]) {
    await page.goto(path);
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.locator('a[href*="/spenden"], a[href*="intent=donation"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Spenden|Projekt unterstützen|Пожертвования|Добровольно поддержать|Добровільно підтримати/i })).toHaveCount(0);
  }
  await page.goto("/kontakt?intent=donation&project=ENBT%20Botanic");
  await expect(page.locator("#subject")).toHaveValue("Frage zu ENBT Botanic");
  await expect(page.locator("#message")).toHaveValue("");
  await expect(page.locator("main form")).toBeVisible();
  await expect(page.locator("main address")).toBeVisible();
  await expect(page.locator(".contact-details address")).toHaveText("Eugen");
  await expect(page.locator(".site-footer__brand-main")).toContainText("Eugen");
});
