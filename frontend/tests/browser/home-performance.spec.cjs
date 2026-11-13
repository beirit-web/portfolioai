const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const fs = require("node:fs");
const path = require("node:path");

test("filtered home CSS preserves layout and appearance from the shared styles", async ({ page, context, baseURL, isMobile }) => {
  await blockExternalRequests(context, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const assets = path.resolve(__dirname, "../../../server/assets/portfolio-dist");
  const manifest = JSON.parse(fs.readFileSync(path.join(assets, ".vite/manifest.json"), "utf8"));
  const css = ["src/components/home/hero/Hero.css", "src/components/home/HomePage.css", "src/homepage-layout.css", "src/header-nav.css"]
    .map(entry => fs.readFileSync(path.join(assets, manifest[entry].file), "utf8")).join("\n");
  await page.goto("/");
  // Compare settled styles, including the hamburger icon's short transition.
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  const snapshot = () => page.evaluate(() => {
    const properties = ["display", "position", "color", "background-color", "font-size", "font-weight", "line-height", "text-align", "width", "height", "margin", "padding", "gap", "grid-template-columns", "border-width", "border-radius", "transform"];
    return [...document.querySelectorAll(".site-shell, .site-shell *, .site-header, .site-header *, #site-mobile-navigation, #site-mobile-navigation *")]
      .map(node => ({ tag: node.tagName, class: node.getAttribute("class"), styles: Object.fromEntries(properties.map(property => [property, getComputedStyle(node).getPropertyValue(property)])) }));
  });
  for (const menuOpen of isMobile ? [false, true] : [false]) {
    if (menuOpen) await page.locator(".site-nav-toggle").click();
    const filtered = await snapshot();
    const original = await page.addStyleTag({ content: css });
    expect(await snapshot()).toEqual(filtered);
    await original.evaluate(node => node.remove());
  }
});

test("refreshes carousel data when visitors approach the projects", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  const requests = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/projects/") requests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".site-header")).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(requests).toEqual([]);
  const response = page.waitForResponse(response => new URL(response.url()).pathname === "/api/projects/");
  await page.locator("#referenzen").scrollIntoViewIfNeeded();
  expect((await response).ok()).toBe(true);
  await expect(page.locator("#referenzen")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator(".portfolio-carousel__slide.is-active")).toBeVisible();
  expect(requests).toHaveLength(1);
});

for (const language of ["de", "ru", "uk"]) {
  test.describe(`home first paint (${language})`, () => {
    test.use({ locale: `${language}-${language.toUpperCase()}` });

    test("shows the full page before JavaScript and preserves it during enhancement", async ({ page, context, baseURL }) => {
      await blockExternalRequests(context, baseURL);
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route("**/assets/home-*.js", async route => {
        await gate;
        await route.continue();
      });
      await page.addInitScript(() => {
        window.homeLayoutShift = 0;
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.homeLayoutShift += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto("/", { waitUntil: "commit" });
      const hero = page.locator(".hero-stage__headline");
      await expect(hero).toBeVisible();
      const firstHeadline = await hero.elementHandle();
      const firstText = await hero.textContent();
      await expect(page.locator("#beirit-root")).toHaveAttribute("data-prerendered-language", language);
      await expect(page.locator(".hero-stage__actions a[href='/projekte']")).toBeVisible();
      await expect(page.locator(".problems-grid .problem-card")).toHaveCount(6);
      await expect(page.locator("#kompetenzen .service-card")).toHaveCount(3);
      await expect(page.locator("#referenzen .portfolio-card")).toHaveCount(6);
      await expect(page.locator(".site-footer")).toHaveCount(1);
      release();
      await expect(page.locator(".portfolio-section")).toHaveCount(1);
      await expect(page.locator(".site-header")).toHaveCount(1);
      expect(await hero.evaluate((node, original) => node === original, firstHeadline)).toBe(true);
      await expect(hero).toHaveText(firstText);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".portfolio-card__thumbnail img[loading='eager']")).toHaveCount(0);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.evaluate(() => window.homeLayoutShift)).toBeLessThan(.01);
      expect(errors).toEqual([]);
    });
  });
}

test("the first viewport does not download the app, translations or carousel dependencies", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  const scripts = [];
  page.on("request", request => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("[data-home-rendered]")).toHaveCount(1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(scripts.filter(url => /\/(?:preact-vendor|main|index|useI18n|TechnicalLabel|TechnologyTags|home-portfolio|arrow-left|arrow-right|database)-[^/]+\.js/.test(url))).toEqual([]);
  expect(scripts.length).toBeLessThanOrEqual(3);
});
