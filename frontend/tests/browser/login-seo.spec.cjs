const { test, expect } = require("@playwright/test");
const { readMetadata } = require("./helpers/metadata.cjs");
const { blockExternalRequests } = require("./helpers/network.cjs");
const loginPath = "/login/?next=%2Fbotanic%2F%3Ftab%3Dplants";

test.beforeEach(async ({ context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
});

test("public login metadata remains consistent and keeps the Botanic return link", async ({ page, baseURL }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(loginPath);
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("index, follow");
  const server = await readMetadata(page, await response.text());
  await expect(page.locator("#login-form-title")).toBeVisible();
  const live = await readMetadata(page);
  expect(live).toEqual(server);
  expect(live.title).toBe("Anmelden | Beirit Digital");
  expect(live.description).toEqual(expect.any(String));
  expect(live.description.trim().length).toBeGreaterThan(35);
  expect(live.canonical).toBe(`${baseURL}/login/`);
  expect(live.robots).toBe("index, follow");
  for (const prefix of ["og", "twitter"]) {
    expect(live[`${prefix}Title`]).toBe(live.title);
    expect(live[`${prefix}Description`]).toBe(live.description);
    expect(live[`${prefix}Url`]).toBe(live.canonical);
  }
  await expect(page.locator('input[name="next"]')).toHaveValue("/botanic/?tab=plants");
  await expect(page.locator("main h1")).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator("#id_username")).toBeVisible();
    await expect(page.locator("#id_password")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("login-390.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("failed login stays noindexed and preserves retry and the Botanic return link", async ({ page }) => {
  await page.goto(loginPath);
  await page.locator("#id_username").fill("missing-user@example.test");
  await page.locator("#id_password").fill("fictional-login-password");
  const posted = page.waitForResponse(response => new URL(response.url()).pathname === "/login/" && response.request().method() === "POST");
  await page.locator('form button[type="submit"]').click();
  expect((await posted).headers()["x-robots-tag"]).toBe("noindex, follow");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator('input[name="next"]')).toHaveValue("/botanic/?tab=plants");
  await expect(page.locator(".form-error[role=alert]")).toBeVisible();
  await expect(page.locator("#id_username")).toHaveValue("missing-user@example.test");
  await expect(page.locator("#id_password")).toHaveValue("");
  await expect(page.locator('form button[type="submit"]')).toBeEnabled();
});
