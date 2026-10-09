const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
});

test("personal details are retained on contact and sample data is shown in the imprint", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("link", { name: "kontakt@beirit.digital", exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:+4953515989191"]')).toBeVisible();
  await page.goto("/impressum/");
  await expect(page.locator("main")).toContainText("Musterstraße 1");
  await expect(page.locator("main")).toContainText("Fiktive Musterangaben");
  await expect(page.locator("main")).not.toContainText("Großer Katthagen 13");
  await expect(page.locator("main")).not.toContainText("kontakt@beirit.digital");
  await expect(page.locator('a[href="tel:+4953515989191"]')).toHaveCount(0);
});

test("donation and payment return routes never contact PayPal", async ({ page }) => {
  const paymentRequests = [];
  page.on("request", request => {
    if (/paypal\.(?:com|me)|\/api\/payments\//i.test(request.url())) paymentRequests.push(request.url());
  });
  for (const path of ["/spenden/", "/zahlung/erfolg/?token=MUSTER-ORDER", "/zahlung/abbruch/?token=MUSTER-ORDER"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "PayPal deaktiviert – Portfolio-Demo", exact: true })).toBeDisabled();
    await expect(page.locator("main")).toContainText("Spenden und echte Zahlungen sind deaktiviert");
    await expect(page.locator('a[href*="paypal.com"], a[href*="paypal.me"]')).toHaveCount(0);
  }
  expect(paymentRequests).toEqual([]);
});
