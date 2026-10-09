const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8766(?:\/|$))/, route => route.abort());
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test("learning module and account links belong to the same platform", async ({ page }) => {
  await page.goto("/");
  await page.locator('#funktionen a[href="/deutschlive/"]').click();
  await expect(page.locator(".app-nav__brand")).toContainText("DeutschLive");
  await expect(page.locator('a.app-nav__close-project')).toHaveAttribute("href", "/");
  await page.goto("/deutschlive/account");
  await expect(page.getByRole("heading", { name: "Konto der Sprachplattform" })).toBeVisible();
  await expect(page.locator('a[href="/register/"]')).toBeVisible();
  await page.locator('a[href^="/login/?next="]').click();
  await page.locator('input[name="username"]').fill("lernen@example.test");
  await page.locator('input[name="password"]').fill("Browser-Lernen-2026!");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL("/deutschlive/dashboard");
  await expect(page.locator('.app-nav__account-button').first()).toContainText("lernen@example.test");
  const me = await page.request.get("/deutschlive/api/auth/me/");
  expect((await me.json()).user.username).toBe("lernen@example.test");
  expect((await page.request.get("/api/session/status/")).status()).toBe(200);
  const csrf = (await (await page.request.get("/deutschlive/api/auth/csrf/")).json()).csrfToken;
  const saved = await page.request.post("/deutschlive/api/progress/", {
    data: { topicId: "baeckerei", status: "completed" }, headers: { "X-CSRFToken": csrf },
  });
  expect(saved.status()).toBe(201);
  await page.goto("/vokabelbox/");
  await expect(page.locator("[data-storage-key]")).toHaveAttribute("data-storage-key", /user-\d+$/);
  await page.goto("/deutschlive/account");
  await expect(page.locator('a[href="/profil/"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page.locator('a[href^="/login/?next="]')).toBeVisible();
  expect((await page.request.get("/api/session/status/")).status()).toBe(401);
});

test("learning and recording legal pages load on small and large screens", async ({ page }) => {
  for (const path of ["learn", "quiz", "grades", "recordings", "datenschutz", "nutzungsbedingungen"]) {
    const response = await page.goto(`/deutschlive/${path}`);
    expect(response.status()).toBe(200);
    await expect(page.locator(".app-footer")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
    if (path === "datenschutz") await expect(page.locator("main")).toContainText("Eigene Aufnahmen – lokale Verarbeitung");
    if (path === "nutzungsbedingungen") await expect(page.locator("main")).toContainText("Lokale Nutzung und Dateisicherung");
  }
});
