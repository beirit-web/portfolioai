const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
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
  expect(scripts.filter(url => /\/(?:main-|useI18n-|three-vendor|ContactForm-|WaveGridHero-)/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test("about retains its technology carousel and navigation", async ({ page, isMobile }) => {
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

for (const [language, heading] of [["ru-RU", "Личное сотрудничество с прямым контактным лицом."], ["uk-UA", "Особистое сотрудничество з прямым контактным лицом."]]) {
  test(`about keeps its ${language} translation without the full locale bundle`, async ({ browser, baseURL, isMobile }) => {
    const context = await browser.newContext({
      baseURL, locale: language,
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile, reducedMotion: "reduce",
    });
    try {
      await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
      const page = await context.newPage();
      await page.goto("/ueber-mich");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.locator("html")).toHaveAttribute("lang", language.slice(0, 2));
    } finally {
      await context.close();
    }
  });
}
