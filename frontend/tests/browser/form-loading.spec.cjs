const { test, expect } = require('@playwright/test');
const { blockExternalRequests } = require('./helpers/network.cjs');

for (const [path, chunk, field] of [
  ['/kontakt', '**/assets/ContactForm-*.js', '.portfolio-contact-form #name'],
  ['/deutschlive/account', '**/assets/AuthPanel-*.js', '#konto #username'],
]) {
  test(`${path} keeps its layout stable while the form module loads`, async ({ context, page, baseURL }) => {
    await blockExternalRequests(context, baseURL);
    await page.addInitScript(() => {
      window.formLayoutShift = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.formLayoutShift += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.route(chunk, async route => {
      // Reproduce a cold, slow module request without changing the server.
      await new Promise(resolve => setTimeout(resolve, 600));
      await route.continue();
    });
    await page.goto(path);
    await expect(page.locator(field)).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await page.evaluate(() => window.formLayoutShift)).toBeLessThan(.01);
  });
}
