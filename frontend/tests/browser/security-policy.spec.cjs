const { test, expect } = require('@playwright/test');
const { blockExternalRequests } = require('./helpers/network.cjs');

test.beforeEach(async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });
  });
});

for (const target of [
  '/', '/kontakt/', '/ueber-mich/', '/projekte/', '/login/', '/register/',
  '/impressum/', '/datenschutz/', '/rechtliches/', '/vertragsgenerator/',
  '/botanic/?tab=plants', '/botanic/wetter/', '/shop/', '/vokabelbox/',
  '/deutschlive/', '/wohnungssuche/', '/static/portfolio/notenrechner/index.html',
]) {
  test(`enforced CSP allows the page scripts: ${target}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(target);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-security-policy']).toContain("script-src-attr 'none'");
    expect(response.headers()['content-security-policy-report-only']).toBeUndefined();
    await expect(page.locator('main').first()).toBeVisible();
    // The calculator's service worker may keep fetching offline resources;
    // the load event already waits for the page's scripts and module graph.
    await page.waitForLoadState('load');
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('CSP blocks injected scripts and event attributes while trusted bootstrap runs', async ({ page }) => {
  const first = await page.goto('/');
  const firstPolicy = first.headers()['content-security-policy'];
  await expect.poll(() => page.evaluate(() => Boolean(window.BEIRIT_HOME_CONFIG))).toBe(true);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.untrustedScriptRan = true';
    document.body.append(script);
    const button = document.createElement('button');
    button.setAttribute('onclick', 'window.untrustedHandlerRan = true');
    document.body.append(button);
    button.click();
    button.remove();
  });
  await expect.poll(() => page.evaluate(() => window.cspViolations.map(v => v.directive).sort()))
    .toEqual(['script-src-attr', 'script-src-elem']);
  expect(await page.evaluate(() => Boolean(window.untrustedScriptRan || window.untrustedHandlerRan))).toBe(false);
  const second = await page.reload();
  expect(second.headers()['content-security-policy']).not.toBe(firstPolicy);
  await expect.poll(() => page.evaluate(() => Boolean(window.BEIRIT_HOME_CONFIG))).toBe(true);
});
