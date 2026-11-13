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
  await page.locator('[data-view="training"]').click();
  const word = await page.locator("#quizWord").innerText();
  const card = wordCard(page, word);
  await expect(card).toHaveCount(1);
  return { word, article: await card.locator(".article-pill").textContent() };
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
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await expect(page.locator("#knownButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#favoriteButton")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#closeDetails").click();
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
  await page.locator('[data-view="training"]').click();
  await expect(page.locator('[data-answer="der"]')).toBeEnabled();
});

test("the language selector translates the module without resetting learning or the current quiz", async ({ page }) => {
  await openVocabulary(page);
  await wordCard(page, "Apfel").click();
  await page.locator("#favoriteButton").click();
  await page.locator("#closeDetails").click();
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
  await expect(page.locator("#visibleCount")).toHaveText("30 результатов");
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
  await expect(page.locator("#visibleCount")).toHaveText("30 Treffer");
});

test("word meanings and search follow Russian and Ukrainian including spelling variants", async ({ page }) => {
  await openVocabulary(page);
  await expect(wordCard(page, "Apfel").locator("small")).toContainText("runde Frucht");
  for (const [language, search, word, meaning] of [
    ["ru", "яблоко", "Apfel", "яблоко"],
    ["ru", "ребенок", "Kind", "ребёнок"],
    ["uk", "яблуко", "Apfel", "яблуко"],
    ["uk", "комп'ютер", "Computer", "комп’ютер"],
  ]) {
    await page.locator("[data-vocab-language]").selectOption(language);
    await page.locator("#searchInput").fill(search);
    await expect(page.locator(".word-card")).toHaveCount(1);
    await expect(wordCard(page, word).locator("small")).toHaveText(meaning);
    await expect(wordCard(page, word).locator("strong")).toHaveAttribute("lang", "de");
    await expect(page.locator("#visibleCount")).toHaveText("1 результат");
    await wordCard(page, word).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#detailsTranslation")).toContainText(meaning);
    await page.locator("#closeDetails").click();
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(wordCard(page, "Computer").locator("small")).toHaveText("комп’ютер");
});

test("favorites are a separate searchable view and removing the last favorite keeps focus usable", async ({ page }) => {
  await openVocabulary(page);
  const favorites = page.locator('[data-view="favorites"]');
  await favorites.click();
  await expect(page.locator(".word-empty-state")).toContainText("Noch keine Favoriten");
  await page.locator('[data-view="words"]').click();
  await wordCard(page, "Schule").click();
  await page.locator("#favoriteButton").click();
  await page.locator("#closeDetails").click();
  await favorites.click();
  await expect(favorites).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await expect(wordCard(page, "Schule")).toBeVisible();
  await page.locator("#searchInput").fill("Apfel");
  await expect(page.locator(".word-card")).toHaveCount(0);
  await page.locator("#searchInput").fill("");
  await wordCard(page, "Schule").click();
  await page.locator("#favoriteButton").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".word-empty-state")).toContainText("Noch keine Favoriten");
  await expect(favorites).toBeFocused();
  await expect(page.locator("#favoriteCount")).toHaveText("0");
});

test("training hides the word list and details and reveals the solution only after an answer", async ({ page }) => {
  await openVocabulary(page);
  await expect(page.locator("#trainerPanel")).toBeHidden();
  const first = await quizAnswer(page);
  await expect(page.locator("#catalogPanel")).toBeHidden();
  await expect(page.locator(".word-card:visible")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("#quizFeedback")).toBeEmpty();
  await page.locator(`[data-answer="${first.article}"]`).click();
  await expect(page.locator("#quizFeedback")).toHaveText(`Richtig: ${first.article} ${first.word}.`);
  await expect(page.locator("#catalogPanel")).toBeHidden();
  await page.locator('[data-view="words"]').click();
  await expect(page.locator("#trainerPanel")).toBeHidden();
  await page.locator('[data-view="training"]').click();
  await expect(page.locator("#quizWord")).toHaveText(first.word);
  await expect(page.locator("#quizScore")).toHaveText("1/1");
});

test("search and selected word actions are reachable on a phone without scrolling back through the list", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openVocabulary(page);
  expect((await page.locator("#searchInput").boundingBox()).y).toBeLessThan(844);
  await wordCard(page, "Wasser").click();
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(845);
  await expect(page.locator("#details-title")).toHaveText("das Wasser");
  await page.locator("#favoriteButton").click();
  await page.screenshot({ path: testInfo.outputPath("word-details-mobile.png") });
  await page.locator("#closeDetails").click();
  await expect(wordCard(page, "Wasser")).toBeFocused();
});

test("blocked browser storage still permits learning for the current session", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = function () { throw new Error("Storage blocked"); };
  });
  await openVocabulary(page);
  await wordCard(page, "Apfel").click();
  await page.locator("#knownButton").click();
  await page.locator("#favoriteButton").click();
  await expect(page.locator("#knownCount")).toHaveText("1");
  await expect(page.locator("#favoriteCount")).toHaveText("1");
  await expect(page.locator(".vocab-storage-note")).toContainText("Sitzung");
  await page.locator("#closeDetails").click();
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
    await wordCard(page, "Apfel").click();
    await page.locator("#knownButton").click();
    await expect(page.locator("#knownCount")).toHaveText("1");
    await page.locator("#closeDetails").click();
    await page.locator('[data-view="training"]').click();
    await expect(page.locator('[data-answer="der"]')).toBeEnabled();
  });
}

test("keyboard selection preserves focus and exposes the selected word", async ({ page }) => {
  await openVocabulary(page);
  const school = wordCard(page, "Schule");
  await school.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#closeDetails")).toBeFocused();
  await expect(school).toHaveAccessibleName(/^die Schule /);
  await expect(page.locator("#details-title")).toHaveText("die Schule");
  const previousSelected = wordCard(page, "Apfel");
  await expect(previousSelected).toHaveAccessibleName(/^der Apfel /);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(school).toBeFocused();
  await page.keyboard.press("Enter");
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
    for (const size of ["100%", "200%"]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = size; }, size);
      for (const language of ["de", "ru", "uk"]) {
        await page.locator("[data-vocab-language]").selectOption(language);
        for (const view of ["words", "training", "favorites"]) {
          await page.locator(`[data-view="${view}"]`).click();
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
          for (const panel of await page.locator(".vocab-panel:visible").all()) {
            const box = await panel.boundingBox();
            expect(box.x).toBeGreaterThanOrEqual(-1);
            expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
          }
        }
      }
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

test("the localized word list and GET search work with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: "de-DE" });
  try {
    await blockExternalRequests(context, baseURL);
    const page = await context.newPage();
    await page.goto(`${baseURL}/vokabelbox/?lang=uk`);
    await expect(page.getByRole("heading", { name: "Vokabelbox", exact: true })).toBeVisible();
    await expect(page.getByRole("list")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(30);
    await expect(page.getByRole("button", { name: /^der Apfel / })).toHaveAccessibleName("der Apfel яблуко");
    await page.getByRole("searchbox", { name: "Пошук", exact: true }).fill("яблуко");
    await page.getByRole("button", { name: "Знайти", exact: true }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await expect(page).toHaveURL(/q=%D1%8F%D0%B1%D0%BB%D1%83%D0%BA%D0%BE/);
    await page.getByRole("combobox", { name: "Мова", exact: true }).selectOption("ru");
    await page.getByRole("button", { name: "Змінити мову", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("button", { name: /^der Apfel / })).toHaveAccessibleName("der Apfel яблоко");
  } finally {
    await context.close();
  }
});

test("semantic controls support an agent workflow and URL navigation restores search and training", async ({ page }) => {
  await openVocabulary(page);
  const search = page.getByRole("searchbox", { name: "Suche", exact: true });
  await search.fill("Schule");
  await expect(page).toHaveURL(/q=Schule/);
  await page.getByRole("button", { name: /^die Schule / }).click();
  const dialog = page.getByRole("dialog", { name: "die Schule", exact: true });
  const favorite = dialog.getByRole("button", { name: "Favorit", exact: true });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  await page.getByRole("link", { name: "Üben", exact: true }).click();
  await expect(page).toHaveURL(/view=training/);
  await expect(page.getByRole("group", { name: /Welcher Artikel passt/ })).toBeVisible();
  await page.getByRole("button", { name: "der", exact: true }).click();
  await expect(page.getByRole("button", { name: "der", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("link", { name: "Üben", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await page.goBack();
  await expect(search).toHaveValue("Schule");
  await expect(page.getByRole("button", { name: /^die Schule / })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("group", { name: /Welcher Artikel passt/ })).toBeVisible();
});

test("explicit language links override saved preferences and metadata follows language changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("beirit:vokabelbox:language", "ru"));
  await page.goto("/vokabelbox/?lang=uk&q=яблуко");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page).toHaveTitle(/німецькі/);
  await expect(page.getByRole("button", { name: /^der Apfel / })).toHaveAccessibleName("der Apfel яблуко");
  await page.getByRole("combobox", { name: "Мова", exact: true }).selectOption("de");
  await expect(page).toHaveURL(/lang=de/);
  await expect(page).toHaveTitle(/deutsche Artikel/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/vokabelbox\/\?lang=de$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", await page.title());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("button", { name: /^der Apfel / })).toBeVisible();
});

test("server rendered cards are enhanced in place and initial loading stays within the module budget", async ({ page, baseURL }) => {
  const requests = [];
  page.on("request", request => requests.push({ url: request.url(), type: request.resourceType() }));
  let releaseScripts;
  const gate = new Promise(resolve => { releaseScripts = resolve; });
  await page.route("**/static/vokabelbox/*.js*", async route => { await gate; await route.continue(); });
  await page.goto("/vokabelbox/?lang=de", { waitUntil: "commit" });
  const apple = page.getByRole("button", { name: /^der Apfel / });
  try {
    await expect(apple).toBeVisible();
    await expect(apple).toBeDisabled();
    await apple.evaluate(element => { window.initialApple = element; });
  } finally {
    releaseScripts();
  }
  await page.waitForLoadState("load");
  await expect(apple).toBeEnabled();
  expect(await apple.evaluate(element => element === window.initialApple)).toBe(true);
  await page.getByRole("searchbox", { name: "Suche", exact: true }).fill("Apfel");
  expect(await apple.evaluate(element => element === window.initialApple)).toBe(true);
  expect(requests.filter(request => request.type === "script")).toHaveLength(2);
  expect(requests.filter(request => ["fetch", "xhr", "font"].includes(request.type))).toEqual([]);
  expect(requests.every(request => new URL(request.url).origin === new URL(baseURL).origin)).toBe(true);
  const bytes = await page.evaluate(() => performance.getEntriesByType("resource").reduce((sum, item) => sum + item.decodedBodySize, 0));
  expect(bytes).toBeLessThan(60000);
});

test("mobile navigation supports keyboard dismissal, outside clicks and desktop resizing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openVocabulary(page);
  const toggle = page.getByLabel("Menü", { exact: true });
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation", exact: true });
  await expect(navigation).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#vocabMenu")).toHaveJSProperty("open", true);
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Vokabelbox", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigation).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole("searchbox", { name: "Suche", exact: true }).click();
  await expect(navigation).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await toggle.click();
  await navigation.getByRole("link", { name: "DeutschLive", exact: true }).focus();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(toggle).toBeHidden();
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: /^Beirit Web .*Startseite$/ })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toHaveCount(0);
  for (const lang of ["ru", "uk"]) {
    await page.locator("[data-vocab-language]").selectOption(lang);
    await page.getByLabel("Меню", { exact: true }).click();
    await expect(page.getByRole("navigation", { name: lang === "ru" ? "Основная навигация" : "Основна навігація", exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Vokabelbox", exact: true })).toHaveAttribute("href", `?lang=${lang}`);
    await page.keyboard.press("Escape");
  }
});

test("header menu and footer links are available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await blockExternalRequests(context, baseURL);
    const page = await context.newPage();
    await page.goto(`${baseURL}/vokabelbox/?lang=de`);
    await page.getByLabel("Menü", { exact: true }).click();
    const navigation = page.getByRole("navigation", { name: "Hauptnavigation", exact: true });
    await expect(navigation.getByRole("link", { name: "DeutschLive", exact: true })).toHaveAttribute("href", "/deutschlive/");
    await page.getByLabel("Menü", { exact: true }).click();
    await expect(navigation).toHaveCount(0);
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("navigation", { name: "Weitere Links", exact: true })).toBeVisible();
    for (const [label, path] of [["Projekte", "/projekte"], ["Kontakt", "/kontakt"], ["Impressum", "/impressum"], ["Datenschutz", "/datenschutz/"]]) {
      await expect(footer.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", path);
      const response = await context.request.get(`${baseURL}${path}`);
      expect(response.ok(), label).toBe(true);
    }
    await footer.getByRole("link", { name: "Impressum", exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/impressum`);
  } finally {
    await context.close();
  }
});
