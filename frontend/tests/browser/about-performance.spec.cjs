const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../server/assets/portfolio-dist/.vite/manifest.json"), "utf8"));
const fullLocalePaths = ["ru", "uk"].map(language => {
  const entry = manifest[`src/i18n/locales/${language}.json`];
  if (!entry) throw new Error(`Missing full ${language} locale in the portfolio build`);
  return `/static/portfolio-dist/${entry.file}`;
});

async function advanceCarouselClock(page, milliseconds) {
  // Flush Preact's effects before the interval and render its result afterwards.
  await page.clock.runFor(100);
  await page.clock.fastForward(milliseconds);
  await page.clock.runFor(100);
}

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("about loads its own entry, starts portrait loading early and avoids project requests", async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on("request", request => requests.push(request));
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/ueber-mich");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entwickler hinter Beirit Web");
  const portrait = page.locator(".about-photo-card__picture img");
  await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const source = page.locator(".about-photo-card__picture source");
  const preload = page.locator('head link[rel="preload"][href$="eugenbeirit-360.webp"]');
  await expect(preload).toHaveAttribute("imagesrcset", await source.getAttribute("srcset"));
  await expect(preload).toHaveAttribute("imagesizes", await source.getAttribute("sizes"));
  expect(await portrait.evaluate(image => performance.getEntriesByName(image.currentSrc)[0]?.initiatorType)).toBe("link");
  expect(requests.filter(request => new URL(request.url()).pathname === "/api/projects/")).toEqual([]);
  const scripts = requests.filter(request => request.resourceType() === "script").map(request => request.url());
  expect(scripts.some(url => /\/about-[^/]+\.js$/.test(url))).toBe(true);
  expect(scripts.filter(url => /\/(?:main-|useI18n-|three-vendor|ContactForm-|WaveGridHero-|PortfolioFeatureList-)/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test("about retains its technology carousel and navigation", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ueber-mich");
  const activeTechnology = isMobile
    ? page.locator(".about-tech-carousel__stage strong")
    : page.locator(".about-tech-carousel__item.is-active strong");
  await expect(activeTechnology).toHaveText("Python");
  await page.locator(".about-tech-carousel").scrollIntoViewIfNeeded();
  await expect(activeTechnology).not.toHaveText("Python", { timeout: 6000 });
  await page.evaluate(() => scrollTo(0, 0));
  if (isMobile) {
    await page.locator(".site-nav-toggle").click();
    await page.locator('#site-mobile-navigation a[href="/kompetenzen"]').click();
  } else {
    await page.locator('#site-navigation a[href="/kompetenzen"]').click();
  }
  await expect(page).toHaveURL(/\/kompetenzen$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entwickler hinter Beirit Web");
});

test("reduced motion keeps the technology stable and allows manual navigation", async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  await page.goto("/ueber-mich");
  const carousel = page.getByRole("region", { name: "Technologien und Werkzeuge", exact: true });
  const activeTechnology = page.locator(isMobile ? ".about-tech-carousel__stage strong" : ".about-tech-carousel__item.is-active strong");
  await carousel.scrollIntoViewIfNeeded();
  await expect(activeTechnology).toHaveText("Python");
  await page.clock.pauseAt(new Date("2026-10-16T13:00:00Z"));
  await advanceCarouselClock(page, 8000);
  await expect(activeTechnology).toHaveText("Python");
  await carousel.getByRole("button", { name: "Nächste Technologie", exact: true }).click();
  await expect(activeTechnology).toHaveText("Django");
  await carousel.getByRole("button", { name: "Vorherige Technologie", exact: true }).click();
  await expect(activeTechnology).toHaveText("Python");
  await expect(carousel.getByRole("button", { name: /Automatischen Wechsel/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("technology-controls.png") });
});

test("technology autoplay can stay paused and reacts to motion preference changes", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  await page.goto("/ueber-mich");
  const carousel = page.getByRole("region", { name: "Technologien und Werkzeuge", exact: true });
  const activeTechnology = page.locator(isMobile ? ".about-tech-carousel__stage strong" : ".about-tech-carousel__item.is-active strong");
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel.getByRole("button", { name: "Automatischen Wechsel pausieren", exact: true })).toBeVisible();
  // Visibility tracking is asynchronous; settle it before freezing browser time.
  await expect(page.locator(".about-tech-carousel__stage")).toHaveAttribute("aria-live", "off");
  await page.clock.pauseAt(new Date("2026-10-16T13:00:00Z"));
  await carousel.getByRole("button", { name: "Automatischen Wechsel pausieren", exact: true }).click();
  const pausedTechnology = await activeTechnology.textContent();
  // Leaving the region must not undo an explicit pause.
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await advanceCarouselClock(page, 8000);
  await expect(activeTechnology).toHaveText(pausedTechnology);
  await expect(carousel.getByRole("button", { name: "Automatischen Wechsel fortsetzen", exact: true })).toHaveAttribute("aria-pressed", "true");
  await carousel.getByRole("button", { name: "Automatischen Wechsel fortsetzen", exact: true }).click();
  await expect(carousel.getByRole("button", { name: "Automatischen Wechsel pausieren", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await expect.poll(() => carousel.evaluate(element => !element.matches(":hover") && !element.contains(document.activeElement))).toBe(true);
  await expect.poll(async () => {
    // Flush the effects after the committed control update and pointer/focus exit.
    await page.clock.runFor(100);
    return page.locator(".about-tech-carousel__stage").getAttribute("aria-live");
  }).toBe("off");
  await advanceCarouselClock(page, 3000);
  await expect(activeTechnology).not.toHaveText(pausedTechnology);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(100);
  await expect(page.locator(".about-tech-carousel__stage")).toHaveAttribute("aria-live", "polite");
  const reducedTechnology = await activeTechnology.textContent();
  await advanceCarouselClock(page, 8000);
  await expect(activeTechnology).toHaveText(reducedTechnology);
});

for (const [language, heading] of [["ru-RU", "Личное сотрудничество с прямым контактным лицом."], ["uk-UA", "Особистое сотрудничество з прямым контактным лицом."]]) {
  test(`about keeps its ${language} translation without the full locale bundle`, async ({ browser, baseURL, isMobile }) => {
    const context = await browser.newContext({
      baseURL, locale: language,
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile, reducedMotion: "reduce",
    });
    try {
      await blockExternalRequests(context, baseURL);
      const page = await context.newPage();
      const scripts = [];
      page.on("request", request => {
        if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
      });
      await page.goto("/ueber-mich");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.locator("html")).toHaveAttribute("lang", language.slice(0, 2));
      expect(scripts.filter(script => fullLocalePaths.includes(script))).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
