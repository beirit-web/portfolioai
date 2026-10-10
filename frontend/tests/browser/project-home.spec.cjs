const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

for (const [slug, routes] of [
  ["online-shop", ["/shop/", "/shop/warenkorb/"]],
  ["vertragsgenerator", ["/vertragsgenerator/", "/vertragsgenerator/?template=vehicle"]],
  ["enbt-botanic", ["/botanic/", "/botanic/wetter/"]],
]) {
  test(`${slug} returns to its own project page from the app and its subpages`, async ({ page }) => {
    for (const route of routes) {
      await page.goto(route);
      const home = slug === "online-shop"
        ? page.getByRole("navigation", { name: "Shop-Schnellnavigation", exact: true }).getByRole("link", { name: "Zur Startseite des Torten- und Kuchen-Shops", exact: true })
        : page.getByRole("navigation", { name: "Projekt", exact: true }).getByRole("link");
      await expect(home).toBeVisible();
      await expect(home).toBeInViewport();
      await expect(home).toHaveAttribute("href", `/projekte/${slug}`);
      expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
      await home.click();
      await expect(page).toHaveURL(`http://127.0.0.1:8765/projekte/${slug}`);
      await expect(page.locator(`.portfolio-project-hero--${slug}`)).toBeVisible();
    }
  });
}

test("the old recordings archive returns to the language platform project page", async ({ page }) => {
  await page.goto("/deutschlive/recordings-archiv");
  const home = page.getByRole("link", { name: "Zur Projektstartseite", exact: true });
  await expect(home).toBeInViewport();
  await home.click();
  await expect(page).toHaveURL("http://127.0.0.1:8765/projekte/sprachdienstleistungen");
  await expect(page.locator(".portfolio-project-hero--sprachdienstleistungen")).toBeVisible();
});
