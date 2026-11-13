const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.use({ reducedMotion: "no-preference" });

test.beforeEach(async ({ context, page, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function controlsFit(page) {
  const width = page.viewportSize().width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  const bounds = await page.locator("form input:not([type=hidden]), form textarea, form button")
    .evaluateAll(elements => elements.filter(element => element.getClientRects().length
      && !element.closest('[aria-hidden="true"], [inert]')
      && !element.classList.contains("contact-form__honeypot"))
      .map(element => element.getBoundingClientRect().toJSON()));
  for (const box of bounds) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
    expect(box.width).toBeGreaterThan(0);
  }
}

test("tablet contact layout keeps controls usable and retains input when rotating", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Tablet flow runs once with touch enabled.");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/kontakt/");
  await expect(page.locator(".portfolio-contact-form")).toBeVisible();
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#name").fill("Tablet-Demo");
  await page.locator("#email").fill("tablet@example.test");
  await page.locator("#subject").fill("Frage zum Portfolio");
  await page.locator("#message").fill("Nachricht aus der lokalen Tablet-Prüfung.");
  await page.getByRole("checkbox").check();

  for (const [width, height] of [[768, 1024], [820, 1180], [1023, 768], [1024, 768], [1180, 820], [820, 600]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".portfolio-contact-form")).toBeVisible();
    await expect(page.locator("#name")).toHaveValue("Tablet-Demo");
    await expect(page.locator("#email")).toHaveValue("tablet@example.test");
    await expect(page.locator("#subject")).toHaveValue("Frage zum Portfolio");
    await expect(page.locator("#message")).toHaveValue("Nachricht aus der lokalen Tablet-Prüfung.");
    if (width < 1024) {
      await page.locator("#message").focus();
      await expect(page.locator(".portfolio-contact-form")).not.toHaveClass(/face-up|face-down/);
    }
    await controlsFit(page);
    if (width === 768 || width === 820 || width === 1024) {
      await page.locator("#subject").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`tablet-contact-${width}-${height}.png`), fullPage: true, animations: "disabled" });
    }
  }

  let deliveries = 0;
  await page.route("**/api/contact/", async route => {
    deliveries++;
    expect(route.request().postData()).toContain("tablet@example.test");
    await route.fulfill({ json: { ok: true, message: "Tablet-Prüfung erfolgreich." } });
  });
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#contact-form-status")).toContainText("Ihre Nachricht wurde gespeichert.");
  expect(deliveries).toBe(1);
});
