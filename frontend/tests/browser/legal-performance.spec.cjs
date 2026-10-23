const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { blockExternalRequests } = require("./helpers/network.cjs");

test("project terms have stable first-paint geometry even when menu setup is delayed", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  const navigationScript = fs.readFileSync(path.resolve(__dirname, "../../../server/assets/js/impressum-nav.js"), "utf8");
  await page.route("**/rechtliches/", async route => {
    const response = await route.fetch();
    const html = await response.text();
    expect(html).toContain(`<script>${navigationScript}</script>`);
    await route.fulfill({ response, body: html.replace(`<script>${navigationScript}</script>`, "") });
  });
  await page.addInitScript(() => {
    window.imprintLayoutShift = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.imprintLayoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const resources = [];
  page.on("request", request => resources.push({ type: request.resourceType(), url: request.url() }));
  await page.goto("/rechtliches/");
  const main = page.getByRole("main", { name: "Projektbedingungen", exact: true });
  await expect(main).toBeVisible();
  const before = await main.boundingBox();
  await page.addScriptTag({ content: navigationScript });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await main.boundingBox();
  expect(after.y).toBe(before.y);
  expect(await page.evaluate(() => window.imprintLayoutShift)).toBeLessThan(.001);
  expect(resources.filter(resource => ["script", "stylesheet"].includes(resource.type))).toEqual([]);
});

for (const javaScriptEnabled of [true, false]) {
  test.describe(`project terms navigation with JavaScript ${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled });
    test("keeps navigation, legal text and footer usable on mobile and desktop", async ({ page, context, baseURL, isMobile }) => {
      await blockExternalRequests(context, baseURL);
      await page.goto("/rechtliches/");
      const main = page.getByRole("main", { name: "Projektbedingungen", exact: true });
      await expect(main).toBeVisible();
      await expect(main.locator(".legal-section")).toHaveCount(10);
      await expect(main.locator("#zahlung")).toContainText("PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.");
      const nav = page.getByRole("navigation", { name: "Hauptnavigation", exact: true });
      const contact = nav.getByRole("link", { name: "Kontakt", exact: true });
      if (javaScriptEnabled && isMobile) {
        await expect(contact).toBeHidden();
        const menu = nav.getByRole("button", { name: "Menü öffnen", exact: true });
        await menu.click();
        await expect(contact).toBeVisible();
        await contact.focus();
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
        await expect(contact).toBeHidden();
        await menu.click();
      }
      await expect(contact).toBeVisible();
      await expect(contact).toHaveAttribute("href", "/kontakt");
      await expect(page.locator("footer")).toContainText("Eugen Beirit");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.goto("/rechtliches/#rechte");
      const section = page.locator("#rechte");
      await expect(section).toBeInViewport();
      const bounds = await section.boundingBox();
      if (javaScriptEnabled) {
        const header = await page.locator(".imprint-site-header").boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
      }
    });
  });
}
