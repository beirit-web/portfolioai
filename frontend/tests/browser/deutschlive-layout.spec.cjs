const { test, expect } = require("@playwright/test");
const { gate } = require("./helpers/async.cjs");
const { blockExternalRequests } = require("./helpers/network.cjs");

for (const [route, chunk, content] of [
  ["/deutschlive/", "index", ".premium-hero"],
  ["/deutschlive/learn", "SceneLearning", ".scene-learning-shell"],
  ["/deutschlive/manual", "ManualPage", ".app-shell__content > section.glass"],
]) {
  test(`${route} stays stable when its page module arrives slowly`, async ({ page, context, baseURL }) => {
    await blockExternalRequests(context, baseURL);
    await context.addInitScript(() => {
      localStorage.setItem("deutsch-live-locale", "de");
      window.initialLayoutShifts = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.initialLayoutShifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    const requested = gate();
    const response = gate();
    await page.route(new RegExp(`/${chunk}-[^/]+\\.js(?:\\?|$)`), async route => {
      requested.release();
      await response.ready;
      await route.continue();
    });
    try {
      const navigation = page.goto(route, { waitUntil: "domcontentloaded" });
      await requested.ready;
      // Give the browser time to paint while the route module is unavailable.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      response.release();
      await navigation;
      await expect(page.locator(content).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const shift = await page.evaluate(() => window.initialLayoutShifts.reduce((sum, value) => sum + value, 0));
      expect(shift).toBeLessThanOrEqual(0.1);
    } finally {
      response.release();
    }
  });
}
