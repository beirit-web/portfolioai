const { test, expect } = require("@playwright/test");

test.use({ reducedMotion: "no-preference" });

test.beforeEach(async ({ context, page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
  page.browserErrors = [];
  page.on("pageerror", error => page.browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") page.browserErrors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(page.browserErrors).toEqual([]);
});

const readyCanvas = page => page.locator(".hero-stage__wave-grid-canvas.is-ready");

test("initial page load does not request Three.js before interaction", async ({ page }) => {
  const animationRequests = [];
  page.on("request", request => {
    if (/\/(three-vendor|WaveGridHero)-[^/]+\.js/.test(request.url())) {
      animationRequests.push(request.url());
    }
  });
  await page.goto("/");
  await expect(page.locator(".hero-stage__headline")).toBeVisible();
  await page.waitForTimeout(1200);
  expect(animationRequests).toEqual([]);
  await expect(page.locator(".hero-stage__wave-grid-canvas")).toHaveCount(0);
  await page.keyboard.press("Shift");
  await expect(readyCanvas(page)).toBeVisible();
  expect(animationRequests.length).toBeGreaterThan(0);
});

test("hero renders moving cubes on desktop and touch devices", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawElementsInstanced;
    WebGL2RenderingContext.prototype.drawElementsInstanced = function (...args) {
      const result = draw.apply(this, args);
      this.canvas.dataset.renderedFrames = String(Number(this.canvas.dataset.renderedFrames || 0) + 1);
      return result;
    };
  });
  await page.goto("/");
  await page.keyboard.press("Shift");
  const canvas = readyCanvas(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).not.toHaveAttribute("data-wave-grid-error", "true");
  const frameCount = () => canvas.evaluate(element => Number(element.dataset.renderedFrames || 0));
  await expect.poll(frameCount).toBeGreaterThan(0);
  const initialFrame = await frameCount();
  await expect.poll(frameCount).toBeGreaterThan(initialFrame);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("hero.png") });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => canvas.evaluate(element => {
    return element.getBoundingClientRect().bottom <= 0;
  })).toBe(true);
  await page.waitForTimeout(200);
  const pausedFrame = await frameCount();
  await page.waitForTimeout(300);
  expect(await frameCount()).toBe(pausedFrame);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(frameCount).toBeGreaterThan(pausedFrame);
});

test("hardware and connection estimates use an animation instead of hiding it", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { value: 2, configurable: true });
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 2, configurable: true });
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "3g", saveData: false }, configurable: true,
    });
  });
  await page.goto("/");
  await page.keyboard.press("Shift");
  await expect(readyCanvas(page)).toBeVisible();
});

test("motion preferences can disable and restore the animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Shift");
  await expect(page.locator(".hero-stage__headline")).toBeVisible();
  await expect(page.locator(".hero-stage__wave-grid-canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Shift");
  await expect(readyCanvas(page)).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hero-stage__wave-grid-canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Shift");
  await expect(readyCanvas(page)).toBeVisible();
});

test("data saving can disable and restore the animation", async ({ page }) => {
  await page.addInitScript(() => {
    const connection = new EventTarget();
    connection.saveData = true;
    Object.defineProperty(navigator, "connection", { value: connection, configurable: true });
  });
  await page.goto("/");
  await page.keyboard.press("Shift");
  await expect(page.locator(".hero-stage__headline")).toBeVisible();
  await expect(page.locator(".hero-stage__wave-grid-canvas")).toHaveCount(0);
  await page.evaluate(() => {
    navigator.connection.saveData = false;
    navigator.connection.dispatchEvent(new Event("change"));
  });
  await expect(readyCanvas(page)).toBeVisible();
  await page.evaluate(() => {
    navigator.connection.saveData = true;
    navigator.connection.dispatchEvent(new Event("change"));
  });
  await expect(page.locator(".hero-stage__wave-grid-canvas")).toHaveCount(0);
});

test("the animation stays visible when a small window grows", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop window resize.");
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Shift");
  await expect(readyCanvas(page)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(readyCanvas(page)).toBeVisible();
  await expect.poll(() => readyCanvas(page).evaluate(canvas => canvas.clientWidth)).toBe(1440);
});
