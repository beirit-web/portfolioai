const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");

const guestStorageKey = "sprachservice:vokabelbox:v1:guest";
const projectUrl = "/projekte/sprachdienstleistungen/#vokabelbox";
const browserErrors = new WeakMap();

test.beforeEach(async ({ context, page, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  const errors = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  context.on("page", openedPage => {
    openedPage.on("pageerror", error => errors.push(error.message));
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function openVocabulary(page) {
  await page.goto("/vokabelbox/");
  await expect(page.locator(".word-card[data-word-id]")).toHaveCount(30);
  await expect(page.locator("#totalCount")).toHaveText("30");
  await expect(page.locator(".vocab-shell")).toHaveAttribute("data-storage-key", guestStorageKey);
}

function wordCard(page, word) {
  return page.locator(".word-card").filter({ has: page.getByText(word, { exact: true }) });
}

async function quizAnswer(page) {
  const word = await page.locator("#quizWord").innerText();
  await page.locator("#articleFilter").selectOption("all");
  await page.locator("#searchInput").fill(word);
  const card = wordCard(page, word);
  await expect(card).toHaveCount(1);
  return { word, article: await card.locator(".article-pill").innerText() };
}

test("word search, article filters and empty results remain usable in the portfolio", async ({ page }) => {
  await openVocabulary(page);
  await page.locator("#searchInput").fill("apple");
  await expect(wordCard(page, "Apfel")).toHaveCount(1);
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.locator("#searchInput").fill("");
  for (const article of ["der", "die", "das"]) {
    await page.locator("#articleFilter").selectOption(article);
    await expect(page.locator(".word-card")).toHaveCount(10);
    await expect(page.locator(".word-card .article-pill")).toHaveText(Array(10).fill(article));
    await expect(page.locator("#visibleCount")).toHaveText("10 Treffer");
  }
  await page.locator("#searchInput").fill("kein-passendes-wort-123");
  await expect(page.locator(".word-card")).toHaveCount(0);
  await expect(page.locator("#visibleCount")).toHaveText("0 Treffer");
  await expect(page.locator(".word-empty-state")).toBeVisible();
  await expect(page.locator(".word-empty-state")).not.toBeEmpty();
  await page.locator("#searchInput").fill("");
  await page.locator("#articleFilter").selectOption("all");
  await expect(page.locator(".word-card")).toHaveCount(30);
  await expect(page.locator(".word-empty-state")).toHaveCount(0);
});

test("learned words and favorites persist and can be removed after a reload", async ({ page }) => {
  await openVocabulary(page);
  await page.locator("#searchInput").fill("Schule");
  await wordCard(page, "Schule").click();
  await expect(page.locator("#details-title")).toHaveText("die Schule");
  await expect(wordCard(page, "Schule")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await expect(page.locator("#knownButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#favoriteButton")).toHaveAttribute("aria-pressed", "true");
  await expect(wordCard(page, "Schule").locator(".word-card__statuses")).toContainText("Gelernt");
  await expect(wordCard(page, "Schule").locator(".word-card__statuses")).toContainText("Favorit");

  await page.reload();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await wordCard(page, "Schule").click();
  await expect(page.locator("#knownButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#favoriteButton")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("0");
  await expect(page.locator("#favoriteCount")).toHaveText("0");
  await expect(page.locator("#knownButton")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#favoriteButton")).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.locator("#knownCount")).toHaveText("0");
  await expect(page.locator("#favoriteCount")).toHaveText("0");
});

test("quiz counts one answer per question, distinguishes wrong answers and restores the score", async ({ page }) => {
  await openVocabulary(page);
  const first = await quizAnswer(page);
  await page.locator(`[data-answer="${first.article}"]`).click();
  await expect(page.locator("#quizFeedback")).toHaveText(`Richtig: ${first.article} ${first.word}.`);
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  await expect(page.locator("#knownCount")).toHaveText("1");
  for (const article of ["der", "die", "das"]) {
    await expect(page.locator(`[data-answer="${article}"]`)).toBeDisabled();
  }
  await page.locator(`[data-answer="${first.article}"]`).evaluate(button => button.click());
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  await page.locator("#nextQuestion").click();
  await expect(page.locator("#quizWord")).not.toHaveText(first.word);
  await expect(page.locator("#quizFeedback")).toBeEmpty();
  const second = await quizAnswer(page);
  const incorrectArticle = ["der", "die", "das"].find(article => article !== second.article);
  await expect(page.locator(`[data-answer="${incorrectArticle}"]`)).toBeEnabled();
  await page.locator(`[data-answer="${incorrectArticle}"]`).click();
  await expect(page.locator("#quizFeedback")).toHaveText(`Richtig ist: ${second.article} ${second.word}.`);
  await expect(page.locator("#quizFeedback")).toHaveClass(/is-error/);
  await expect(page.locator(`[data-answer="${second.article}"]`)).toHaveClass(/is-correct/);
  await expect(page.locator(`[data-answer="${incorrectArticle}"]`)).toHaveClass(/is-wrong/);
  await expect(page.locator("#quizScore")).toHaveText("1/2");
  await expect(page.locator("#knownCount")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#quizScore")).toHaveText("1/2");
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator('[data-answer="der"]')).toBeEnabled();
});

test("the language selector translates the module without resetting learning or the current quiz", async ({ page }) => {
  await openVocabulary(page);
  await page.locator("#favoriteButton").click();
  const question = await quizAnswer(page);
  await page.locator(`[data-answer="${question.article}"]`).click();
  await page.locator("[data-vocab-language]").selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("#quizFeedback")).toHaveText(`Правильно: ${question.article} ${question.word}.`);
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await expect(page.locator("#quizWord")).toHaveText(question.word);
  await expect(page.locator('[data-answer="der"]')).toBeDisabled();
  await expect(page.locator("#visibleCount")).toHaveText("1 результатов");
  await expect(page.locator("#nextQuestion")).toHaveText(
    await page.evaluate(() => window.TRANSLATIONS.ru.vocab.next),
  );
  await page.locator("[data-vocab-language]").selectOption("uk");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator("#quizFeedback")).toHaveText(`Правильно: ${question.article} ${question.word}.`);
  await expect(page.locator("#quizScore")).toHaveText("1/1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await page.locator("[data-vocab-language]").selectOption("de");
  await expect(page.locator("#quizFeedback")).toHaveText(`Richtig: ${question.article} ${question.word}.`);
  await expect(page.locator("#visibleCount")).toHaveText("1 Treffer");
});

test("blocked browser storage still permits learning for the current session", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = function () { throw new Error("Storage blocked"); };
  });
  await openVocabulary(page);
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await expect(page.locator(".vocab-storage-note")).toContainText("Sitzung");
  await page.locator("[data-vocab-language]").selectOption("ru");
  await expect(page.locator(".vocab-storage-note")).toHaveText(
    await page.evaluate(() => window.TRANSLATIONS.ru.vocab.session_storage),
  );
  await expect(page.locator("#knownCount")).toHaveText("1");
});

for (const [description, savedProgress] of [
  ["invalid JSON", "{invalid-json"],
  ["invalid saved fields", JSON.stringify({
    knownIds: ["not-a-word"], favoriteIds: "invalid", correctAnswers: 9, answeredQuestions: -1,
  })],
]) {
  test(`${description} does not prevent a fresh learning session`, async ({ page }) => {
    await page.addInitScript(({ storageKey, progress }) => {
      localStorage.setItem(storageKey, progress);
    }, { storageKey: guestStorageKey, progress: savedProgress });
    await openVocabulary(page);
    await expect(page.locator("#knownCount")).toHaveText("0");
    await expect(page.locator("#favoriteCount")).toHaveText("0");
    await expect(page.locator("#quizScore")).toHaveText("0/0");
    await page.locator("#knownButton").click();
    await expect(page.locator("#knownCount")).toHaveText("1");
    await expect(page.locator('[data-answer="der"]')).toBeEnabled();
  });
}

test("keyboard selection preserves focus and exposes the selected word", async ({ page }) => {
  await openVocabulary(page);
  const school = wordCard(page, "Schule");
  await school.focus();
  await page.keyboard.press("Enter");
  await expect(school).toBeFocused();
  await expect(school).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#details-title")).toHaveText("die Schule");
  const previousSelected = wordCard(page, "Apfel");
  await expect(previousSelected).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Tab");
  await expect(school).not.toBeFocused();
  await page.locator("#knownButton").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#knownButton")).toBeFocused();
  await expect(page.locator("#knownButton")).toHaveAttribute("aria-pressed", "true");
});

test("the translated module fits narrow phones and desktop screens", async ({ page }, testInfo) => {
  const widths = testInfo.project.name === "mobile" ? [320, 390] : [1440];
  await openVocabulary(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ["de", "ru", "uk"]) {
      await page.locator("[data-vocab-language]").selectOption(language);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      for (const panel of await page.locator(".vocab-panel").all()) {
        const box = await panel.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
      await expect(page.locator(".vocab-hero .vocab-back-link")).toBeVisible();
    }
  }
});

test("project and legacy entry points open the module and its return link loads the real portfolio report", async ({ page, baseURL }) => {
  await page.goto(projectUrl);
  const moduleLink = page.locator("#vokabelbox");
  await expect(moduleLink).toHaveAttribute("href", "/vokabelbox/");
  let modulePage = page;
  if (await moduleLink.getAttribute("target") === "_blank") {
    [modulePage] = await Promise.all([page.waitForEvent("popup"), moduleLink.click()]);
  } else {
    await moduleLink.click();
  }
  await expect(modulePage.locator(".word-card")).toHaveCount(30);
  await expect(modulePage).toHaveURL(new URL("/vokabelbox/", baseURL).href);
  await modulePage.goto("/static/portfolio/vokabelbox-main/index.html");
  await expect(modulePage).toHaveURL(new URL("/vokabelbox/", baseURL).href);
  await expect(modulePage.locator(".word-card")).toHaveCount(30);
  const back = modulePage.locator(".vocab-hero .vocab-back-link");
  await expect(back).toHaveAttribute("href", projectUrl);
  await expect(back).toBeVisible();
  await back.click();
  await expect(modulePage).toHaveURL(new URL(projectUrl, baseURL).href);
  await expect(modulePage.locator(".portfolio-project-hero--sprachdienstleistungen")).toBeVisible();
  await expect(modulePage.locator(".portfolio-project-decision")).toBeAttached();
  await expect(modulePage.locator(".vocab-shell")).toHaveCount(0);
  if (modulePage !== page) await modulePage.close();
});
