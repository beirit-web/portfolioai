const { test, expect } = require("@playwright/test");
const { blockExternalRequests } = require("./helpers/network.cjs");
const { gate } = require("./helpers/async.cjs");

const dictionaries = {
  de: require("../../../apps/deutsch-live/src/i18n/de.json"),
  ru: require("../../../apps/deutsch-live/src/i18n/ru.json"),
};

test.beforeEach(async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: null } }));
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: {} }));
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { ok: true } }));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function locale(page, language = "de") {
  await page.addInitScript(value => localStorage.setItem("deutsch-live-locale", value), language);
}

test("calculator Enter follows each setup step and focus reaches errors and the result", async ({ page }) => {
  const copy = dictionaries.de;
  await locale(page);
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/deutschlive/");
  await page.getByRole("combobox", { name: copy.common.openMenu, exact: true }).selectOption("/grades");
  await page.setViewportSize(viewport);

  const form = page.getByRole("form", { name: copy.gradeCalculator.title, exact: true });
  const name = form.getByLabel(copy.gradeCalculator.nameLabel, { exact: true });
  await name.fill("Beispielperson");
  await name.press("Enter");
  const count = form.getByLabel(copy.gradeCalculator.subjectsLabel, { exact: true });
  await expect(count).toBeFocused();
  await count.fill("21");
  await count.press("Enter");
  await expect(count).toBeFocused();
  await expect(count).toHaveAttribute("aria-invalid", "true");
  await expect(count).toHaveAccessibleDescription(/20/);
  await expect(page.locator(".grade-calculator__grade-grid")).toHaveCount(0);

  await count.fill("2");
  await count.press("Enter");
  const first = form.getByLabel(copy.gradeCalculator.gradeLabel.replace("{index}", "1"), { exact: true });
  const second = form.getByLabel(copy.gradeCalculator.gradeLabel.replace("{index}", "2"), { exact: true });
  await expect(first).toBeFocused();
  await first.fill("2");
  await first.press("Enter");
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-invalid", "true");
  await expect(second).toHaveAccessibleDescription(copy.gradeCalculator.gradeError.replace("{min}", "1").replace("{max}", "6"));
  await second.fill("4");
  await second.press("Enter");
  await expect(page.getByRole("heading", { name: copy.gradeCalculator.resultTitle, exact: true })).toBeFocused();
  await expect(page.locator(".grade-calculator__result")).toHaveClass(/is-passed/);
  await form.getByRole("button", { name: copy.gradeCalculator.back, exact: true }).click();
  await expect(count).toBeFocused();
  await page.getByRole("button", { name: copy.gradeCalculator.restart, exact: true }).click();
  await expect(name).toBeFocused();
});

test("writing tasks expose one active selection and keyboard changes the prompt", async ({ page }) => {
  const copy = dictionaries.de;
  await locale(page);
  await page.goto("/deutschlive/writing");
  const tasks = page.getByRole("group", { name: copy.writing.title, exact: true });
  const first = tasks.getByRole("button").first();
  const second = tasks.getByRole("button").nth(1);
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await second.focus();
  await second.press("Space");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(tasks.getByRole("button", { pressed: true })).toHaveCount(1);
  const prompt = await second.locator("span").last().textContent();
  const form = page.getByRole("form", { name: copy.writing.subtitle, exact: true });
  await expect(form.getByText(prompt, { exact: true })).toBeVisible();
  await expect(second).toHaveAttribute("lang", "de");
  await form.getByRole("button", { name: "Ich hätte gern ...", exact: true }).click();
  await expect(form.getByLabel(copy.writing.inputLabel, { exact: true })).toHaveValue("Ich hätte gern ...");
  await expect(page.locator("#writing-status")).toBeEmpty();
});

for (const saved of [true, false]) {
  test(`writing announces loading and focuses its correction when saving is ${saved ? "enabled" : "disabled"}`, async ({ page }) => {
    const copy = dictionaries.de;
    await locale(page);
    await page.routeWebSocket("**/ws/**", socket => socket.close());
    await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: {
      id: 42, username: "writing-example", email: "writing@example.test", isStaff: false, roles: ["learner"],
      settings: { emailVerified: true, interfaceLanguage: "de", saveProgress: saved },
    } } }));
    const started = gate(), release = gate();
    let requests = 0;
    await page.route("**/deutschlive/api/writing/exercises/", async route => {
      if (route.request().method() === "GET") return route.fulfill({ json: { exercises: [] } });
      requests++;
      const payload = route.request().postDataJSON();
      expect(payload.text).toBe("Ich hätte gern zwei Brötchen, bitte.");
      started.release();
      await release.ready;
      await route.fulfill({ status: saved ? 201 : 200, json: { saved, exercise: {
        id: saved ? 1 : null, topicId: "baeckerei", topicLabel: "Bäckerei", prompt: payload.prompt,
        userText: payload.text, correction: "Структура понятная.", explanation: "Проверьте порядок слов.",
        status: "corrected", createdAt: "2026-10-24T10:00:00Z",
      } } });
    });
    try {
      await page.goto("/deutschlive/writing");
      const form = page.getByRole("form", { name: copy.writing.subtitle, exact: true });
      await expect(page.locator("#writing-status")).toBeEmpty();
      await form.getByLabel(copy.writing.inputLabel, { exact: true }).fill("Ich hätte gern zwei Brötchen, bitte.");
      await form.getByRole("button", { name: copy.common.send, exact: true }).click();
      await started.ready;
      await expect(page.getByRole("status").filter({ hasText: copy.writing.typing })).toBeVisible();
      await expect(form.getByRole("button", { name: copy.writing.saving, exact: true })).toBeDisabled();
      release.release();
      const result = page.getByRole("region", { name: copy.writing.correction, exact: true });
      await expect(result.getByRole("heading", { name: copy.writing.correction, exact: true })).toBeFocused();
      await expect(result.getByText("Структура понятная.", { exact: true })).toHaveAttribute("lang", "ru");
      await expect(page.locator("#writing-status")).toHaveText(saved ? `${copy.common.finished} · ${copy.writing.correction}` : copy.writing.notSaved);
      await expect(form.getByLabel(copy.writing.inputLabel, { exact: true })).toBeEmpty();
      expect(requests).toBe(1);
      await expect(page.locator(".writing-history-item")).toHaveCount(saved ? 1 : 0);
    } finally { release.release(); }
  });
}

for (const language of ["de", "ru"]) {
  test(`manual and legal pages mark their German and Russian passages in ${language}`, async ({ page }) => {
    const copy = dictionaries[language];
    await locale(page, language);
    await page.goto("/deutschlive/manual");
    const article = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Der", exact: true }) });
    await expect(article).toHaveAttribute("lang", "de");
    await expect(page.getByText("🥨 Guten Morgen! Was darf es sein?", { exact: true })).toHaveAttribute("lang", "de");
    await expect(page.getByText(`🪆 ${copy.manual.dialogLine1Ru}`, { exact: true })).toHaveAttribute("lang", language);

    for (const path of ["impressum", "datenschutz", "nutzungsbedingungen", "kontakt"]) {
      await page.goto(`/deutschlive/${path}`);
      await expect(page.locator(".legal-page")).toHaveAttribute("lang", "de");
      if (path !== "impressum") await expect(page.getByText("Живой немецкий через реальные ситуации", { exact: true })).toHaveAttribute("lang", "ru");
      if (path === "datenschutz") {
        await expect(page.getByRole("heading", { name: copy.recordingsLegal.privacyTitle, exact: true }).locator("..")).toHaveAttribute("lang", language);
      }
    }
    // The owner’s existing public contact is preserved by the semantics change.
    await expect(page.getByText("Eugen Beirit", { exact: false })).toBeVisible();
    await expect(page.getByText("E-Mail: eugenbeirit22@gmail.com", { exact: false })).toBeVisible();
  });
}
