const { test, expect } = require("@playwright/test");
const { withoutEmbeddedProjects } = require("./helpers/portfolioConfig.cjs");
const fs = require("node:fs");
const nodePath = require("node:path");
const previews = nodePath.resolve(__dirname, "../../../runtime/browser-checks/previews");
fs.mkdirSync(previews, { recursive: true });

test.beforeEach(async ({ context, page }) => {
  // All browser checks stay local; no external APIs or form deliveries.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.browserErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.browserErrors, "Uncaught browser errors").toEqual([]);
});

async function open(page, path, { waitForProjectsApi = /^\/projekte\/[^/?#]/.test(path) } = {}) {
  const projectsResponse = waitForProjectsApi
    ? page.waitForResponse(response => new URL(response.url()).pathname === "/api/projects/")
    : null;
  const response = await page.goto(path);
  expect(response.status()).toBe(200);
  await expect(page.locator(".site-header")).toBeVisible();
  if (path.startsWith("/kontakt")) await expect(page.locator("#name")).toBeVisible();
  else await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("[data-intro-loader]")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  if (projectsResponse) {
    await (await projectsResponse).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
}

async function layout(page) {
  const width = page.viewportSize().width;
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  const bounds = await page.locator("h1, .site-logo, .site-nav-toggle, form input:not([type=hidden]), form textarea, form button")
    .evaluateAll(elements => elements.filter(element => {
      const style = getComputedStyle(element);
      return element.getClientRects().length && style.visibility !== "hidden"
        && !element.closest('[aria-hidden="true"], [inert]') && !element.classList.contains("contact-form__honeypot");
    }).map(element => ({ name: element.tagName, ...element.getBoundingClientRect().toJSON() })));
  for (const box of bounds) {
    expect(box.left, `${box.name} left`).toBeGreaterThanOrEqual(-1);
    expect(box.right, `${box.name} right`).toBeLessThanOrEqual(width + 1);
  }
  await expect.poll(() => page.locator(".site-logo img").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
}

for (const [name, path] of [["home", "/"], ["skills", "/kompetenzen/"], ["about", "/ueber-mich/"], ["projects", "/projekte/"], ["contact", "/kontakt/"]]) {
  test(`${name}: renders without overflow and provides a visual preview`, async ({ page }, testInfo) => {
    await open(page, path);
    if (name === "home") {
      await page.mouse.wheel(0, 650);
      await expect(page.locator("#kompetenzen")).toBeVisible();
      await page.locator("#referenzen").scrollIntoViewIfNeeded();
      await expect(page.locator(".portfolio-carousel__slide.is-active")).toBeVisible();
      await expect.poll(() => page.locator(".portfolio-carousel__slide.is-active img").evaluateAll(images => images.length > 0 && images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
    }
    await layout(page);
    // Paint offscreen sections and lazy images for the full-page review image.
    // Layout assertions above run with the application's original rendering settings.
    await page.locator("img").evaluateAll(images => images.forEach(img => { img.loading = "eager"; }));
    await expect.poll(() => page.locator("img").evaluateAll(images => images
      .filter(img => new URL(img.currentSrc || img.src, location.href).origin === location.origin)
      .every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    await page.locator("img").evaluateAll(images => Promise.all(images
      .filter(img => new URL(img.currentSrc || img.src, location.href).origin === location.origin)
      .map(img => img.decode())));
    await page.addStyleTag({ content: ".home-main > section { content-visibility: visible !important; }" });
    await testInfo.attach(`${name}-preview`, { body: await page.screenshot({ path: nodePath.join(previews, `${testInfo.project.name}-${name}.png`), fullPage: true, animations: "disabled" }), contentType: "image/png" });
  });
}

test("navigation supports menu, keyboard, browser history and reload", async ({ page }, testInfo) => {
  await open(page, "/");
  if (testInfo.project.name === "mobile") {
    const toggle = page.locator(".site-nav-toggle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#site-mobile-navigation a").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.locator('#site-mobile-navigation a[href="/kontakt"]').click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  } else {
    await page.locator('#site-navigation a[href="/kontakt"]').click();
  }
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.locator("#name")).toBeVisible();
  await expect(page).toHaveTitle(/Kontakt/);
  await page.reload();
  await expect(page.locator("#name")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page.locator("#name")).toBeVisible();
});

async function fillContact(page, desktop) {
  await page.locator("#name").fill("Browserprüfung");
  await page.locator("#email").fill("browser@example.test");
  await page.locator("#subject").fill("Prüfung der Kontaktfunktion");
  await page.locator("#message").fill("Lokaler Test mit simulierter Antwort.");
  await page.getByRole("checkbox").check();
}

test("contact validates input, sends CSRF and shows success", async ({ page, context }, testInfo) => {
  const desktop = testInfo.project.name === "desktop";
  let submitted = 0;
  const csrfToken = "a".repeat(32);
  await context.addCookies([{ name: "csrftoken", value: csrfToken, url: "http://127.0.0.1:8765" }]);
  await page.route("**/api/contact/", async route => {
    submitted++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrftoken"]).toBe(csrfToken);
    expect(route.request().postData()).toContain("browser@example.test");
    await route.fulfill({ json: { ok: true, message: "Testanfrage erhalten." } });
  });
  await open(page, "/kontakt/");
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  expect(submitted).toBe(0);
  await fillContact(page, desktop);
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#contact-form-status")).toContainText("Testanfrage erhalten.");
  await expect(page.locator("#contact-form-status")).toHaveAttribute("role", "status");
  for (const field of ["name", "email", "subject", "message"]) {
    await expect(page.locator(`#${field}`)).toHaveValue("");
  }
  expect(submitted).toBe(1);
});

test("portfolio supports keyboard selection and opening project details", async ({ page }) => {
  await open(page, "/#referenzen");
  const active = page.locator(".portfolio-carousel__slide.is-active");
  await expect(active).toBeVisible();
  const firstHref = await active.getAttribute("href");
  const viewport = page.locator(".portfolio-carousel__viewport");
  await viewport.focus();
  await page.keyboard.press("ArrowRight");
  await expect(active).not.toHaveAttribute("href", firstHref);
  await page.keyboard.press("ArrowLeft");
  await expect(active).toHaveAttribute("href", firstHref);
  await expect.poll(() => active.locator("img").evaluateAll(images => images.length > 0 && images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await active.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(firstHref));
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
});

test("projects stay available when the portfolio API fails", async ({ page }) => {
  await withoutEmbeddedProjects(page);
  await page.route("**/api/projects/", route => route.fulfill({ status: 503, json: { message: "Test: API unavailable" } }));
  await open(page, "/projekte/", { waitForProjectsApi: true });
  await expect(page.locator(".project-overview-card").first()).toBeVisible();
  const platform = page.locator(".project-overview-card--sprachdienstleistungen");
  await expect(platform.getByRole("heading", { name: "Sprachplattform mit Lernmodulen", exact: true })).toBeVisible();
  await expect(platform.getByRole("link", { name: "Projektbericht", exact: true })).toHaveAttribute("href", "/projekte/sprachdienstleistungen");
  await layout(page);
});

test("contact retains input on server errors and supports a retry after network failure", async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === "desktop";
  let attempt = 0;
  await page.route("**/api/contact/", async route => {
    attempt++;
    if (attempt === 1) return route.fulfill({ status: 400, json: { ok: false, errors: { email: [{ message: "Adresse bitte überprüfen." }] } } });
    if (attempt === 2) return route.abort("failed");
    return route.fulfill({ json: { ok: true, message: "Erneuter Versuch erfolgreich." } });
  });
  await open(page, "/kontakt/");
  await fillContact(page, desktop);
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#email")).toHaveValue("browser@example.test");
  await page.locator("#email").fill("retry@example.test");
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#contact-form-status")).toHaveAttribute("role", "alert");
  await expect(page.locator("#message")).toHaveValue("Lokaler Test mit simulierter Antwort.");
  await expect(page.locator('form button[type="submit"]')).toBeEnabled();
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#contact-form-status")).toContainText("Erneuter Versuch erfolgreich.");
  expect(attempt).toBe(3);
});

for (const endpoint of [undefined, "/api/custom-contact/"]) {
  test(`contact uses ${endpoint ? "the configured endpoint" : "the fallback endpoint"}`, async ({ page }, testInfo) => {
    await page.route("**/kontakt/", async route => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        /(<script id="beirit-home-config-data" type="application\/json">)([^<]*)(<\/script>)/,
        (_, start, json, end) => {
          const config = JSON.parse(json);
          if (endpoint) config.contactApiUrl = endpoint;
          else delete config.contactApiUrl;
          return `${start}${JSON.stringify(config)}${end}`;
        },
      );
      await route.fulfill({ response, body: html });
    });
    const expectedPath = endpoint || "/api/contact/";
    let submitted = false;
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "POST") return route.continue();
      expect(new URL(route.request().url()).pathname).toBe(expectedPath);
      submitted = true;
      await route.fulfill({ json: { ok: true, message: "Konfigurierter Versand geprüft." } });
    });
    await open(page, "/kontakt/");
    await fillContact(page, testInfo.project.name === "desktop");
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator("#contact-form-status")).toContainText("Konfigurierter Versand geprüft.");
    expect(submitted).toBe(true);
  });
}

test("layout stays usable at narrow and tablet widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Responsive matrix runs once");
  for (const [width, height] of [[320, 700], [768, 1024], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    for (const path of ["/", "/kontakt/", "/ueber-mich/"]) {
      await open(page, path);
      await layout(page);
    }
  }
});
