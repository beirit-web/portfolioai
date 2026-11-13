const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { blockExternalRequests } = require("./helpers/network.cjs");

test("imprint has stable first-paint geometry even when menu setup is delayed", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  const navigationScript = fs.readFileSync(path.resolve(__dirname, "../../../server/assets/js/impressum-nav.js"), "utf8");
  await page.route("**/impressum", async route => {
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
  await page.goto("/impressum");
  const main = page.getByRole("main", { name: "Impressum", exact: true });
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
  test.describe(`imprint browsing with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
    test.use({ javaScriptEnabled });

    test("agents can identify the page, follow section links and find the contact action by role", async ({ page, context, baseURL }) => {
      await blockExternalRequests(context, baseURL);
      await page.goto("/impressum");
      const main = page.getByRole("main", { name: "Impressum", exact: true });
      await expect(main.getByRole("heading", { level: 1 })).toHaveText("Impressum");
      await expect(main.getByRole("region")).toHaveCount(8);
      const contents = main.getByRole("navigation", { name: "Inhaltsverzeichnis", exact: true });
      await expect(contents.getByRole("link")).toHaveCount(8);
      const contact = main.getByRole("region", { name: "Kontakt", exact: true });
      const formLink = contact.getByRole("link", { name: "Kontaktformular öffnen", exact: true });
      await expect(formLink).toHaveAttribute("href", "/kontakt");
      await expect(main.locator('a[href^="tel:"], a[href*="example.com"]')).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Rechtliche Navigation", exact: true })
        .getByRole("link", { name: "Impressum", exact: true })).toHaveAttribute("aria-current", "page");
      await contents.getByRole("link", { name: "Urheberrecht", exact: true }).click();
      await expect(page).toHaveURL(/#imprint-copyright$/);
      const heading = main.getByRole("heading", { name: "Urheberrecht", exact: true });
      await expect(heading).toBeFocused();
      const bounds = await heading.boundingBox();
      const header = await page.locator(".imprint-site-header").boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
      await page.goto("/impressum");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Zum Inhalt", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main", { name: "Impressum", exact: true })).toBeFocused();
    });
  });
}
