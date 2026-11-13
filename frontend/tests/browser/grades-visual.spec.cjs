const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await page.addInitScript(() => {
    window.__playingGradeAudio = new Set();
    HTMLMediaElement.prototype.play = function () {
      window.__playingGradeAudio.add(this);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      window.__playingGradeAudio.delete(this);
    };
  });
  await page.goto("/static/portfolio/notenrechner/index.html");
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function expectCurrentStep(page, step) {
  const current = page.locator('[data-progress-step][aria-current="step"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("data-progress-step", String(step));
}

test("an explicit example updates the live average and distribution before evaluation", async ({ page }) => {
  await expect(page.locator("#liveAverage")).toHaveText("—");
  await expect(page.locator("#liveCount")).toHaveText("Noch keine Noten");
  await expectCurrentStep(page, 1);
  await page.locator('[data-action="example"]').click();

  const inputs = page.locator("#gradeInputs input");
  await expect(inputs).toHaveCount(6);
  expect(await inputs.evaluateAll(fields => fields.map(field => field.value)))
    .toEqual(["2", "1.7", "2.3", "3", "1.3", "2"]);
  await expect(page.locator("#liveAverage")).toHaveText("2,05");
  await expect(page.locator("#liveCount")).toHaveText("6 von 6 Fächern");
  await expect(page.locator("#liveCaption")).toContainText("Alle Noten erfasst");
  await expect(page.locator("#gradeCompletion")).toContainText("Alle 6 Noten eingetragen");
  await expect(page.locator("[data-grade-bucket] .distribution-count"))
    .toHaveText(["1", "4", "1", "0", "0", "0"]);
  const heights = await page.locator("[data-grade-bucket] .distribution-fill")
    .evaluateAll(bars => bars.map(bar => bar.getBoundingClientRect().height));
  expect(heights[0]).toBeGreaterThan(0);
  expect(heights[1]).toBeGreaterThan(heights[0]);
  expect(heights[2]).toBeCloseTo(heights[0], 0);
  expect(heights.slice(3)).toEqual([0, 0, 0]);
  await expectCurrentStep(page, 3);
  await expect(page.locator("#result")).toBeHidden();
  expect(await page.evaluate(() => window.__playingGradeAudio.size)).toBe(0);
  await expect(inputs.first()).toBeFocused();

  await page.locator('[data-action="back"]').click();
  const preset = page.locator('[data-subject-count="3"]');
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#subjects")).toHaveValue("3");
  await expect(page.locator("#liveAverage")).toHaveText("—");
  await expect(page.locator("#liveCount")).toHaveText("0 von 3 Fächern");
  await page.locator('[data-action="subjects"]').click();
  await expect(inputs).toHaveCount(3);
  await expect(inputs.first()).toHaveValue("");
});

test("the live view excludes missing and invalid grades and respects the exact passing boundary", async ({ page }) => {
  await page.locator('[data-action="start"]').click();
  await expectCurrentStep(page, 2);
  await page.locator("#subjects").fill("2");
  await page.locator('[data-action="subjects"]').click();
  const inputs = page.locator("#gradeInputs input");
  await inputs.first().fill("2");
  await expect(page.locator("#liveAverage")).toHaveText("2,0");
  await expect(page.locator("#liveCount")).toHaveText("1 von 2 Fächern");
  await expect(page.locator("#liveCaption")).toContainText("Vorläufiger Schnitt");
  await inputs.last().fill("7");
  await expect(page.locator("#liveAverage")).toHaveText("2,0");
  await expect(page.locator("#liveCount")).toHaveText("1 von 2 Fächern");
  await expect(page.locator("[data-grade-bucket] .distribution-count"))
    .toHaveText(["0", "1", "0", "0", "0", "0"]);
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(inputs.last()).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#result")).toBeHidden();

  await inputs.last().fill("4");
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
  await inputs.first().fill("4");
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#liveAverage")).toHaveText("4,0");
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator("#result")).toHaveClass(/is-failed/);

  await inputs.first().fill("3.99");
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#liveAverage")).toHaveText("< 4,0");
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
});

test("restarting clears entered values, live statistics and result audio", async ({ page }) => {
  await page.locator("#name").fill("Beispielperson");
  await page.locator('[data-action="example"]').click();
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator("#result")).toHaveClass(/is-passed/);
  expect(await page.evaluate(() => window.__playingGradeAudio.size)).toBe(1);
  await page.locator('[data-action="restart"]').click();

  await expect(page.locator("#name")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("");
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator("#subjects")).toHaveValue("");
  await expect(page.locator("#gradeInputs input")).toHaveCount(0);
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#liveAverage")).toHaveText("—");
  await expect(page.locator("#liveCount")).toHaveText("Noch keine Noten");
  await expect(page.locator("[data-grade-bucket] .distribution-count"))
    .toHaveText(["0", "0", "0", "0", "0", "0"]);
  await expectCurrentStep(page, 1);
  await expect(page.locator("[data-progress-step].is-complete")).toHaveCount(0);
  expect(await page.evaluate(() => window.__playingGradeAudio.size)).toBe(0);
});
