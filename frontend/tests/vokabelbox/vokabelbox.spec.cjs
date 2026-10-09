const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8766(?:\/|$))/, route => route.abort());
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.browserErrors = errors;
});
test.afterEach(async ({ page }) => expect(page.browserErrors).toEqual([]));

async function open(page) {
  await page.goto("/vokabelbox/");
  await expect(page.locator(".word-card")).toHaveCount(30);
}

test("platform links to its learning module and learning progress survives reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#funktionen a[href="/vokabelbox/"]')).toBeAttached();
  await open(page);
  await page.locator("#searchInput").fill("Apfel");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.locator(".word-card").click();
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await page.locator("#articleFilter").selectOption("das");
  await expect(page.locator(".word-card")).toHaveCount(10);
  await expect(page.locator(".word-card .article-pill")).toHaveText(Array(10).fill("das"));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});

test("quiz checks one answer per question and language changes preserve progress", async ({ page }) => {
  await open(page);
  const word = await page.locator("#quizWord").innerText();
  await page.locator("#searchInput").fill(word);
  const article = await page.locator(".word-card .article-pill").first().innerText();
  await page.locator(`[data-answer="${article}"]`).click();
  await expect(page.locator("#quizFeedback")).toContainText("Richtig:");
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  for (const answer of ["der", "die", "das"]) await expect(page.locator(`[data-answer="${answer}"]`)).toBeDisabled();
  await page.evaluate(() => {
    document.documentElement.lang = "ru";
    document.dispatchEvent(new CustomEvent("app:translations-applied", { detail: { lang: "ru" } }));
  });
  await expect(page.locator("#quizFeedback")).toContainText("Правильно:");
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  await page.locator("#nextQuestion").click();
  await expect(page.locator('[data-answer="der"]')).toBeEnabled();
  await page.reload();
  await expect(page.locator("#quizScore")).toHaveText("1/1");
});

test("blocked browser storage does not prevent learning", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = function () { throw new Error("Storage blocked"); };
  });
  await open(page);
  await page.locator("#knownButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator(".vocab-storage-note")).toContainText("Sitzung");
});

test("malformed saved progress is ignored and learning remains usable", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sprachservice:vokabelbox:v1:guest", JSON.stringify({
      knownIds: ["not-a-word"], favoriteIds: "invalid", correctAnswers: 9, answeredQuestions: -1,
    }));
  });
  await open(page);
  await expect(page.locator("#knownCount")).toHaveText("0");
  await expect(page.locator("#favoriteCount")).toHaveText("0");
  await expect(page.locator("#quizScore")).toHaveText("0/0");
  await page.locator("#knownButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator('[data-answer="der"]')).toBeEnabled();
});
