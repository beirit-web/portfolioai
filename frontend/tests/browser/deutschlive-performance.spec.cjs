const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test("DeutschLive keeps the initial learning entry within its script and style budgets", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  await page.goto("/deutschlive/");
  await expect(page.getByRole("heading", { level: 1, name: "Deutsch sprechen. Im Alltag ankommen." })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const bytes = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const total = extension => resources
      .filter(entry => new URL(entry.name).pathname.endsWith(extension))
      .reduce((sum, entry) => sum + entry.decodedBodySize, 0);
    return { scripts: total(".js"), styles: total(".css") };
  });
  // Decoded bytes also limit browser parsing work when HTTP compression is on.
  // Before optimization the entry needed about 301 KB JS and 194 KB CSS.
  expect(bytes.scripts).toBeGreaterThan(0);
  expect(bytes.scripts).toBeLessThan(150 * 1024);
  expect(bytes.styles).toBeGreaterThan(0);
  expect(bytes.styles).toBeLessThan(140 * 1024);

  await page.getByRole("link", { name: "Bäckerei-Szene ausprobieren", exact: true }).first().click();
  await expect(page.locator(".scene-learning-shell")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("heading", { name: "Dialoge verstehen, Aussprache üben und Sätze festigen", exact: true })).toBeVisible();
});
