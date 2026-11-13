const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const APP_PATH = "/static/portfolio/notenrechner/index.html";
const SETTINGS_KEY = "beirit.notenrechner.passing-rule.v1";

test.use({ serviceWorkers: "allow" });

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => {};
  });
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function saveRule(page, limit, inclusive = false) {
  await page.locator("#passingGrade").fill(limit);
  await page.locator("#passingInclusive").setChecked(inclusive);
  await page.locator('#passingSettings button[type="submit"]').click();
}

async function enterGrades(page, values) {
  await page.locator('[data-action="start"]').click();
  await page.locator("#subjects").fill(String(values.length));
  await page.locator('[data-action="subjects"]').click();
  const inputs = page.locator("#gradeInputs input");
  await expect(inputs).toHaveCount(values.length);
  for (let index = 0; index < values.length; index += 1) {
    await inputs.nth(index).fill(String(values[index]));
  }
}

async function calculate(page) {
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator("#result")).toBeVisible();
}

test("a changed passing rule updates the live result, preserves grades and survives restart and reload", async ({ page }) => {
  await page.goto(APP_PATH);
  await expect(page.locator("#passingGrade")).toHaveValue("4,0");
  await expect(page.locator("#passingInclusive")).not.toBeChecked();
  await enterGrades(page, [3.5, 3.5]);
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-passed/);

  await saveRule(page, "3,5");
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#liveAverage")).toHaveText("3,5");
  await expect(page.locator("#liveAverage")).toHaveAttribute("data-state", "failing");
  const preservedInputs = page.locator("#gradeInputs input");
  await expect(preservedInputs).toHaveCount(2);
  await expect(preservedInputs.nth(0)).toHaveValue("3.5");
  await expect(preservedInputs.nth(1)).toHaveValue("3.5");
  await expect(page.locator("#passingRuleText")).toContainText("unter 3,5");
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-failed/);
  await expect(page.locator(".grade-scale-caption")).toContainText("3,5");

  await saveRule(page, "3.5", true);
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#liveAverage")).toHaveAttribute("data-state", "passing");
  await expect(page.locator("#passingRuleText")).toContainText("einschließlich 3,5");
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
  await expect(page.locator("#resultContent")).toContainText("einschließlich 3,5");

  await page.locator('[data-action="restart"]').click();
  await expect(page.locator("#gradeInputs input")).toHaveCount(0);
  await expect(page.locator("#liveAverage")).toHaveText("—");
  await expect(page.locator("#passingGrade")).toHaveValue("3,5");
  await expect(page.locator("#passingInclusive")).toBeChecked();
  await page.reload();
  await expect(page.locator("#passingGrade")).toHaveValue("3,5");
  await expect(page.locator("#passingInclusive")).toBeChecked();

  // A rounded display must not turn an average just above the chosen limit into a pass.
  await enterGrades(page, [3.5, 3.51]);
  await expect(page.locator("#liveAverage")).toHaveAttribute("data-state", "failing");
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-failed/);
});

test("invalid settings leave the active rule, saved preference and calculation intact", async ({ page }) => {
  await page.goto(APP_PATH);
  await saveRule(page, "2,5", true);
  await enterGrades(page, [2.5]);
  await calculate(page);
  const savedRule = await page.evaluate(key => localStorage.getItem(key), SETTINGS_KEY);

  for (const invalid of ["", "0", "6,01", "4,001", "keine Note"]) {
    await saveRule(page, invalid, false);
    await expect(page.locator("#passingGrade")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#passingSettingsStatus")).not.toBeEmpty();
    await expect(page.locator("#passingRuleText")).toContainText("einschließlich 2,5");
    await expect(page.locator("#liveAverage")).toHaveAttribute("data-state", "passing");
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator("#result")).toHaveClass(/is-passed/);
    expect(await page.evaluate(key => localStorage.getItem(key), SETTINGS_KEY)).toBe(savedRule);
  }

  await page.reload();
  await expect(page.locator("#passingGrade")).toHaveValue("2,5");
  await expect(page.locator("#passingInclusive")).toBeChecked();
});

test("corrupt stored preferences fall back to the standard rule without breaking the calculator", async ({ page }) => {
  await page.goto(APP_PATH);
  const corruptPreferences = [
    "{broken JSON",
    JSON.stringify({ version: 1, limitHundredths: 700, inclusive: false }),
    JSON.stringify({ version: 1, limitHundredths: 250, inclusive: "yes" }),
  ];
  for (const value of corruptPreferences) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SETTINGS_KEY, value });
    await page.reload();
    await expect(page.locator("#passingGrade")).toHaveValue("4,0");
    await expect(page.locator("#passingInclusive")).not.toBeChecked();
    await expect(page.locator("#passingSettingsStatus")).toContainText("Standardregel");
  }
  await enterGrades(page, [4]);
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-failed/);
});

test("a browser that blocks storage still allows changing the passing rule for the current session", async ({ page }) => {
  await page.addInitScript(key => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new DOMException("Storage blocked for test", "SecurityError");
      return originalGet.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage blocked for test", "SecurityError");
      return originalSet.call(this, name, value);
    };
  }, SETTINGS_KEY);
  await page.goto(APP_PATH);
  await expect(page.locator("#passingSettingsStatus")).toContainText("Sitzung");
  await saveRule(page, "2,8", true);
  await expect(page.locator("#passingSettingsStatus")).toContainText("Sitzung");
  await expect(page.locator("#passingGrade")).toHaveAttribute("aria-invalid", "false");
  await enterGrades(page, [2.8]);
  await calculate(page);
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
  await page.reload();
  await expect(page.locator("#passingGrade")).toHaveValue("4,0");
  await expect(page.locator("#passingInclusive")).not.toBeChecked();
});

test("explicit offline preparation supports a real offline reload with the saved passing rule", async ({ page, context, baseURL }, testInfo) => {
  await page.goto(APP_PATH);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await saveRule(page, "3,0", true);
  await page.locator("#prepareOffline").click();
  await expect(page.locator("body")).toHaveAttribute("data-offline-ready", "true");
  await expect(page.locator("#offlineStatus")).toHaveAttribute("data-state", "ready");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const offlineData = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const urls = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      urls.push(...(await cache.keys()).map(request => request.url));
    }
    return { scopes: registrations.map(registration => registration.scope), urls };
  });
  const appRoot = new URL("/static/portfolio/notenrechner/", baseURL).href;
  expect(offlineData.scopes).toEqual([appRoot]);
  expect(offlineData.urls.length).toBeGreaterThan(3);
  for (const url of offlineData.urls) {
    expect(url.startsWith(appRoot)).toBe(true);
    expect(new URL(url).pathname).not.toMatch(/\/(?:api|login|logout|register|profil|password-reset)\//);
  }

  await context.setOffline(true);
  const response = await page.reload();
  expect(response.ok()).toBe(true);
  expect(response.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Deine Noten.");
  await expect(page.locator("#offlineStatus")).toContainText("Offline aktiv");
  await expect(page.locator("#passingGrade")).toHaveValue("3,0");
  await expect(page.locator("#passingInclusive")).toBeChecked();
  await enterGrades(page, [3, 3]);
  await calculate(page);
  await expect(page.locator("#liveAverage")).toHaveText("3,0");
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
  await page.screenshot({ path: testInfo.outputPath("notenrechner-offline.png"), fullPage: true });
});
