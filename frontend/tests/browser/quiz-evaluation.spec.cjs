const { test, expect } = require("@playwright/test");
const { gate } = require("./helpers/async.cjs");
const { blockExternalRequests } = require("./helpers/network.cjs");

const attemptsUrl = "**/deutschlive/api/quiz-attempts/";
const topicUrl = "**/deutschlive/api/topics/baeckerei/?view=quiz";
const writingAnswer = "Ich hätte gern ein Beispiel, bitte.";
const quizTopic = {
  id: "baeckerei", label: "Beispiel Bäckerei", ru: "Beispiel Bäckerei", icon: "🧪", phraseCount: 0, quizCount: 1,
  quizToken: "signed-example-token",
  quiz: [{
    id: "example-question", question: "Wie bitten Sie um ein Beispiel?",
    options: ["Ein Beispiel, bitte.", "Die andere Antwort."], optionIds: ["example-option-a", "example-option-b"],
  }],
  free_answer: {
    prompt: "Schreiben Sie eine Bitte auf Deutsch.", task: "Bitten Sie um ein Beispiel.",
    example: writingAnswer, building_blocks: [],
  },
};
const quizUser = {
  id: 42, username: "quiz@example.test", email: "quiz@example.test", isStaff: false, roles: ["learner"],
  settings: {
    role: "learner", premiumStatus: "free", hasPremiumAccess: false, emailVerified: true,
    interfaceLanguage: "de", explanationLanguage: "ru", themePreference: "light", level: "a1",
    mainGoal: "Beispiele lernen", preferredTopic: "baeckerei", saveProgress: true,
  },
};

test.beforeEach(async ({ context, baseURL, page }) => {
  await blockExternalRequests(context, baseURL);
  await context.addInitScript(() => localStorage.setItem("deutsch-live-locale", "de"));
  page.errors = [];
  page.on("pageerror", error => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function mockQuiz(page, initialUser = null) {
  let currentUser = initialUser;
  let topicLoads = 0;
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: currentUser } }));
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: { csrfToken: "a".repeat(32) } }));
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { ok: true } }));
  const { id, label, ru, icon, phraseCount, quizCount } = quizTopic;
  await page.route("**/deutschlive/api/topics/", route => route.fulfill({ json: { topics: [{ id, label, ru, icon, phraseCount, quizCount }] } }));
  await page.route(topicUrl, route => {
    topicLoads += 1;
    return route.fulfill({ json: { ...quizTopic, quizToken: `${quizTopic.quizToken}-${topicLoads}` } });
  });
  return { changeUser: user => { currentUser = user; }, loads: () => topicLoads };
}

function evaluation(request, { score = 1, correct = false, writingAccepted = true } = {}) {
  return {
    attempt: {
      id: request.save ? 7 : null, topicLabel: quizTopic.label, score, total: 2, percentage: score * 50,
      durationSeconds: request.durationSeconds, difficulty: request.difficulty,
    },
    saved: request.save,
    feedback: [{
      questionId: quizTopic.quiz[0].id, selectedOptionId: request.answers[0].optionId,
      correctOptionId: quizTopic.quiz[0].optionIds[1], correct,
      explain: "Die zweite Antwort ist die vom Server vorgegebene Lösung.",
    }],
    writing: { accepted: writingAccepted, explain: "Die Schreibaufgabe wurde auf dem Server auf Vollständigkeit geprüft." },
  };
}

async function openQuiz(page, user = null) {
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=medium");
  await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
  if (user) await expect(page.locator(".app-nav__account-button").first()).toContainText(user.username);
}

async function reachWriting(page) {
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  await page.getByRole("button", { name: quizTopic.quiz[0].options[0], exact: true }).click();
  await expect(page.locator(".quiz-option.is-correct, .quiz-option.is-wrong")).toHaveCount(0);
  await expect(page.locator(".quiz-review, .quiz-result-card, .quiz-feedback.is-correct, .quiz-feedback.is-wrong")).toHaveCount(0);
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true }).fill(writingAnswer);
}

function expectAnswerPayload(request, save) {
  expect(Object.keys(request).sort()).toEqual([
    "answers", "difficulty", "durationSeconds", "freeAnswer", "freeAnswerExpired", "quizToken", "save", "topicId",
  ]);
  expect(request.topicId).toBe(quizTopic.id);
  expect(request.quizToken).toBe(`${quizTopic.quizToken}-1`);
  expect(request.answers).toEqual([{ questionId: quizTopic.quiz[0].id, optionId: quizTopic.quiz[0].optionIds[0] }]);
  expect(request.freeAnswer).toBe(writingAnswer);
  expect(request.freeAnswerExpired).toBe(false);
  expect(request.difficulty).toBe("medium");
  expect(request.durationSeconds).toEqual(expect.any(Number));
  expect(request.durationSeconds).toBeGreaterThanOrEqual(0);
  expect(request.save).toBe(save);
  expect(request).not.toHaveProperty("score");
  expect(request).not.toHaveProperty("total");
}

test("the final server score and corrections replace local assumptions without sending points", async ({ page }) => {
  const responding = gate(), started = gate();
  const requests = [];
  await mockQuiz(page, quizUser);
  await page.route(attemptsUrl, async route => {
    const request = route.request().postDataJSON(); requests.push(request);
    started.release(); await responding.ready;
    await route.fulfill({ json: evaluation(request, { score: 0, writingAccepted: false }) });
  });
  try {
    await openQuiz(page, quizUser);
    await reachWriting(page);
    await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
    await started.ready;
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "saving");
    await expect(page.locator(".quiz-result-card, .quiz-review")).toHaveCount(0);
    expect(requests).toHaveLength(1);
    expectAnswerPayload(requests[0], true);
    responding.release();
    await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 0 / 2");
    const correction = page.locator(`.quiz-review-item[data-question-id="${quizTopic.quiz[0].id}"]`);
    await expect(correction).toContainText(quizTopic.quiz[0].question);
    await expect(correction).toContainText(`Ihre Antwort: ${quizTopic.quiz[0].options[0]}`);
    await expect(correction).toContainText(`Richtige Antwort: ${quizTopic.quiz[0].options[1]}`);
    await expect(correction.locator(".quiz-feedback.is-wrong")).toContainText("Die zweite Antwort ist die vom Server vorgegebene Lösung.");
    await expect(page.locator(".quiz-writing-feedback")).toContainText("Kein Vollständigkeitspunkt");
    await expect(page.locator(".quiz-writing-feedback")).toContainText("Inhalt und Sprache werden dabei nicht korrigiert");
    await expect(page.locator(".quiz-result-card")).toContainText("in Ihrem Account gespeichert");
  } finally {
    responding.release();
  }
});

for (const saveDisabled of [false, true]) {
  test(`${saveDisabled ? "a user with saving disabled" : "a guest"} receives server points with save=false`, async ({ page }) => {
    const user = saveDisabled ? { ...quizUser, settings: { ...quizUser.settings, saveProgress: false } } : null;
    const requests = [];
    await mockQuiz(page, user);
    await page.route(attemptsUrl, route => {
      const request = route.request().postDataJSON(); requests.push(request);
      return route.fulfill({ json: evaluation(request) });
    });
    await openQuiz(page, user);
    await reachWriting(page);
    await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
    await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 1 / 2");
    expect(requests).toHaveLength(1);
    expectAnswerPayload(requests[0], false);
    await expect(page.locator(".quiz-result-card")).toContainText(saveDisabled
      ? "Speichern ist in den Einstellungen deaktiviert" : "Temporäre Gastpunkte in dieser Sitzung: 1");
    await expect(page.locator(".quiz-result-card")).not.toContainText("in Ihrem Account gespeichert");
    await page.getByRole("button", { name: "Quiz neu starten", exact: true }).click();
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
    await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
    await expect(page.locator(".quiz-result-card, .quiz-review")).toHaveCount(0);
    expect(requests).toHaveLength(1);
  });
}

for (const failure of ["network", "storage"]) {
  test(`${failure} failure preserves the exact answers for a successful retry`, async ({ page }) => {
    const requests = [];
    await mockQuiz(page, quizUser);
    await page.route(attemptsUrl, route => {
      const request = route.request().postDataJSON(); requests.push(request);
      if (requests.length === 1) return failure === "network" ? route.abort("connectionfailed")
        : route.fulfill({ status: 503, json: { error: "Example storage unavailable.", code: "quiz_storage_unavailable" } });
      return route.fulfill({ json: evaluation(request) });
    });
    await openQuiz(page, quizUser);
    await reachWriting(page);
    await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(failure === "network" ? "Die Verbindung ist fehlgeschlagen" : "Das Ergebnis konnte nicht gespeichert werden");
    await expect(page.locator(".quiz-result-card")).toHaveCount(0);
    const answer = page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true });
    await expect(answer).toHaveValue(writingAnswer);
    await expect(answer).toHaveJSProperty("readOnly", true);
    await page.getByRole("button", { name: "Erneut speichern", exact: true }).click();
    await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 1 / 2");
    await expect(alert).toHaveCount(0);
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
  });
}

for (const status of [401, 403]) {
  test(`an authentication error (${status}) offers sign-in and keeps the answers for retry`, async ({ page }) => {
    const requests = [];
    await mockQuiz(page, quizUser);
    await page.route(attemptsUrl, route => {
      const request = route.request().postDataJSON(); requests.push(request);
      return requests.length === 1 ? route.fulfill({ status, json: { error: "Example authentication required." } })
        : route.fulfill({ json: evaluation(request) });
    });
    await openQuiz(page, quizUser);
    await reachWriting(page);
    await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Ihre Anmeldung ist abgelaufen");
    const login = page.getByRole("link", { name: "In neuem Tab anmelden", exact: true });
    await expect(login).toHaveAttribute("target", "_blank");
    await expect(login).toHaveAttribute("href", /(?:\/login\/|\/deutschlive\/account)/);
    await expect(page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true })).toHaveValue(writingAnswer);
    await expect(page.locator(".quiz-result-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Erneut speichern", exact: true }).click();
    await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 1 / 2");
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
  });
}

test("a rejected token has a validation message and reload starts with a fresh token", async ({ page }) => {
  const requests = [];
  const mocked = await mockQuiz(page, quizUser);
  await page.route(attemptsUrl, route => {
    const request = route.request().postDataJSON(); requests.push(request);
    return requests.length === 1 ? route.fulfill({ status: 400, json: { error: "Example invalid quiz.", code: "invalid_quiz_token" } })
      : route.fulfill({ json: evaluation(request) });
  });
  await openQuiz(page, quizUser);
  await reachWriting(page);
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Das Ergebnis wurde nicht angenommen");
  await expect(page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true })).toHaveValue(writingAnswer);
  await expect(page.locator(".quiz-result-card")).toHaveCount(0);
  const loadsBefore = mocked.loads();
  await page.getByRole("button", { name: "Quiz neu laden", exact: true }).click();
  await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(mocked.loads()).toBeGreaterThan(loadsBefore);
  await reachWriting(page);
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
  await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 1 / 2");
  expect(requests).toHaveLength(2);
  expect(requests[1].quizToken).not.toBe(requests[0].quizToken);
});

test("a settings rejection can evaluate the retained answers without saving", async ({ page }) => {
  const requests = [];
  await mockQuiz(page, quizUser);
  await page.route(attemptsUrl, route => {
    const request = route.request().postDataJSON(); requests.push(request);
    return requests.length === 1 ? route.fulfill({ status: 403, json: { error: "Example saving disabled.", code: "save_progress_disabled" } })
      : route.fulfill({ json: evaluation(request) });
  });
  await openQuiz(page, quizUser);
  await reachWriting(page);
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Das Speichern ist in Ihren Einstellungen deaktiviert");
  await expect(page.getByRole("link", { name: "In neuem Tab anmelden", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true })).toHaveValue(writingAnswer);
  await page.getByRole("button", { name: "Ohne Speichern auswerten", exact: true }).click();
  await expect(page.locator(".quiz-result-card h3")).toHaveText("Ergebnis: 1 / 2");
  await expect(page.locator(".quiz-result-card")).toContainText("Speichern ist in den Einstellungen deaktiviert");
  expect(requests).toHaveLength(2);
  expect(requests[0].save).toBe(true);
  expect(requests[1]).toEqual({ ...requests[0], save: false });
});

for (const status of [401, 403]) {
  test(`a quiz load authentication error (${status}) offers sign-in and a working reload`, async ({ page }) => {
    await mockQuiz(page, quizUser);
    let loads = 0;
    await page.route(topicUrl, route => {
      loads += 1;
      return loads === 1 ? route.fulfill({ status, json: { error: "Example authentication required." } })
        : route.fulfill({ json: quizTopic });
    });
    await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=medium");
    await expect(page.getByRole("alert")).toContainText("Ihre Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an und laden Sie das Quiz wieder.");
    await expect(page.getByRole("link", { name: "In neuem Tab anmelden", exact: true })).toHaveAttribute("target", "_blank");
    await expect(page.locator(".quiz-workspace__header, .quiz-result-card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Erneut laden", exact: true }).click();
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
    await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(loads).toBe(2);
  });
}

async function completeRealQuiz(page, { refreshGuest = false } = {}) {
  const topicResponse = page.waitForResponse(topicUrl);
  await page.goto("/deutschlive/quiz?topic=baeckerei&difficulty=easy");
  const topic = await (await topicResponse).json();
  expect(topic.quiz.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
  if (refreshGuest) {
    const sessionResponse = page.waitForResponse("**/deutschlive/api/auth/me/");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const session = await (await sessionResponse).json();
    expect(session.user).toBeNull();
    await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "question");
  }
  for (const question of topic.quiz) {
    await expect(page.getByRole("heading", { name: question.question, exact: true })).toBeVisible();
    await page.locator(".quiz-option").first().click();
    await expect(page.locator(".quiz-option.is-correct, .quiz-option.is-wrong")).toHaveCount(0);
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  await page.getByRole("textbox", { name: "Antwort auf Deutsch", exact: true }).fill(writingAnswer);
  const attemptResponse = page.waitForResponse(attemptsUrl);
  await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
  const response = await attemptResponse;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  const request = response.request().postDataJSON();
  expect(request.answers).toEqual(topic.quiz.map(question => ({ questionId: question.id, optionId: question.optionIds[0] })));
  expect(request).not.toHaveProperty("score");
  expect(request).not.toHaveProperty("total");
  expect(result.attempt.total).toBe(topic.quiz.length + 1);
  expect(result.writing.accepted).toBe(true);
  expect(result.attempt.score).toBe(result.feedback.filter(item => item.correct).length + 1);
  await expect(page.locator(".quiz-result-card h3")).toHaveText(`Ergebnis: ${result.attempt.score} / ${result.attempt.total}`);
  await expect(page.locator(".quiz-review-item")).toHaveCount(topic.quiz.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  return { result, request };
}

test("a real guest quiz remains assessable after a session refresh without saving an account attempt", async ({ page }, testInfo) => {
  const { result, request } = await completeRealQuiz(page, { refreshGuest: true });
  expect(request.save).toBe(false);
  expect(result.saved).toBe(false);
  expect(result.attempt.id).toBeNull();
  await expect(page.locator(".quiz-result-card")).toContainText(`Temporäre Gastpunkte in dieser Sitzung: ${result.attempt.score}`);
  await page.screenshot({ path: testInfo.outputPath("real-quiz-result.png"), fullPage: true });
  const dashboard = await page.request.get("/deutschlive/api/dashboard/");
  expect(dashboard.status()).toBe(401);
});

test("a real registered account saves its assessed quiz in the dashboard", async ({ page }, testInfo) => {
  const username = `quiz-browser-${testInfo.project.name}-${Date.now()}-${testInfo.workerIndex}`;
  const password = "Example-only-Quiz-42!";
  const csrf = await page.request.get("/deutschlive/api/auth/csrf/");
  expect(csrf.ok()).toBe(true);
  const { csrfToken } = await csrf.json();
  const registered = await page.request.post("/deutschlive/api/auth/register/", {
    headers: { "X-CSRFToken": csrfToken }, data: { username, email: `${username}@example.test`, password },
  });
  expect(registered.status()).toBe(201);
  const loggedIn = await page.request.post("/deutschlive/api/auth/login/", {
    headers: { "X-CSRFToken": csrfToken }, data: { username, password },
  });
  expect(loggedIn.status()).toBe(200);
  const settingsCsrf = await page.request.get("/deutschlive/api/auth/csrf/");
  const settingsToken = (await settingsCsrf.json()).csrfToken;
  const settings = await page.request.patch("/deutschlive/api/settings/", {
    headers: { "X-CSRFToken": settingsToken }, data: { interfaceLanguage: "de" },
  });
  expect(settings.ok()).toBe(true);
  const { result, request } = await completeRealQuiz(page);
  expect(request.save).toBe(true);
  expect(result.saved).toBe(true);
  expect(result.attempt.id).toEqual(expect.any(Number));
  await expect(page.locator(".quiz-result-card")).toContainText("in Ihrem Account gespeichert");
  await page.screenshot({ path: testInfo.outputPath("real-quiz-result.png"), fullPage: true });
  const replayCsrf = await page.request.get("/deutschlive/api/auth/csrf/");
  const replayToken = (await replayCsrf.json()).csrfToken;
  const replay = await page.request.post("/deutschlive/api/quiz-attempts/", {
    headers: { "X-CSRFToken": replayToken }, data: request,
  });
  expect(replay.ok()).toBe(true);
  expect((await replay.json()).attempt.id).toBe(result.attempt.id);
  const dashboard = await page.request.get("/deutschlive/api/dashboard/");
  expect(dashboard.ok()).toBe(true);
  const data = await dashboard.json();
  expect(data.summary.attemptCount).toBe(1);
  expect(data.summary.totalScore).toBe(result.attempt.score);
  expect(data.summary.totalQuestions).toBe(result.attempt.total);
  expect(data.recentAttempts).toEqual(expect.arrayContaining([expect.objectContaining({
    id: result.attempt.id, topicId: "baeckerei", score: result.attempt.score, total: result.attempt.total,
  })]));
});

for (const nextUser of [null, { ...quizUser, id: 84, username: "anderes-konto@example.test", email: "anderes-konto@example.test" }]) {
  test(`a late evaluation cannot populate the quiz after ${nextUser ? "an account change" : "sign-out"}`, async ({ page }) => {
    const responding = gate(), started = gate();
    const mocked = await mockQuiz(page, quizUser);
    await page.route(attemptsUrl, async route => {
      const request = route.request().postDataJSON();
      started.release(); await responding.ready;
      await route.fulfill({ json: evaluation(request) });
    });
    try {
      await openQuiz(page, quizUser);
      await reachWriting(page);
      await page.getByRole("button", { name: "Quiz abschließen", exact: true }).click();
      await started.ready;
      await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "saving");
      mocked.changeUser(nextUser);
      const accountResponse = page.waitForResponse("**/deutschlive/api/auth/me/");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await (await accountResponse).finished();
      await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
      const oldResponse = page.waitForResponse(attemptsUrl);
      responding.release();
      await (await oldResponse).finished();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator(".quiz-shell")).toHaveAttribute("data-state", "ready");
      await expect(page.locator(".quiz-result-card, .quiz-review")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Quiz starten", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Quiz starten", exact: true }).click();
      await expect(page.locator(".quiz-progress-panel")).toContainText("0 / 2");
      await expect(page.locator(".quiz-result-card")).toHaveCount(0);
    } finally {
      responding.release();
    }
  });
}
