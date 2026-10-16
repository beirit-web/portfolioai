const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test("home does not download components for separate about and project pages", async ({ page }) => {
  const unrelatedScripts = [];
  page.on("request", request => {
    if (request.resourceType() === "script"
      && /\/(?:AboutPage|ProjectsOverviewPage|PortfolioProjectPage)-[^/]+\.js(?:\?|$)/.test(request.url())) {
      unrelatedScripts.push(request.url());
    }
  });
  await page.goto("/");
  await expect(page.locator(".site-shell--home .hero-stage__headline")).toBeVisible();
  expect(unrelatedScripts).toEqual([]);
});

test("direct projects navigation uses embedded records and the HTML image preload", async ({ page }) => {
  const apiRequests = [];
  const scriptRequests = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/projects/") apiRequests.push(request.url());
    if (request.resourceType() === "script") scriptRequests.push(request.url());
  });
  await page.route("**/api/projects/**", route => route.abort());
  await page.goto("/projekte");
  const embeddedCount = await page.evaluate(() => window.BEIRIT_HOME_CONFIG.initialProjects.length);
  expect(embeddedCount).toBeGreaterThan(0);
  await expect(page.locator(".project-overview-card")).toHaveCount(embeddedCount);
  const firstImage = page.locator(".project-overview-card__media img").first();
  await expect(firstImage).toHaveAttribute("loading", "eager");
  await expect(firstImage).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator(".project-overview-card__media img").nth(1)).toHaveAttribute("loading", "lazy");
  const preload = page.locator('head link[rel="preload"][as="image"]');
  await expect(preload).toHaveAttribute("fetchpriority", "high");
  await expect(preload).toHaveAttribute("href", await firstImage.getAttribute("src"));
  await expect(preload).toHaveAttribute("imagesrcset", await firstImage.getAttribute("srcset"));
  await expect(preload).toHaveAttribute("imagesizes", await firstImage.getAttribute("sizes"));
  await expect.poll(() => firstImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const initiator = await firstImage.evaluate(image => performance.getEntriesByName(image.currentSrc)[0]?.initiatorType);
  expect(initiator).toBe("link");
  expect(apiRequests).toEqual([]);
  expect(scriptRequests.filter(url => /\/(?:preact-vendor|main-|mountSiteApp-|createLucideIcon-|projects-app-)/.test(url))).toEqual([]);
  await expect(page.locator("[data-projects-rendered]")).toHaveCount(1);
});

test("project cards and native links are available without JavaScript", async ({ browser, baseURL, isMobile }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    locale: "de-DE",
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile,
  });
  try {
    await blockExternalRequests(context, baseURL);
    const page = await context.newPage();
    const response = await page.goto("/projekte");
    expect(response.status()).toBe(200);
    const config = JSON.parse(await page.locator("#beirit-home-config-data").textContent());
    await expect(page.locator(".project-overview-card")).toHaveCount(config.initialProjects.length);
    await expect(page.getByRole("heading", { name: "Projekte", exact: true })).toBeVisible();
    await expect(page.locator(".react-noscript-message")).toHaveCount(0);
    const firstImage = page.locator(".project-overview-card__media img").first();
    await expect(firstImage).toHaveAttribute("loading", "eager");
    await expect.poll(() => firstImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const details = page.locator(".project-overview-card__button").first();
    const href = await details.getAttribute("href");
    await details.click();
    await expect(page).toHaveURL(new URL(href, baseURL).href);
    await expect(page).toHaveTitle(/\| Projekte \| Beirit Web$/);
  } finally {
    await context.close();
  }
});

test("the lightweight menu keeps keyboard focus and restores scrolling", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The mobile panel is used below the navigation breakpoint.");
  await page.goto("/projekte");
  const toggle = page.locator(".site-nav-toggle");
  const panel = page.locator("#site-mobile-navigation");
  await expect(panel).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(panel.locator("a").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  expect(await page.locator("body").evaluate(body => body.style.overflow)).toBe("");
  await toggle.click();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(await page.locator("body").evaluate(body => body.style.overflow)).toBe("");
});

test("project explanations support touch, keyboard dismissal and plain text", async ({ page, isMobile }) => {
  await page.route("**/projekte", async route => {
    const response = await route.fetch();
    const html = await response.text();
    const tooltip = '<span class="info-tooltip"><button class="info-tooltip__trigger" type="button" aria-expanded="false" aria-label="Erklärung zu React" data-project-tooltip="React &lt;strong&gt;Oberfläche&lt;/strong&gt;">i</button></span>';
    await route.fulfill({ response, body: html.replace('<h1 ', `${tooltip}<h1 `) });
  });
  await page.goto("/projekte");
  const trigger = page.getByRole("button", { name: "Erklärung zu React", exact: true });
  if (isMobile) await trigger.tap();
  else await trigger.focus();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("tooltip")).toHaveText("React <strong>Oberfläche</strong>");
  await expect(page.getByRole("tooltip").locator("strong")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});
