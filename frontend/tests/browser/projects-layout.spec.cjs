const { test, expect } = require("@playwright/test");

test("offscreen project bodies defer layout and remain reachable by keyboard", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Content visibility applies to the single-column mobile layout.");
  await page.addInitScript(() => {
    window.projectVisibilityEvents = [];
    document.addEventListener("contentvisibilityautostatechange", event => {
      if (event.target.classList.contains("project-overview-card__body")) {
        window.projectVisibilityEvents.push({ body: event.target, skipped: event.skipped });
      }
    }, true);
  });
  await page.goto("/projekte");
  const card = page.locator(".project-overview-card").last();
  const body = card.locator(".project-overview-card__body");
  await expect.poll(() => body.evaluate(element => (
    window.projectVisibilityEvents.filter(event => event.body === element).at(-1)?.skipped
  ))).toBe(true);

  const details = card.locator(".project-overview-card__button");
  // Traverse the actual keyboard order. Frames between inputs let the browser
  // realize nearby bodies as the viewport advances through the project list.
  for (let step = 0; step < 50; step += 1) {
    await page.keyboard.press("Tab");
    await page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    if (await details.evaluate(element => document.activeElement === element)) break;
  }
  await expect(details).toBeFocused();
  await expect(details).toBeInViewport();
  await expect.poll(() => body.evaluate(element => (
    window.projectVisibilityEvents.filter(event => event.body === element).at(-1)?.skipped
  ))).toBe(false);
  await expect.poll(() => card.locator(".technology-tag img").evaluateAll(images => (
    images.every(image => image.complete && image.naturalWidth > 0)
  ))).toBe(true);

  const before = await body.boundingBox();
  await body.evaluate(element => { element.style.contentVisibility = "visible"; });
  const after = await body.boundingBox();
  expect(Math.abs(before.height - after.height)).toBeLessThan(1);
  expect(Math.abs(before.width - after.width)).toBeLessThan(1);

  // Multi-column rows use their natural heights after crossing the breakpoint.
  await page.setViewportSize({ width: 820, height: 1180 });
  await body.evaluate(element => { element.style.removeProperty("content-visibility"); });
  await expect(body).toHaveCSS("content-visibility", "visible");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
});
