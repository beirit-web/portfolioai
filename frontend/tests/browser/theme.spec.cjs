const { test, expect } = require("@playwright/test");

const paths = ["/", "/kompetenzen/", "/ueber-mich/", "/projekte/", "/kontakt/", "/botanic/wetter/", "/impressum/", "/datenschutz/"];

async function colors(page) {
  return page.locator("html, body, header, main, section, h1, h2, h3, p, label, input, textarea, select, footer")
    .evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        background: style.backgroundColor,
        image: style.backgroundImage,
        border: style.borderColor,
        scheme: style.colorScheme,
      };
    }));
}

for (const path of paths) {
  test(`${path}: keeps the light design with a dark system preference`, async ({ context, page }) => {
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
    await page.emulateMedia({ colorScheme: "dark" });
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    if (path === "/kontakt/") await expect(page.locator("#name")).toBeVisible();
    else await expect(page.locator("h1").first()).toBeVisible();
    await page.evaluate(() => window.BEIRIT_LOAD_DEFERRED_CSS?.());
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    expect(await page.locator("html").evaluate(element => getComputedStyle(element).colorScheme)).toBe("light");
    const darkPreference = await colors(page);

    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => colors(page)).toEqual(darkPreference);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => colors(page)).toEqual(darkPreference);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });
}
