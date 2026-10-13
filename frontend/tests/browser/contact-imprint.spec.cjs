const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function fillContact(form) {
  await form.getByLabel("Name", { exact: true }).fill("Portfolio-Demo");
  await form.getByLabel("E-Mail-Adresse", { exact: true }).fill("demo@example.test");
  await form.getByLabel("Betreff", { exact: true }).fill("Frage zum Projekt");
  await form.getByLabel("Nachricht", { exact: true }).fill("Lokale Browserprüfung mit simulierter Antwort.");
}

async function fits(page) {
  const width = page.viewportSize().width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
}

test("contact can be identified by role and labels, requires consent and reports submission states", async ({ page }) => {
  let deliveries = 0;
  let release;
  await page.route("**/api/contact/", async route => {
    deliveries++;
    const body = route.request().postData();
    expect(body).toContain('name="privacy_consent"');
    expect(body).toContain("demo@example.test");
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ json: { ok: true, message: "Lokale Anfrage bestätigt." } });
  });
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { name: "Kontakt", exact: true, level: 1 })).toBeVisible();
  const form = page.getByRole("form", { name: "Kontaktformular", exact: true });
  const submit = form.getByRole("button", { name: "Nachricht senden", exact: true });
  const status = form.locator("#contact-form-status");
  await expect(status).toHaveCount(1);
  await expect(form).toHaveAttribute("method", "post");
  await submit.click();
  await expect(form.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(form.getByLabel("Name", { exact: true })).toHaveAttribute("aria-describedby", "name-error");
  await fillContact(form);
  await submit.click();
  await expect(form.getByRole("checkbox")).toBeFocused();
  await expect(form.getByRole("alert")).toContainText("Bitte prüfen");
  expect(deliveries).toBe(0);
  await form.getByRole("checkbox").check();
  await expect(form.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
  await expect(form.getByRole("link", { name: "Datenschutzerklärung öffnen" })).toHaveAttribute("href", /\/datenschutz\/$/);
  try {
    await submit.click();
    await expect(form).toHaveAttribute("aria-busy", "true");
    await expect(form.getByRole("button", { name: "Wird gesendet...", exact: true })).toBeDisabled();
    await expect(form.getByLabel("Name", { exact: true })).toBeDisabled();
    await expect(status).toContainText("übertragen");
    await expect.poll(() => deliveries).toBe(1);
    await form.evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
    expect(deliveries).toBe(1);
  } finally {
    if (release) release();
  }
  await expect(status).toContainText("Lokale Anfrage bestätigt.");
  await expect(status).toContainText("demo@example.test");
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await expect(submit).toBeEnabled();
  await form.getByLabel("Name", { exact: true }).fill("Neue Anfrage");
  await expect(status).toBeEmpty();
  await fits(page);
});

test("mobile menus remain visible on home and contact at narrow widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile width matrix runs once.");
  for (const path of ["/", "/kontakt"]) {
    await page.goto(path);
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({ width, height: 844 });
      const toggle = page.getByRole("button", { name: "Menü öffnen", exact: true });
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(page.locator("#site-mobile-navigation")).toBeVisible();
      await expect(page.locator("#site-mobile-navigation").getByRole("link", { name: "Kontakt", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await fits(page);
    }
  }
});

for (const [name, path] of [["imprint", "/impressum"], ["privacy", "/datenschutz/"]]) {
test(`${name} navigation supports keyboard, outside click, resize and direct contact links`, async ({ page }, testInfo) => {
  await page.goto(path);
  const nav = page.getByRole("navigation", { name: "Hauptnavigation", exact: true });
  const toggle = nav.locator(".imprint-nav__toggle");
  const links = nav.locator("#imprint-navigation-links");
  if (testInfo.project.name === "desktop") {
    await expect(toggle).toBeHidden();
    await expect(links.getByRole("link")).toHaveCount(5);
    await expect(links).toBeVisible();
  }
  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(toggle).toBeVisible();
    await expect(links).toBeHidden();
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAccessibleName("Menü schließen");
    await page.keyboard.press("Tab");
    await expect(links.getByRole("link", { name: "Startseite", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(links).toBeHidden();
    await toggle.click();
    for (const link of await links.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: testInfo.outputPath(`${name}-menu-${width}.png`) });
    await page.getByRole("heading", { level: 1 }).click();
    await expect(links).toBeHidden();
    await fits(page);
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(toggle).toBeHidden();
  await expect(links).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("imprint-tablet.png") });
  await links.getByRole("link", { name: "Kontakt", exact: true }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.getByRole("form", { name: "Kontaktformular" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("contact-tablet.png") });
});

test(`${name} links remain available without JavaScript`, async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: page.viewportSize() });
  try {
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
    const plain = await context.newPage();
    await plain.goto(`http://127.0.0.1:8765${path}`);
    const nav = plain.getByRole("navigation", { name: "Hauptnavigation" });
    await expect(nav.getByRole("link")).toHaveCount(6);
    for (const link of await nav.getByRole("link").all()) await expect(link).toBeVisible();
    await expect(nav.getByRole("button", { includeHidden: true })).toBeHidden();
    await fits(plain);
  } finally {
    await context.close();
  }
});
}

test("privacy has readable lists, adjacent contact links and graphite footer states", async ({ page }) => {
  await page.addInitScript(() => {
    window.privacyLayoutShifts = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.privacyLayoutShifts += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const loaded = [];
  page.on("request", request => loaded.push(request.url()));
  await page.goto("/datenschutz/");
  const responsible = page.getByRole("region", { name: "Verantwortliche Stelle", exact: true });
  await expect(responsible).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.privacyLayoutShifts)).toBeLessThan(.001);
  const groups = page.getByRole("region", { name: "Kontaktformular und Anfragen", exact: true })
    .locator(".privacy-contact-columns > div");
  await expect(groups).toHaveCount(2);
  const groupBounds = await groups.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()));
  if (page.viewportSize().width >= 768) {
    expect(Math.abs(groupBounds[0].top - groupBounds[1].top)).toBeLessThan(1);
    expect(groupBounds[1].left).toBeGreaterThan(groupBounds[0].right);
  } else {
    expect(groupBounds[1].top).toBeGreaterThan(groupBounds[0].bottom);
  }
  const rights = page.getByRole("region", { name: "Ihre Rechte", exact: true }).getByRole("list");
  const rightColumns = await rights.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(rightColumns).toBe(page.viewportSize().width >= 768 ? 4 : 1);
  const contactLinks = responsible.locator(".privacy-contact-links a");
  await expect(contactLinks).toHaveCount(2);
  if (page.viewportSize().width >= 768) {
    const boxes = await contactLinks.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().y));
    expect(Math.abs(boxes[0] - boxes[1])).toBeLessThan(1);
  }
  expect(await page.locator(".legal-section li").evaluateAll(elements => elements.every(el =>
    getComputedStyle(el, "::before").content === "none" && getComputedStyle(el).listStyleType === "disc"
  ))).toBe(true);
  const footer = page.locator("footer.site-footer");
  await footer.scrollIntoViewIfNeeded();
  const links = footer.getByRole("link");
  await expect(links).toHaveCount(5);
  const positions = await links.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().y));
  expect(Math.abs(positions[0] - positions[1])).toBeLessThan(1);
  await expect(links.first()).toHaveCSS("color", "rgb(82, 82, 82)");
  await links.first().hover();
  await expect(links.first()).toHaveCSS("color", "rgb(23, 23, 23)");
  await links.first().focus();
  await expect(links.first()).toHaveCSS("outline-color", "rgb(82, 82, 82)");
  await fits(page);
  expect(loaded.some(url => /\/static\/(?:css\/main\.css|js\/(?:main|i18n-data)\.js)/.test(url))).toBe(false);
});
