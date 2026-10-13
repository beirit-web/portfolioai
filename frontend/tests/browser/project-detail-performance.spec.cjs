const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test("project reports preload responsive covers and use smaller gallery sources", async ({ page }) => {
  const scripts = [];
  const projectRequests = [];
  page.on("request", request => {
    if (request.resourceType() === "script") scripts.push(request.url());
    if (new URL(request.url()).pathname === "/api/projects/") projectRequests.push(request.url());
  });
  test.setTimeout(90000);
  for (const slug of ["online-shop", "vertragsgenerator", "enbt-botanic", "sprachdienstleistungen", "notenrechner", "wohnungssuche-bodensee"]) {
    await page.goto(`/projekte/${slug}`);
    const cover = page.locator(".portfolio-project-hero__cover img");
    const preload = page.locator('head link[rel="preload"][as="image"]');
    await expect(cover).toHaveAttribute("loading", "eager");
    await expect(preload).toHaveAttribute("imagesrcset", await cover.getAttribute("srcset"));
    await expect(preload).toHaveAttribute("imagesizes", await cover.getAttribute("sizes"));
    await expect.poll(() => cover.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(preload).toHaveAttribute("media", "(min-width: 1100px)");
    expect(await cover.evaluate(img => performance.getEntriesByName(img.currentSrc)[0]?.initiatorType)).toBe(page.viewportSize().width >= 1100 ? "link" : "img");
    const coverRequests = await cover.evaluate((img, slug) => performance.getEntriesByType("resource").filter(entry => entry.name.includes(`${slug}-cover-v1`)), slug);
    expect(coverRequests).toHaveLength(1);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
    expect(scripts.filter(url => /\/(?:main-|WaveGridHero-|three-vendor-|preact-vendor-|useI18n-|mountSiteApp-|project-detail-app-)/.test(url))).toEqual([]);
    expect(projectRequests).toEqual([]);
    await expect(page.locator("[data-project-detail-rendered]")).toHaveCount(1);
    const desktop = page.locator(".portfolio-project-gallery__figure img").first();
    await desktop.scrollIntoViewIfNeeded();
    await expect.poll(() => desktop.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await desktop.evaluate(img => img.currentSrc)).toMatch(/-desktop-(480|640|768|960)\.webp$/);
    // Clicking the preview still opens the full-resolution source.
    await expect(desktop.locator("..")).toHaveAttribute("href", /-desktop\.webp$/);
    const mobile = page.locator(".portfolio-project-gallery__figure--mobile img");
    await mobile.scrollIntoViewIfNeeded();
    await expect.poll(() => mobile.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    const preview = await mobile.evaluate(img => {
      const box = img.getBoundingClientRect();
      const link = img.parentElement.getBoundingClientRect();
      return { width: box.width, height: box.height, linkWidth: link.width, naturalRatio: img.naturalWidth / img.naturalHeight };
    });
    expect(preview.width).toBeGreaterThan(80);
    expect(preview.height).toBeGreaterThan(160);
    expect(Math.abs(preview.width - preview.linkWidth + 2)).toBeLessThan(1);
    expect(preview.width / preview.height).toBeCloseTo(preview.naturalRatio, 2);
  }
});

test("reports are complete without JavaScript and native actions remain available", async ({ browser, baseURL, isMobile }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false,
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    await page.goto("/projekte/online-shop");
    await expect(page.locator("[data-project-detail-rendered]")).toHaveCount(1);
    await expect(page.locator(".portfolio-project-hero h1")).toHaveText("Torten- und Kuchen-Shop");
    await expect(page.locator(".portfolio-card__features li")).not.toHaveCount(0);
    await expect(page.locator(".portfolio-project-decision")).toBeVisible();
    await expect(page.locator(".react-noscript-message")).toHaveCount(0);
    await expect(page.locator(".portfolio-project-gallery img")).toHaveCount(2);
    await expect(page.locator(".portfolio-project-hero .portfolio-contact-button")).toHaveAttribute("href", "/shop/");
    await page.locator(".portfolio-project-back").click();
    await expect(page).toHaveURL(/\/projekte\/?$/);
  } finally {
    await context.close();
  }
});

test("report links remain reachable by keyboard without deferred layout", async ({ page }) => {
  await page.goto("/projekte/online-shop");
  const gallery = page.locator(".portfolio-project-gallery__figure--mobile a");
  for (let step = 0; step < 30; step++) {
    await page.keyboard.press("Tab");
    if (await gallery.evaluate(element => document.activeElement === element)) break;
  }
  await expect(gallery).toBeFocused();
  await expect(gallery).toBeInViewport();
  await expect(page.locator(".portfolio-card__proof")).toHaveCSS("content-visibility", "visible");
  for (const selector of [".portfolio-project-page", ".portfolio-project-decision"]) {
    const block = page.locator(selector);
    await expect(block).toHaveCSS("background-color", selector === ".portfolio-project-page" ? "rgb(230, 224, 215)" : "rgba(0, 0, 0, 0)");
    await expect(block).toHaveCSS("border-top-width", "0px");
    await expect(block).toHaveCSS("border-radius", "0px");
  }
  const report = page.locator(".portfolio-project-page");
  await expect(report).toHaveCSS("background-image", "none");
  expect(await report.evaluate(element => ["::before", "::after"].map(pseudo => getComputedStyle(element, pseudo).content))).toEqual(["none", "none"]);
});

for (const slug of ["online-shop", "vertragsgenerator", "enbt-botanic", "sprachdienstleistungen", "notenrechner", "wohnungssuche-bodensee"]) {
  test(`${slug}: server report matches the API-backed client fallback`, async ({ page, isMobile }) => {
    test.setTimeout(90000);
    const snapshot = () => page.evaluate(() => {
      const root = document.querySelector(".home-main");
      const properties = ["display", "width", "height", "padding", "gap", "color", "fontSize", "lineHeight"];
      return {
        elements: [...root.querySelectorAll("*")].filter(element => !element.closest("svg")).map(element => ({
          tag: element.tagName, classes: [...element.classList].sort(),
          style: Object.fromEntries(properties.map(property => [property, getComputedStyle(element)[property]])),
        })),
        copy: [...root.querySelectorAll("h1,h2,p,strong,small,.portfolio-card__type,.portfolio-card__status,.portfolio-card__trust")].map(element => element.textContent.trim()),
        images: [...root.querySelectorAll("img")].map(image => [image.getAttribute("src"), image.getAttribute("srcset"), image.getAttribute("sizes")]),
        actions: [...root.querySelectorAll("a")].map(link => [link.getAttribute("href"), link.getAttribute("target"), link.textContent.trim()]),
      };
    });
    const url = `/projekte/${slug}`;
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const native = await snapshot();
    // Simulate a build lacking its HTML marker to exercise the actual fallback.
    await page.route(`**${url}`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("data-project-detail-rendered", "data-client-fallback-test") });
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await expect(page.locator("[data-client-fallback-test]")).toHaveCount(0);
    await expect(page.locator(".portfolio-project-hero h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await snapshot(), `${slug} at ${isMobile ? "mobile" : "desktop"} width`).toEqual(native);
  });
}

test("filtered report CSS preserves the full cascade at phone, tablet and desktop widths", async ({ page }) => {
  test.setTimeout(90000);
  const root = path.resolve(__dirname, "../../../server/assets/portfolio-dist");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".vite/manifest.json"), "utf8"));
  const fullCss = ["src/site.css"]
    .map(entry => fs.readFileSync(path.join(root, manifest[entry].file), "utf8")).join("\n");
  await page.goto("/projekte/online-shop");
  const style = page.locator('style[data-vite-inline="src/project-detail-page.css"]');
  const filteredCss = await style.textContent();
  await page.evaluate(() => document.fonts.ready);
  const measure = () => page.evaluate(() => {
    const properties = ["display", "width", "height", "gap", "padding", "margin", "color", "backgroundColor", "fontFamily", "fontSize", "fontWeight", "lineHeight", "border", "gridTemplateColumns"];
    return Array.from(document.querySelectorAll(".site-shell, .site-header, .site-header-nav, .site-footer, .portfolio-project-hero, .portfolio-project-hero *, .portfolio-project-page, .portfolio-project-page *"))
      .filter(element => !element.closest("svg"))
      .map(element => ({ tag: element.tagName, class: element.className, ...Object.fromEntries(properties.map(property => [property, getComputedStyle(element)[property]])) }));
  });
  for (const width of [320, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await style.evaluate((element, css) => { element.textContent = css; }, filteredCss);
    const filtered = await measure();
    await style.evaluate((element, css) => { element.textContent = css; }, fullCss);
    expect(await measure(), `full cascade differs at ${width}px`).toEqual(filtered);
  }
});
