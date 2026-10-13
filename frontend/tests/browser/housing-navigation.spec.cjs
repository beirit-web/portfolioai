const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/static/portfolio/wohnungssuche/index.html");
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

async function openMenu(page) {
  const opener = page.getByRole("button", { name: "Navigation-Menü öffnen", exact: true });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "Hauptnavigation", exact: true })).toBeVisible();
  await expect(page.locator(".mobile-menu-button")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".mobile-menu-button")).toHaveAttribute("aria-controls", "housing-mobile-navigation");
}

async function expectClosed(page) {
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".mobile-menu-button")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".housing-nav-backdrop")).toBeHidden();
  expect(await page.locator(".workspace").evaluate(element => element.inert)).toBe(false);
  await expect.poll(() => page.locator("body").evaluate(element => element.style.position)).not.toBe("fixed");
}

test("opener, close button, backdrop and Escape close the menu without leaving a blocked page", async ({ page }) => {
  for (const method of ["opener", "close", "backdrop", "escape"]) {
    await openMenu(page);
    expect(await page.locator(".workspace").evaluate(element => element.inert)).toBe(true);
    if (method === "opener") await page.getByRole("button", { name: "Navigation-Menü schließen", exact: true }).click();
    if (method === "close") await page.getByRole("button", { name: "Menü schließen", exact: true }).click();
    if (method === "backdrop") await page.locator(".housing-nav-backdrop").click({ position: { x: 380, y: 100 } });
    if (method === "escape") await page.keyboard.press("Escape");
    await expectClosed(page);
    await expect(page.locator(".mobile-menu-button")).toBeFocused();
    await page.locator(".searchbox input").fill(method);
  }
});

test("keyboard focus stays in the open menu and returns to the opener", async ({ page }) => {
  await openMenu(page);
  const menu = page.getByRole("dialog", { name: "Hauptnavigation" });
  await expect(menu.getByRole("button", { name: "Dashboard", exact: true })).toBeFocused();
  const close = menu.getByRole("button", { name: "Menü schließen", exact: true });
  const last = menu.getByRole("link", { name: "Zur Startseite der Wohnungssuche Bodensee", exact: true });
  await last.focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Escape");
  await expectClosed(page);
  await expect(page.locator(".mobile-menu-button")).toBeFocused();
});

test("every navigation entry closes the menu and browser back does not reopen it", async ({ page }) => {
  for (const [name, heading] of [
    ["Angebote", "Angebote"], ["Suchprofile", "Suchprofile"], ["Quellen", "Quellen"],
    ["Benachrichtigungen", "Benachrichtigungen"], ["Information", "Über diese Anwendung"], ["Dashboard", "Dashboard"],
  ]) {
    await openMenu(page);
    await page.getByRole("dialog", { name: "Hauptnavigation" }).getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expectClosed(page);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeFocused();
  }
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Über diese Anwendung" })).toBeVisible();
  await expectClosed(page);
});

test("Login and registration never leave a stale open menu when returning to the dashboard", async ({ page }) => {
  for (const entry of ["Login", "Registrieren"]) {
    await openMenu(page);
    await page.getByRole("dialog", { name: "Hauptnavigation" }).getByRole("button", { name: entry, exact: true }).click();
    await expect(page.locator(".login-panel")).toBeVisible();
    await expect(page.locator(".housing-nav-backdrop")).toBeHidden();
    await expect.poll(() => page.locator("body").evaluate(element => element.style.position)).not.toBe("fixed");
    await page.getByRole("button", { name: "Dashboard im Demo-Modus ansehen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expectClosed(page);
  }
});

test("scroll position is restored and switching to desktop releases the mobile menu", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 600));
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);
  await openMenu(page);
  await page.keyboard.press("Escape");
  await expectClosed(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
  await openMenu(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".housing-nav-backdrop")).toBeHidden();
  await expect(page.locator(".mobile-menu-button")).toHaveAttribute("aria-expanded", "false");
  expect(await page.locator(".workspace").evaluate(element => element.inert)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectClosed(page);
});

test("all menu actions are reachable on short screens", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    await openMenu(page);
    const menu = page.getByRole("dialog", { name: "Hauptnavigation" });
    expect(await menu.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(viewport.height);
    await menu.getByRole("link", { name: "Zur Startseite der Wohnungssuche Bodensee", exact: true }).scrollIntoViewIfNeeded();
    await expect(menu.getByRole("link", { name: "Zur Startseite der Wohnungssuche Bodensee", exact: true })).toBeInViewport();
    await page.keyboard.press("Escape");
    await expectClosed(page);
  }
});

test("the menu and account pages return to the housing project page on phones and desktop", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["dashboard", "login", "register"]) {
      await page.goto(`/static/portfolio/wohnungssuche/index.html#${route}`);
      if (route === "dashboard" && width <= 980) await openMenu(page);
      const container = route === "dashboard" ? page.locator(".sidebar") : page.locator(".login-panel");
      const home = container.getByRole("link", { name: "Zur Startseite der Wohnungssuche Bodensee", exact: true });
      await expect(home).toHaveAttribute("href", "/projekte/wohnungssuche-bodensee");
      await home.click();
      await expect(page).toHaveURL("http://127.0.0.1:8765/projekte/wohnungssuche-bodensee");
      await expect(page.locator(".app-shell .workspace")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Wohnungssuche Bodensee", exact: true })).toBeVisible();
    }
  }
});

test("dashboard links directly to the housing project page and its demo can be reopened", async ({ page }, testInfo) => {
  for (const width of [320, 390, 812, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    const home = page.locator(".workspace .page-header").getByRole("link", {
      name: "Zur Startseite der Wohnungssuche Bodensee", exact: true,
    });
    await expect(home).toBeVisible();
    await expect(home).toBeInViewport();
    await expect(home).toHaveAttribute("href", "/projekte/wohnungssuche-bodensee");
    expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390 || width === 1440) await page.screenshot({
      path: `../runtime/browser-checks/previews/${testInfo.project.name}-housing-home-link-${width}.png`,
    });
    await home.click();
    await expect(page).toHaveURL("http://127.0.0.1:8765/projekte/wohnungssuche-bodensee");
    await expect(page.getByRole("heading", { name: "Wohnungssuche Bodensee", exact: true })).toBeVisible();
    await page.locator('.portfolio-project-hero--wohnungssuche-bodensee a[href="/static/portfolio/wohnungssuche/index.html"]').click();
    await expect(page).toHaveURL("http://127.0.0.1:8765/static/portfolio/wohnungssuche/index.html");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  }
});
