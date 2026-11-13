const { test, expect } = require('@playwright/test');
const { blockExternalRequests } = require('./helpers/network.cjs');
const { routes } = require('../../../apps/deutsch-live/src/seo/routes.json');
const dictionaries = {
  de: require('../../../apps/deutsch-live/src/i18n/de.json'),
  ru: require('../../../apps/deutsch-live/src/i18n/ru.json'),
};

// Check both sides of each layout breakpoint, including widths between devices.
const widths = [320, 375, 480, 639, 640, 767, 768, 959, 960, 1023, 1024, 1280, 1440, 1920, 2560];

async function expectContentWithinViewport(page) {
  const overflowing = await page.evaluate(() => {
    const main = document.querySelector('main');
    return [...document.querySelectorAll('main h2, main h3, main p, main label, main input, main select, main textarea, main button, main a, main img, header a, header button, header select, header summary, footer p, footer a')].filter(element => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || element.closest('.sr-only, [hidden], [aria-hidden="true"]')) return false;
      if (rect.left >= -1 && rect.right <= innerWidth + 1) return false;
      // A local carousel may scroll; the page itself must never clip its content.
      for (let parent = element.parentElement; parent && parent !== main; parent = parent.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return false;
      }
      return true;
    }).map(element => ({ tag: element.tagName, text: element.textContent.slice(0, 80), class: element.className }));
  });
  expect(overflowing).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // Staying within the viewport is not enough if the brand collapses into a
  // column of individual letters at enlarged text sizes.
  const product = page.locator('.app-footer__product');
  expect(await product.evaluate(element => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight))).toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ context, page, baseURL }, testInfo) => {
  // This suite supplies its own viewport matrix; avoid running it twice.
  test.skip(testInfo.project.name !== 'desktop', 'The test sets phone, tablet and desktop widths itself.');
  await blockExternalRequests(context, baseURL);
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  if (page.errors) expect(page.errors).toEqual([]);
});

for (const language of ['de', 'ru']) {
  for (const route of [...Object.keys(routes), '/missing-page']) {
    test(`${language} ${route} fits all breakpoints and 200% text`, async ({ page }, testInfo) => {
      test.setTimeout(90000);
      await page.addInitScript(value => localStorage.setItem('deutsch-live-locale', value), language);
      if (route === '/grades') {
        // The menu still exposes the integrated calculator; direct URLs redirect
        // to the standalone portfolio calculator, which has its own tests.
        await page.goto('/deutschlive/');
        await page.getByRole('combobox', { name: dictionaries[language].common.openMenu, exact: true }).selectOption(route);
      } else {
        const response = await page.goto(`/deutschlive${route}`);
        expect(response.status()).toBe(route === '/missing-page' ? 404 : 200);
      }
      await expect(page.locator('main h2').first()).toBeVisible();
      await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      for (const width of widths) {
        await test.step(`${width}px`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await expectContentWithinViewport(page);
        });
      }
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      for (const width of [320, 768, 1280]) {
        await test.step(`${width}px with 200% text`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await expectContentWithinViewport(page);
        });
      }
      if (route === '/learn') {
        await page.setViewportSize({ width: 320, height: 740 });
        const steps = page.locator('.scene-learning-path');
        await steps.focus();
        await expect(steps).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => steps.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      }
      await page.screenshot({ path: testInfo.outputPath(`${language}-${route.slice(1) || 'home'}-large-text.png`), fullPage: true });
    });
  }
}

for (const language of ['de', 'ru']) {
  test(`${language} signed-in account, dashboard and settings reflow`, async ({ page }) => {
    test.setTimeout(90000);
    const settings = {
      role: 'learner', premiumStatus: 'free', hasPremiumAccess: false, emailVerified: true,
      interfaceLanguage: language, explanationLanguage: 'ru', themePreference: 'dark',
      level: 'a1', mainGoal: 'alltag', preferredTopic: 'baeckerei', saveProgress: true,
    };
    const user = { id: 42, username: 'Beispielperson mit langem Anzeigenamen', email: 'learner@example.test', isStaff: false, roles: ['learner'], settings };
    await page.route('**/deutschlive/api/auth/me/', route => route.fulfill({ json: { user } }));
    await page.route('**/deutschlive/api/dashboard/', route => route.fulfill({ json: {
      summary: { totalScore: 8, totalQuestions: 10, attemptCount: 1, average: 80, averageDurationSeconds: 42 },
      byTopic: [], recentAttempts: [], botHistory: [],
      progress: { completedScenes: 0, startedScenes: 1, totalScenes: 1 },
      learningPlan: { nextScene: { id: 'bakery', topicId: 'baeckerei', title: 'Ein Gespräch in der Bäckerei', level: 'a1', isPremium: false }, reviewTopics: [] },
      premiumHints: [], vocabulary: [{ id: 1, wordDe: 'Vollkornbrötchen', translationRu: 'Цельнозерновая булочка' }],
      recommendations: [], goals: { dailyMinutes: 10, dailyScenes: 1 }, badges: [], settings,
    } }));
    await page.route('**/api/session/activity/', route => route.fulfill({ json: { ok: true } }));
    await page.addInitScript(value => localStorage.setItem('deutsch-live-locale', value), language);
    for (const route of ['/account', '/dashboard', '/settings']) {
      await page.goto(`/deutschlive${route}`);
      await expect(page.locator('main h2').first()).toBeVisible();
      if (route !== '/account') await expect(page.locator('.dashboard-next-card')).toBeVisible();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await expectContentWithinViewport(page);
      }
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await expectContentWithinViewport(page);
      }
    }
  });
}
