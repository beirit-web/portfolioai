const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
});

test("project overview shows technology logos and the independent grade calculator", async ({ page }) => {
  await page.goto("/projekte/");
  await expect(page.locator(".project-overview-card")).toHaveCount(6);
  await expect(page.locator(".project-filter-bar, .project-filter-button, .page-hero .eyebrow")).toHaveCount(0);
  const gradeCard = page.locator(".project-overview-card--notenrechner");
  await expect(gradeCard.locator(".technology-tag")).toHaveText(["JavaScript", "HTML", "CSS"]);
  await expect(gradeCard.locator(".technology-tag img")).toHaveCount(3);
  await gradeCard.scrollIntoViewIfNeeded();
  await expect.poll(() => gradeCard.locator(".technology-tag img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await gradeCard.locator(".project-overview-card__button").click();
  const start = page.locator(".portfolio-project-hero .portfolio-contact-button");
  await expect(start).toHaveText("Projekt starten");
  await expect(start).toHaveAttribute("href", "/static/portfolio/test-main/index.html");
  await start.click();
  await expect(page).toHaveURL(/\/static\/portfolio\/test-main\/index\.html$/);
  await page.locator("#name").fill("Test");
  await page.locator('[data-action="start"]').click();
  await page.locator("#subjects").fill("2");
  await page.locator('[data-action="subjects"]').click();
  await page.locator("#grade-0").fill("2");
  await page.locator("#grade-1").fill("4");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#resultContent")).toContainText("3,0");
});

test("carousel footer keeps the action beside the index and loads the card illustrations", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator("#kompetenzen").scrollIntoViewIfNeeded();
  await expect(page.locator(".service-card-grid .service-card__svg")).toHaveCount(3);
  await expect(page.locator(".problems-grid .problem-card__svg")).toHaveCount(6);
  await expect.poll(() => page.locator(".service-card__svg, .problem-card__svg").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const card = page.locator(".portfolio-carousel .portfolio-card.is-active");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".portfolio-card__action")).toHaveText("Projektinformationen");
  const action = await card.locator(".portfolio-card__action").boundingBox();
  const index = await card.locator(".portfolio-card__index").boundingBox();
  expect(index.x - action.x - action.width).toBeLessThan(16);
  expect(index.x).toBeGreaterThan(action.x);
  expect(Math.abs(action.y + action.height / 2 - index.y - index.height / 2)).toBeLessThan(2);
  const liveStyle = await card.locator(".portfolio-card__live").evaluate(element => {
    const style = getComputedStyle(element);
    return [style.borderTopWidth, style.borderRadius, style.backgroundColor];
  });
  expect(liveStyle).toEqual(["0px", "0px", "rgba(0, 0, 0, 0)"]);
  await page.screenshot({ path: testInfo.outputPath("carousel.png") });
});

test("technology backgrounds appear only on hover", async ({ page, isMobile }) => {
  test.skip(isMobile, "Hover applies to pointer devices.");
  await page.goto("/projekte/");
  const tag = page.locator(".project-overview-card--online-shop .technology-tag").first();
  await tag.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(tag).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(tag).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await tag.hover();
  await expect(tag).toHaveCSS("background-color", "rgb(241, 245, 249)");
  await expect(tag).toHaveCSS("border-top-color", "rgb(219, 227, 235)");
});

test("the hero gives direct access to projects and contact even on a small screen", async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const projects = page.getByRole("link", { name: "Projekte ansehen", exact: true });
  const contact = page.getByRole("link", { name: "Kontakt aufnehmen", exact: true });
  await expect(projects).toBeInViewport({ ratio: 1 });
  await expect(contact).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".hero-stage__tagline")).toContainText("Eugen Beirit");
  await projects.click();
  await expect(page).toHaveURL(/\/projekte$/);
  await expect(page.locator(".project-overview-card")).toHaveCount(6);
  if (isMobile) await page.locator(".site-nav-toggle").click();
  const navigation = page.locator(isMobile ? "#site-mobile-navigation" : "#site-navigation");
  await expect(navigation.getByRole("link", { name: "Projekte", exact: true })).toHaveAttribute("href", "/projekte");
  await expect(navigation.getByRole("link", { name: "Projekte", exact: true })).toHaveAttribute("aria-current", "page");
});

test("project reports show current implementation, a decision and real loaded screenshots", async ({ page }) => {
  for (const slug of ["sprachdienstleistungen", "online-shop", "vertragsgenerator", "wohnungssuche-bodensee", "notenrechner", "enbt-botanic"]) {
    await page.goto(`/projekte/${slug}`);
    await expect(page.locator(".portfolio-project-decision")).toContainText("Technische Entscheidung");
    await expect(page.locator(".portfolio-project-decision p")).not.toBeEmpty();
    const gallery = page.locator(".portfolio-project-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator("img")).toHaveCount(2);
    await expect.poll(() => gallery.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
    if (slug === "vertragsgenerator") {
      await expect(page.locator(".portfolio-card__implementation")).toContainText("Django");
      await expect(page.locator("main")).not.toContainText("Ohne Backend nutzbar");
    }
    if (slug === "sprachdienstleistungen") {
      await expect(page.locator(".portfolio-card__status")).toHaveText("Portfolio-Fallstudie");
    }
  }
});
