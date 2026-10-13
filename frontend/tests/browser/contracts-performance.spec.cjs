const { test, expect } = require("@playwright/test");

async function ready(page) {
  await expect(page.locator("body")).toHaveClass(/is-enhanced/);
  await expect(page.locator("#contractPreview")).toHaveAttribute("aria-busy", "false");
}

test("contract editor preserves first-paint layout and server-rendered inputs", async ({ page }) => {
  let releaseApp;
  const appGate = new Promise(resolve => { releaseApp = resolve; });
  await page.route("**/static/contracts/app.js*", async route => {
    await appGate;
    await route.continue();
  });
  try {
    await page.goto("/vertragsgenerator/", { waitUntil: "commit" });
    await expect(page.locator("#vermieter")).toBeVisible();
    await expect(page.locator("#stepList .step-button")).toHaveCount(5);
    await expect(page.locator(".field-group:visible")).toHaveCount(1);
    const initialLayout = await page.evaluate(() => {
      window.serverContractInput = document.querySelector("#vermieter");
      return {
        mainTop: document.querySelector(".editor-workspace").getBoundingClientRect().top,
        inputTop: window.serverContractInput.getBoundingClientRect().top,
      };
    });
    releaseApp();
    await ready(page);
    const enhancedLayout = await page.evaluate(() => ({
      sameInput: window.serverContractInput === document.querySelector("#vermieter"),
      mainTop: document.querySelector(".editor-workspace").getBoundingClientRect().top,
      inputTop: document.querySelector("#vermieter").getBoundingClientRect().top,
    }));
    expect(enhancedLayout.sameInput).toBe(true);
    expect(enhancedLayout.mainTop).toBeCloseTo(initialLayout.mainTop, 0);
    expect(enhancedLayout.inputTop).toBeCloseTo(initialLayout.inputTop, 0);
  } finally {
    releaseApp();
  }
});

test("contract fields and native download survive a failed editor script", async ({ page }) => {
  await page.route("**/static/contracts/app.js*", route => route.abort());
  await page.goto("/vertragsgenerator/?template=vehicle");
  await expect(page.locator("html")).not.toHaveClass(/contracts-js/);
  await expect(page.locator(".field-group:visible")).toHaveCount(5);
  await expect(page.locator("#stepList")).toBeHidden();
  await expect(page.locator("#contractPreview")).toBeVisible();
  const formWidth = (await page.locator(".form-pane").boundingBox()).width;
  expect(formWidth).toBeGreaterThan(page.viewportSize().width * 0.4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  await page.locator("#verkaeufer").fill("Beispiel Verkäufer");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Text herunterladen", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/fahrzeug-kaufvertrag-entwurf\.txt$/);
});

test("logo changes reuse the contract text without preview requests", async ({ page }) => {
  const previewRequests = [];
  page.on("request", request => {
    if (request.url().includes("/vertragsgenerator/vorschau/")) previewRequests.push(request);
  });
  await page.goto("/vertragsgenerator/");
  await ready(page);
  expect(previewRequests).toHaveLength(1);
  const originalText = await page.locator(".preview-text").textContent();
  await page.locator("#openSettingsButton").click();
  await page.locator("#logoInput").setInputFiles({
    name: "example-logo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#be302c"/></svg>'),
  });
  await expect(page.locator(".preview-brand img")).toHaveCount(1);
  await expect(page.locator("#contractPreview")).toHaveAttribute("aria-busy", "false");
  await page.locator("#clearLogoButton").click();
  await expect(page.locator(".preview-brand img")).toHaveCount(0);
  await ready(page);
  await page.waitForTimeout(250);
  expect(previewRequests).toHaveLength(1);
  await expect(page.locator(".preview-text")).toHaveText(originalText);
});

test("contract editor keeps every field and text download available without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({
    viewport: testInfo.project.use.viewport,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/vertragsgenerator/?template=vehicle`);
    await expect(page.locator(".field-group:visible")).toHaveCount(5);
    await expect(page.locator("#templateSelect")).toBeVisible();
    await expect(page.locator("#stepList")).toBeHidden();
    await page.locator("#verkaeufer").fill("Beispiel Verkäufer");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Text herunterladen", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/fahrzeug-kaufvertrag-entwurf\.txt$/);
  } finally {
    await context.close();
  }
});
