const { test, expect } = require("@playwright/test");
const { gate } = require("./helpers/async.cjs");
const { blockExternalRequests } = require("./helpers/network.cjs");

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});

test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

function topic(id, label) {
  return {
    id, label, ru: label, icon: "🧪", phraseCount: 0, quizCount: 1,
    quizToken: `signed-example-${id}`,
    quiz: [{ id: `${id}-question`, question: `${label}: Was passt?`, options: ["Die richtige Antwort", "Die andere Antwort"], optionIds: [`${id}-correct`, `${id}-other`] }],
    free_answer: {
      prompt: `${label}: Schreiben Sie einen Satz.`, task: "Bitten Sie auf Deutsch um ein Beispiel.",
      example: "Ich hätte gern ein Beispiel, bitte.", building_blocks: ["Ich hätte gern", "ein Beispiel", "bitte."]
    },
  };
}

function quizTopicUrl(id) {
  return `**/deutschlive/api/topics/${id}/?view=quiz`;
}

async function mockTopics(page, topics) {
  const summaries = topics.map(({ id, label, ru, icon, phraseCount, quizCount }) => ({ id, label, ru, icon, phraseCount, quizCount }));
  await page.route("**/deutschlive/api/topics/", route => route.fulfill({ json: { topics: summaries } }));
  for (const item of topics) {
    await page.route(quizTopicUrl(item.id), route => route.fulfill({ json: item }));
  }
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: { csrfToken: "a".repeat(32) } }));
  await page.route("**/deutschlive/api/quiz-attempts/", route => {
    const request = route.request().postDataJSON();
    return route.fulfill({ json: evaluation(topics.find(item => item.id === request.topicId), request) });
  });
}

function evaluation(item, request, score = 2) {
  return {
    attempt: { id: request.save ? 1 : null, topicLabel: item.label, score, total: 2, percentage: score * 50, durationSeconds: request.durationSeconds, difficulty: request.difficulty },
    saved: request.save,
    feedback: [{ questionId: item.quiz[0].id, selectedOptionId: request.answers[0].optionId, correctOptionId: item.quiz[0].optionIds[0], correct: score > 0, explain: "Das ist die passende Beispielantwort." }],
    writing: { accepted: score === 2, explain: "Die Schreibaufgabe wurde auf dem Server bewertet." },
  };
}

const quizUser = {
  id: 42, username: "quiz@example.test", email: "quiz@example.test", isStaff: false, roles: ["learner"],
  settings: {
    role: "learner", premiumStatus: "free", hasPremiumAccess: false, emailVerified: true,
    interfaceLanguage: "de", explanationLanguage: "ru", themePreference: "light", level: "a1",
    mainGoal: "Beispiele lernen", preferredTopic: "baeckerei", saveProgress: true,
  },
};

async function mockUser(page, saveProgress = true) {
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: { ...quizUser, settings: { ...quizUser.settings, saveProgress } } } }));
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: { csrfToken: "a".repeat(32) } }));
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { ok: true } }));
}

async function expectSetup(page, item, difficulty = "easy") {
  await expect(page.locator(".quiz-shell")).toHaveAttribute("data-topic-id", item.id);
  await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
  await expect(page.locator(`.quiz-topic-button[data-topic-id="${item.id}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.quiz-topic-button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator(`.quiz-difficulty-button[data-difficulty="${difficulty}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
}

async function finishChoice(page) {
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  await page.getByRole("button", { name: "Die richtige Antwort", exact: true }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true })).toBeVisible();
}

test("the real quiz loads only its compact topic and required route assets", async ({ page }) => {
  const requests = [];
  const responses = [];
  page.on("request", request => requests.push(new URL(request.url()).pathname + new URL(request.url()).search));
  page.on("response", response => responses.push(response));
  await page.goto("/deutschlive/quiz");
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
  const quizResponse = responses.find(response => new URL(response.url()).pathname === "/deutschlive/api/topics/baeckerei/");
  expect(quizResponse).toBeDefined();
  expect(new URL(quizResponse.url()).searchParams.get("view")).toBe("quiz");
  const payload = await quizResponse.json();
  expect(payload.quiz.length).toBeGreaterThan(0);
  expect(payload.quizToken).toEqual(expect.any(String));
  for (const question of payload.quiz) {
    expect(question.id).toEqual(expect.any(String));
    expect(question.optionIds).toHaveLength(question.options.length);
    expect(question).not.toHaveProperty("answer");
    expect(question).not.toHaveProperty("explain");
  }
  expect(payload).not.toHaveProperty("phrases");
  expect(payload).not.toHaveProperty("scenes");
  expect(payload).not.toHaveProperty("vocabulary");
  expect((await quizResponse.body()).length).toBeLessThan(15000);
  expect(requests.filter(url => /(?:SceneLearning|LandingPage|BotTutor|Dashboard)-/.test(url))).toEqual([]);
  expect(requests.filter(url => /\.(?:mp3|webp|woff2?)(?:\?|$)/.test(url))).toEqual([]);
  const scriptResponses = responses.filter(response => response.request().resourceType() === "script");
  const scriptBytes = (await Promise.all(scriptResponses.map(response => response.body()))).reduce((total, body) => total + body.length, 0);
  expect(scriptBytes).toBeLessThan(340000);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('a[href="/deutschlive/quiz"][aria-current="page"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("route navigation exposes destinations and works with the keyboard and browser history", async ({ page }) => {
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=medium");
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
  const menu = page.getByRole("button", { name: "Menü öffnen", exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.locator('a[href="/deutschlive/quiz"][aria-current="page"]')).toBeVisible();
    const learning = page.locator('.nav-tab[href="/deutschlive/learn"]');
    await expect(learning).toBeVisible();
    await learning.focus(); await page.keyboard.press("Enter");
  } else {
    const navigation = page.getByRole("combobox", { name: "Menü öffnen", exact: true });
    await expect(navigation).toHaveValue("/quiz");
    await navigation.focus(); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Enter");
  }
  await expect.poll(() => new URL(page.url()).pathname).toBe("/deutschlive/learn");
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/deutschlive/quiz");
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
  const params = new URL(page.url()).searchParams;
  expect(params.get("topic")).toBe("baeckerei");
  expect(params.get("difficulty")).toBe("medium");
});

for (const olderFinishesFirst of [true, false]) {
  test(`rapid topic changes keep the latest selection when the older request finishes ${olderFinishesFirst ? "first" : "last"}`, async ({ page }) => {
    const older = gate(), newer = gate(), olderStarted = gate(), newerStarted = gate();
    const bakery = topic("baeckerei", "Vorheriges Beispiel");
    const latest = topic("quiz-latest", "Aktuelles Beispiel");
    await mockTopics(page, [bakery, latest]);
    await page.route(quizTopicUrl(bakery.id), async route => {
      olderStarted.release();
      await older.ready;
      await route.fulfill({ json: bakery });
    });
    await page.route(quizTopicUrl(latest.id), async route => {
      newerStarted.release();
      await newer.ready;
      await route.fulfill({ json: latest });
    });
    try {
      await page.goto("/deutschlive/quiz");
      await olderStarted.ready;
      await page.locator(`.quiz-topic-button[data-topic-id="${latest.id}"]`).click();
      await newerStarted.ready;
      await expect(page.locator(`.quiz-topic-button[data-topic-id="${latest.id}"]`)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".quiz-shell")).toHaveAttribute("aria-busy", "true");
      if (olderFinishesFirst) {
        const oldResponse = page.waitForResponse(quizTopicUrl(bakery.id));
        older.release();
        await (await oldResponse).finished();
        await expect(page.locator(".quiz-workspace")).toHaveAttribute("aria-busy", "true");
        await expect(page.locator(".quiz-workspace__header")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toHaveCount(0);
      }
      newer.release();
      await expectSetup(page, latest);
      if (!olderFinishesFirst) {
        const oldResponse = page.waitForResponse(quizTopicUrl(bakery.id));
        older.release();
        await (await oldResponse).finished();
      }
      await expectSetup(page, latest);
      await expect(page.locator(".quiz-workspace__header")).toContainText(latest.label);
    } finally {
      older.release(); newer.release();
    }
  });
}

test("topic and difficulty deep links survive reload and browser history", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  const latest = topic("quiz-latest", "Beispiel Alltag");
  await mockTopics(page, [bakery, latest]);
  await page.goto("/deutschlive/quiz?topic=quiz-latest&difficulty=hard");
  await expectSetup(page, latest, "hard");
  await page.reload();
  await expectSetup(page, latest, "hard");
  await page.locator('.quiz-difficulty-button[data-difficulty="medium"]').click();
  await expectSetup(page, latest, "medium");
  await page.locator('.quiz-topic-button[data-topic-id="baeckerei"]').click();
  await expectSetup(page, bakery, "medium");
  await expect.poll(() => {
    const params = new URL(page.url()).searchParams;
    return [params.get("topic"), params.get("difficulty")];
  }).toEqual([bakery.id, "medium"]);
  await page.goBack();
  await expectSetup(page, latest, "medium");
  await page.goBack();
  await expectSetup(page, latest, "hard");
  await page.goForward();
  await expectSetup(page, latest, "medium");
});

test("an unknown difficulty query falls back to the supported easy setting", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=toString");
  await expectSetup(page, bakery, "easy");
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  await expect(page.getByRole("timer")).toContainText("60 Sek.");
});

test("failed topic loading removes old content and offers a working retry", async ({ page }) => {
  const bakery = topic("baeckerei", "Vorheriges Beispiel");
  const latest = topic("quiz-retry", "Neues Beispiel");
  let attempts = 0;
  await mockTopics(page, [bakery, latest]);
  await page.route(quizTopicUrl(latest.id), route => {
    attempts += 1;
    return attempts === 1 ? route.fulfill({ status: 503, json: { error: "Example unavailable." } }) : route.fulfill({ json: latest });
  });
  await page.goto("/deutschlive/quiz");
  await expectSetup(page, bakery);
  await page.locator(`.quiz-topic-button[data-topic-id="${latest.id}"]`).click();
  await expect(page.getByRole("alert")).toContainText("konnte nicht geladen werden");
  await expect(page.locator(".quiz-workspace__header")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Erneut laden", exact: true }).click();
  await expectSetup(page, latest);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("the topic list can recover after an unavailable response", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  let attempts = 0;
  await mockTopics(page, [bakery]);
  await page.route("**/deutschlive/api/topics/", route => {
    attempts += 1;
    return attempts === 1 ? route.fulfill({ status: 503, json: { error: "Example unavailable." } }) : route.fulfill({ json: { topics: [bakery] } });
  });
  await page.goto("/deutschlive/quiz");
  await expect(page.locator(".quiz-topic-picker").getByRole("alert")).toContainText("konnten nicht geladen werden");
  await expect(page.locator(".quiz-topic-button")).toHaveCount(0);
  await page.locator(".quiz-topic-picker").getByRole("button", { name: "Erneut laden", exact: true }).click();
  await expectSetup(page, bakery);
  expect(attempts).toBe(2);
});

test("keyboard users can answer and finish a labelled writing task before reading feedback", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  await page.goto("/deutschlive/quiz");
  const start = page.getByRole("button", { name: "Quiz starten", exact: true });
  await start.focus(); await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { name: bakery.quiz[0].question, exact: true });
  await expect(heading).toBeFocused();
  const progress = page.getByRole("progressbar", { name: "Fortschritt", exact: true });
  await expect(progress).toHaveAttribute("max", "2");
  await expect(progress).toHaveAttribute("value", "0");
  await page.keyboard.press("Tab");
  const correct = page.getByRole("button", { name: "Die richtige Antwort", exact: true });
  await expect(correct).toBeFocused();
  await page.keyboard.press("Space");
  await expect(correct).toBeDisabled();
  await expect(correct).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await expect(page.locator(".quiz-option.is-correct, .quiz-option.is-wrong")).toHaveCount(0);
  await expect(progress).toHaveAttribute("value", "1");
  const next = page.getByRole("button", { name: "Weiter", exact: true });
  await page.keyboard.press("Tab"); await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: bakery.free_answer.prompt, exact: true })).toBeFocused();
  const answer = page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true });
  await expect(answer).toHaveAttribute("aria-describedby", /\S/);
  expect(await answer.evaluate(element => element.getAttribute("aria-describedby").split(/\s+/).every(id => document.getElementById(id)?.textContent.trim()))).toBe(true);
  await answer.focus(); await page.keyboard.type(bakery.free_answer.example);
  const finish = page.getByRole("button", { name: "Quiz abschließen", exact: true });
  await finish.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "result");
  await expect(page.locator(".quiz-result-card")).toContainText("2 / 2");
  await expect(page.locator(".quiz-review")).toContainText("Das ist die passende Beispielantwort.");
  await expect(progress).toHaveAttribute("value", "2");
});

test("the timer exposes remaining time without live announcements and stops after an answer", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  await page.clock.install();
  await page.goto("/deutschlive/quiz");
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  const timer = page.getByRole("timer");
  await expect(timer).toHaveCount(1);
  await expect(timer).toHaveAttribute("aria-live", "off");
  const before = await timer.textContent();
  await page.clock.fastForward(5000);
  await expect(timer).not.toHaveText(before);
  await expect(page.getByRole("progressbar", { name: "Fortschritt", exact: true })).toHaveAttribute("value", "0");
  await expect(page.locator(".quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await page.getByRole("button", { name: "Die richtige Antwort", exact: true }).click();
  const stopped = await timer.textContent();
  await page.clock.fastForward(6000);
  await expect(timer).toHaveText(stopped);
});

test("a background time jump expires the question and prevents a late answer", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  const attempts = [];
  await page.route("**/deutschlive/api/quiz-attempts/", route => {
    const request = route.request().postDataJSON(); attempts.push(request);
    return route.fulfill({ json: evaluation(bakery, request, 0) });
  });
  await page.clock.install();
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=hard");
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  await page.clock.fastForward(31000);
  await expect(page.getByRole("button", { name: "Die richtige Antwort", exact: true })).toBeDisabled();
  await expect(page.getByRole("timer")).toContainText("0");
  await expect(page.locator(".quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Die Zeit ist abgelaufen." })).toBeVisible();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  const answer = page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true });
  await answer.fill(bakery.free_answer.example);
  await page.clock.fastForward(121000);
  await expect(answer).toBeDisabled();
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
  await expect(page.locator(".quiz-result-card")).toContainText("0 / 2");
  expect(attempts).toHaveLength(1);
  expect(attempts[0].answers).toEqual([{ questionId: bakery.quiz[0].id, optionId: null }]);
  expect(attempts[0].freeAnswerExpired).toBe(true);
});

test("an answer arriving after the deadline is rejected even before the timer updates the screen", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  await page.clock.install({ time: new Date("2026-10-12T10:00:00Z") });
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=hard");
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  const alreadyDisabled = await page.getByRole("button", { name: "Die richtige Antwort", exact: true }).evaluate(button => {
    const actualNow = Date.now;
    const disabled = button.disabled;
    const lateTime = actualNow() + 600000;
    try {
      Date.now = () => lateTime;
      button.click();
      return disabled;
    } finally {
      Date.now = actualNow;
    }
  });
  expect(alreadyDisabled).toBe(false);
  await expect(page.getByRole("status").filter({ hasText: "Die Zeit ist abgelaufen." })).toBeVisible();
  await expect(page.locator(".quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await expect(page.locator(".quiz-option.is-correct, .quiz-option.is-wrong")).toHaveCount(0);
});

test("synchronous repeated answer and guest completion clicks submit only once", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  await mockTopics(page, [bakery]);
  const attempts = [];
  await page.route("**/deutschlive/api/quiz-attempts/", route => {
    const request = route.request().postDataJSON(); attempts.push(request);
    return route.fulfill({ json: evaluation(bakery, request) });
  });
  await page.goto("/deutschlive/quiz");
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  await page.getByRole("button", { name: "Die richtige Antwort", exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(page.locator(".quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true }).fill(bakery.free_answer.example);
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(page.locator(".quiz-result-card")).toContainText("2 / 2");
  await expect(page.locator(".quiz-result-card")).toContainText("Temporäre Gastpunkte in dieser Sitzung: 2");
  expect(attempts).toHaveLength(1);
  expect(attempts[0].answers).toEqual([{ questionId: bakery.quiz[0].id, optionId: bakery.quiz[0].optionIds[0] }]);
});

test("pending result saves block duplicate requests and failed saves preserve the writing answer", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  const saving = gate(), started = gate();
  const attempts = [];
  await mockTopics(page, [bakery]);
  await mockUser(page);
  await page.route("**/deutschlive/api/quiz-attempts/", async route => {
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      started.release(); await saving.ready;
      await route.fulfill({ status: 503, json: { error: "Example unavailable." } });
    } else {
      await route.fulfill({ json: evaluation(bakery, attempts.at(-1)) });
    }
  });
  try {
    await page.goto("/deutschlive/quiz");
    await expect(page.locator(".app-nav__account-button").first()).toContainText(quizUser.username);
    await finishChoice(page);
    const answer = page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true });
    await answer.fill(bakery.free_answer.example);
    const finish = page.getByRole("button", { name: "Quiz abschließen", exact: true });
    await finish.evaluate(button => { button.click(); button.click(); });
    await started.ready;
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "saving");
    await expect(page.locator(".quiz-question-area button").last()).toBeDisabled();
    await expect(answer).toHaveJSProperty("readOnly", true);
    expect(attempts).toHaveLength(1);
    saving.release();
    await expect(page.getByRole("alert")).toContainText("konnte nicht gespeichert werden");
    await expect(answer).toHaveValue(bakery.free_answer.example);
    await expect(answer).toHaveJSProperty("readOnly", true);
    await page.getByRole("button", { name: "Erneut speichern", exact: true }).click();
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "result");
    await expect(page.locator(".quiz-result-card")).toContainText("2 / 2");
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(attempts).toHaveLength(2);
    expect(attempts.every(item => item.topicId === bakery.id && item.quizToken === bakery.quizToken && item.save === true)).toBe(true);
    expect(attempts[0]).not.toHaveProperty("score");
    expect(attempts[0]).not.toHaveProperty("total");
    expect(attempts[1]).toEqual(attempts[0]);
  } finally {
    saving.release();
  }
});
