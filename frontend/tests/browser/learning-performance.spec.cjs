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

function topic(id, title) {
  return {
    id, label: title, ru: title, icon: "🧪", phraseCount: 1, quizCount: 0,
    phrases: [{ de: "Ein Beispiel.", ru: "Example.", hint: "Example." }],
    scenes: [{
      id: `${id}-scene`, title, ru: title, level: "a1", isPremium: false,
      dialogue: [{ speaker: "Example", de: "Ein Beispiel.", ru: "Example." }],
      explanation: "Example.",
    }],
    vocabulary: [], exercises: [], quiz: [],
  };
}

function learningTopicUrl(id) {
  return `**/deutschlive/api/topics/${id}/?view=learn`;
}

async function mockTopics(page, topics) {
  await page.route("**/deutschlive/api/topics/", route => route.fulfill({ json: { topics } }));
  for (const item of topics) {
    await page.route(learningTopicUrl(item.id), route => route.fulfill({ json: item }));
  }
}

async function expectSelection(page, topicId, sceneId) {
  await expect(page.locator(".scene-learning-layout")).toHaveAttribute("data-topic-id", topicId);
  await expect(page.locator(".dialog-card")).toHaveAttribute("data-scene-id", sceneId);
  await expect(page.locator(`.scene-topic-button[data-topic-id="${topicId}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`.scene-picker__button[data-scene-id="${sceneId}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.scene-topic-button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('.scene-picker__button[aria-pressed="true"]')).toHaveCount(1);
  await expect.poll(() => {
    const params = new URL(page.url()).searchParams;
    return [params.get("topic"), params.get("scene")];
  }).toEqual([topicId, sceneId]);
}

const learningUser = {
  id: 42, username: "lernen@example.test", email: "lernen@example.test", isStaff: false, roles: ["learner"],
  settings: {
    role: "learner", premiumStatus: "free", hasPremiumAccess: false, emailVerified: true,
    interfaceLanguage: "de", explanationLanguage: "ru", themePreference: "light", level: "a1",
    mainGoal: "Beispiele lernen", preferredTopic: "baeckerei", saveProgress: true,
  },
};

async function mockLearningUser(page) {
  await page.route("**/deutschlive/api/auth/me/", route => route.fulfill({ json: { user: learningUser } }));
  await page.route("**/deutschlive/api/auth/csrf/", route => route.fulfill({ json: { csrfToken: "a".repeat(32) } }));
  await page.route("**/api/session/activity/", route => route.fulfill({ json: { ok: true } }));
}

async function expectLearningUser(page) {
  await expect(page.locator(".app-nav__account-button").first()).toContainText(learningUser.username);
}

for (const olderFinishesFirst of [true, false]) {
  test(`rapid topic changes keep the latest selection when the older request finishes ${olderFinishesFirst ? "first" : "last"}`, async ({ page }) => {
    const older = gate(), newer = gate(), olderStarted = gate(), newerStarted = gate();
    const bakery = topic("baeckerei", "Vorherige Auswahl");
    const latest = topic("summary-latest", "Aktuelle Auswahl");
    await page.route("**/deutschlive/api/topics/", route => route.fulfill({ json: { topics: [bakery, latest] } }));
    await page.route(learningTopicUrl("baeckerei"), async route => {
      olderStarted.release();
      await older.ready;
      await route.fulfill({ json: bakery });
    });
    await page.route(learningTopicUrl("summary-latest"), async route => {
      newerStarted.release();
      await newer.ready;
      await route.fulfill({ json: latest });
    });
    try {
      await page.goto("/deutschlive/learn");
      await olderStarted.ready;
      const selected = page.locator(".scene-topic-button").filter({ hasText: latest.label });
      await selected.click();
      await newerStarted.ready;
      await expect(selected).toHaveAttribute("aria-pressed", "true");

      if (olderFinishesFirst) {
        const oldResponse = page.waitForResponse(learningTopicUrl("baeckerei"));
        older.release();
        await (await oldResponse).finished();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await expect(page.locator(".scene-learning-topic-title")).toHaveCount(0);
        await expect(page.locator(".scene-picker__list .skeleton-block").first()).toBeVisible();
      }
      newer.release();
      await expect(page.locator(".scene-learning-topic-title")).toContainText(latest.label);
      if (!olderFinishesFirst) {
        const oldResponse = page.waitForResponse(learningTopicUrl("baeckerei"));
        older.release();
        await (await oldResponse).finished();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      await expect(page.locator(".scene-learning-topic-title")).toContainText(latest.label);
      await expect(page.locator(".scene-picker__topic")).toContainText(latest.label);
      await expect(selected).toHaveAttribute("aria-pressed", "true");
    } finally {
      older.release();
      newer.release();
    }
  });
}

test("topic and scene deep links survive reload and browser history", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  const latest = topic("summary-latest", "Beispiel Alltag");
  latest.scenes.push({ ...latest.scenes[0], id: "summary-latest-second", title: "Zweite Beispielszene", ru: "Zweite Beispielszene" });
  await mockTopics(page, [bakery, latest]);

  await page.goto("/deutschlive/learn?topic=summary-latest&scene=summary-latest-second");
  await expectSelection(page, latest.id, "summary-latest-second");
  await page.reload();
  await expectSelection(page, latest.id, "summary-latest-second");
  await page.locator('.scene-picker__button[data-scene-id="summary-latest-scene"]').click();
  await expectSelection(page, latest.id, "summary-latest-scene");
  await page.locator('.scene-topic-button[data-topic-id="baeckerei"]').click();
  await expectSelection(page, bakery.id, "baeckerei-scene");

  await page.goBack();
  await expectSelection(page, latest.id, "summary-latest-scene");
  await page.goBack();
  await expectSelection(page, latest.id, "summary-latest-second");
  await page.goForward();
  await expectSelection(page, latest.id, "summary-latest-scene");
});

test("a failed topic switch hides old content and can be retried", async ({ page }) => {
  const bakery = topic("baeckerei", "Vorheriges Beispiel");
  const next = topic("retry-example", "Neues Beispiel");
  let attempts = 0;
  await mockTopics(page, [bakery, next]);
  await page.route(learningTopicUrl(next.id), route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: "Example unavailable." } })
      : route.fulfill({ json: next });
  });
  await page.goto("/deutschlive/learn");
  await expectSelection(page, bakery.id, "baeckerei-scene");
  await page.locator('.scene-topic-button[data-topic-id="retry-example"]').click();
  await expect(page.getByRole("alert")).toContainText("Dieses Thema konnte nicht geladen werden");
  await expect(page.locator(".scene-learning-layout")).toHaveCount(0);
  await expect(page.locator(".scene-learning-topic-title")).toHaveCount(0);
  await expect(page.locator(".scene-picker__button")).toHaveCount(0);
  await expect(page.locator('.scene-topic-button[data-topic-id="retry-example"]')).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Erneut laden", exact: true }).click();
  await expectSelection(page, next.id, "retry-example-scene");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("the topic list can recover from a failed request", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  let attempts = 0;
  await mockTopics(page, [bakery]);
  await page.route("**/deutschlive/api/topics/", route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: "Example unavailable." } })
      : route.fulfill({ json: { topics: [bakery] } });
  });
  await page.goto("/deutschlive/learn");
  const list = page.locator(".scene-topic-list");
  await expect(list.getByRole("alert")).toContainText("Die Themen konnten nicht geladen werden");
  await expect(list.locator(".scene-topic-button")).toHaveCount(0);
  await list.getByRole("button", { name: "Erneut laden", exact: true }).click();
  await expectSelection(page, bakery.id, "baeckerei-scene");
  await expect(list.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("completion prevents duplicate saves and reports a failed POST before a retry", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  const firstSave = gate(), started = gate();
  const progress = [], vocabulary = [];
  await mockTopics(page, [bakery]);
  await mockLearningUser(page);
  await page.route("**/deutschlive/api/progress/", async route => {
    progress.push(route.request().postDataJSON());
    if (progress.length === 1) {
      started.release();
      await firstSave.ready;
      await route.fulfill({ status: 503, json: { error: "Example unavailable." } });
    } else {
      await route.fulfill({ json: { progress: progress.at(-1) } });
    }
  });
  await page.route("**/deutschlive/api/vocabulary/", route => {
    vocabulary.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  try {
    await page.goto("/deutschlive/learn");
    await expectSelection(page, bakery.id, "baeckerei-scene");
    await expectLearningUser(page);
    const complete = page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true });
    await complete.evaluate(button => { button.click(); button.click(); });
    await started.ready;
    const saving = page.getByRole("button", { name: "Fortschritt wird gespeichert …", exact: true });
    await expect(saving).toBeDisabled();
    await expect(saving).toHaveAttribute("aria-busy", "true");
    expect(progress).toHaveLength(1);
    firstSave.release();

    await expect(page.getByRole("alert")).toContainText("Der Fortschritt konnte nicht gespeichert werden");
    await expect(complete).toBeEnabled();
    expect(vocabulary).toHaveLength(0);
    await complete.click();
    await expect(page.locator(".scene-learning-sidebar").getByRole("status")).toContainText("Szene abgeschlossen");
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(progress).toHaveLength(2);
    expect(progress.every(item => item.topicId === bakery.id)).toBe(true);
    expect(vocabulary).toHaveLength(1);
  } finally {
    firstSave.release();
  }
});

test("a vocabulary failure reports saved progress and allows a successful retry", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  const progress = [], vocabulary = [];
  await mockTopics(page, [bakery]);
  await mockLearningUser(page);
  await page.route("**/deutschlive/api/progress/", route => {
    progress.push(route.request().postDataJSON());
    return route.fulfill({ json: { progress: progress.at(-1) } });
  });
  await page.route("**/deutschlive/api/vocabulary/", route => {
    vocabulary.push(route.request().postDataJSON());
    return vocabulary.length === 1
      ? route.fulfill({ status: 503, json: { error: "Example vocabulary unavailable." } })
      : route.fulfill({ json: { ok: true } });
  });
  await page.goto("/deutschlive/learn");
  await expectSelection(page, bakery.id, "baeckerei-scene");
  await expectLearningUser(page);
  const complete = page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true });
  await complete.click();
  await expect(page.getByRole("alert")).toContainText("Der Fortschritt wurde gespeichert");
  await expect(page.getByRole("alert")).toContainText("konnte noch nicht zu den Wörtern hinzugefügt werden");
  await expect(complete).toBeEnabled();
  expect(progress).toHaveLength(1);
  expect(vocabulary).toHaveLength(1);
  await complete.click();
  await expect(page.locator(".scene-learning-sidebar").getByRole("status")).toContainText("Szene abgeschlossen");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(complete).toBeEnabled();
  expect(progress).toHaveLength(2);
  expect(vocabulary).toHaveLength(2);
  expect(vocabulary[1]).toEqual(vocabulary[0]);
});

test("completion retries its CSRF request after a network failure", async ({ page }) => {
  const bakery = topic("baeckerei", "Beispiel Bäckerei");
  let saving = false, csrfRequests = 0;
  const progress = [], vocabulary = [];
  await mockTopics(page, [bakery]);
  await mockLearningUser(page);
  await page.route("**/deutschlive/api/auth/csrf/", route => {
    if (saving) csrfRequests += 1;
    return saving && csrfRequests === 1
      ? route.fulfill({ status: 503, json: { error: "Example unavailable." } })
      : route.fulfill({ json: { csrfToken: "a".repeat(32) } });
  });
  await page.route("**/deutschlive/api/progress/", route => {
    progress.push(route.request().postDataJSON());
    return route.fulfill({ json: { progress: progress.at(-1) } });
  });
  await page.route("**/deutschlive/api/vocabulary/", route => {
    vocabulary.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/deutschlive/learn");
  await expectSelection(page, bakery.id, "baeckerei-scene");
  await expectLearningUser(page);
  // Platform builds also check CSRF during session setup, before any save.
  await page.waitForLoadState("networkidle");
  saving = true;
  const complete = page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true });
  await complete.click();
  await expect(page.getByRole("alert")).toContainText("Der Fortschritt konnte nicht gespeichert werden");
  await expect(complete).toBeEnabled();
  expect(csrfRequests).toBe(1);
  expect(progress).toHaveLength(0);
  expect(vocabulary).toHaveLength(0);

  await complete.click();
  await expect(page.locator(".scene-learning-sidebar").getByRole("status")).toContainText("Szene abgeschlossen");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(csrfRequests).toBe(2);
  expect(progress).toHaveLength(1);
  expect(vocabulary).toHaveLength(1);
});

test("a scene without phrases can save progress without crashing or saving vocabulary", async ({ page }) => {
  const bakery = { ...topic("baeckerei", "Leeres Phrasenbeispiel"), phrases: [] };
  const progress = [], vocabulary = [];
  await mockTopics(page, [bakery]);
  await mockLearningUser(page);
  await page.route("**/deutschlive/api/progress/", route => {
    progress.push(route.request().postDataJSON());
    return route.fulfill({ json: { progress: progress.at(-1) } });
  });
  await page.route("**/deutschlive/api/vocabulary/", route => {
    vocabulary.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/deutschlive/learn");
  await expectSelection(page, bakery.id, "baeckerei-scene");
  await expectLearningUser(page);
  await page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true }).click();
  await expect(page.locator(".scene-learning-sidebar").getByRole("status")).toHaveText("Szene als abgeschlossen gespeichert.");
  expect(progress).toHaveLength(1);
  expect(vocabulary).toHaveLength(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a late completion response cannot show success on a different topic", async ({ page }) => {
  const bakery = topic("baeckerei", "Vorheriges Beispiel");
  const next = topic("save-next-example", "Nächstes Beispiel");
  const saved = gate(), started = gate();
  const vocabulary = [];
  await mockTopics(page, [bakery, next]);
  await mockLearningUser(page);
  await page.route("**/deutschlive/api/progress/", async route => {
    started.release();
    await saved.ready;
    await route.fulfill({ json: { progress: route.request().postDataJSON() } });
  });
  await page.route("**/deutschlive/api/vocabulary/", route => {
    vocabulary.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  try {
    await page.goto("/deutschlive/learn");
    await expectSelection(page, bakery.id, "baeckerei-scene");
    await expectLearningUser(page);
    await page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true }).click();
    await started.ready;
    await page.locator('.scene-topic-button[data-topic-id="save-next-example"]').click();
    await expectSelection(page, next.id, "save-next-example-scene");
    const response = page.waitForResponse("**/deutschlive/api/progress/");
    saved.release();
    await (await response).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator(".scene-learning-sidebar").getByRole("status")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Szene als abgeschlossen markieren", exact: true })).toBeEnabled();
    expect(vocabulary).toHaveLength(0);
  } finally {
    saved.release();
  }
});
