const { test, expect } = require('@playwright/test');

async function ready(page) {
  await expect(page.locator('body')).toHaveClass(/is-enhanced/);
  await expect(page.locator('#contractPreview')).toHaveAttribute('aria-busy', 'false');
}

async function showDocument(page) {
  const tab = page.getByRole('tab', { name: 'Dokument', exact: true });
  if (await tab.isVisible()) await tab.click();
  else await page.locator('#showPreviewButton').click();
  await expect(page.locator('#previewPane')).toBeVisible();
}

test('hidden workspaces defer contract preview until the editor opens', async ({ page }) => {
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/vertragsgenerator/vorschau/')) requests.push(request);
  });
  await page.addInitScript(() => {
    localStorage.setItem('beirit-contract-generator:rent', JSON.stringify({
      vermieter: 'Fiktive gespeicherte Vermieterin',
    }));
  });
  await page.goto('/vertragsgenerator/');
  await expect(page.locator('body')).toHaveClass(/is-enhanced/);
  await page.locator('.studio-nav [data-workspace-link="assistant"]').click();
  await page.locator('.studio-nav [data-workspace-link="templates"]').click();
  // Wait past the preview debounce to distinguish deferred work from a timer.
  await page.waitForTimeout(300);
  expect(requests).toHaveLength(0);

  await page.locator('[data-open-template="rent"]').click();
  await ready(page);
  expect(requests).toHaveLength(1);
  await expect(page.locator('#contractPreview')).toContainText('Fiktive gespeicherte Vermieterin');
  expect(new URLSearchParams(requests[0].postData()).get('vermieter')).toBe('Fiktive gespeicherte Vermieterin');

  await page.getByRole('link', { name: 'Zur Übersicht', exact: true }).click();
  await page.locator('[data-open-template="rent"]').click();
  await ready(page);
  await page.waitForTimeout(300);
  expect(requests).toHaveLength(1);
});

test('typing retains validation links and icons without cloning every field label', async ({ page }) => {
  await page.goto('/vertragsgenerator/?template=purchase');
  await ready(page);
  await page.locator('#buyer').fill('');
  await ready(page);
  await expect(page.locator('#missingList button')).toHaveCount(1);

  const updates = await page.evaluate(() => {
    const link = document.querySelector('#missingList button');
    const feedback = document.querySelector('.feedback-icon').firstChild;
    const originalClone = Node.prototype.cloneNode;
    let labelClones = 0;
    Node.prototype.cloneNode = function (...args) {
      if (this instanceof HTMLLabelElement) labelClones += 1;
      return originalClone.apply(this, args);
    };
    const observer = new MutationObserver(() => {});
    for (const selector of ['#missingList', '.feedback-icon']) {
      observer.observe(document.querySelector(selector), { subtree: true, childList: true });
    }
    try {
      const field = document.querySelector('#seller');
      for (let index = 0; index < 100; index += 1) {
        field.value = `Fiktive Beispielperson ${index}`;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      field.focus();
      document.querySelector('#buyer').focus();
      return {
        sameLink: link === document.querySelector('#missingList button'),
        sameIcon: feedback === document.querySelector('.feedback-icon').firstChild,
        validationMutations: observer.takeRecords().length,
        labelClones,
      };
    } finally {
      Node.prototype.cloneNode = originalClone;
      observer.disconnect();
    }
  });
  expect(updates).toEqual({ sameLink: true, sameIcon: true, validationMutations: 0, labelClones: 0 });
  await ready(page);
  await expect(page.locator('#contractPreview')).toContainText('Fiktive Beispielperson 99');
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('beirit-contract-generator:purchase') || '{}').seller)).toBe('Fiktive Beispielperson 99');
  await showDocument(page);
  await page.locator('#missingList button').click();
  await expect(page.locator('#buyer')).toBeFocused();
  await expect(page.locator('#buyer')).toHaveAttribute('aria-invalid', 'true');
});

test('template changes attach validation links to the new fields', async ({ page }) => {
  await page.goto('/vertragsgenerator/?template=purchase');
  await ready(page);
  await page.locator('#buyer').fill('');
  await ready(page);
  await page.locator('#templateTrigger').click();
  await page.getByRole('option', { name: /Mietvertrag/ }).click();
  await ready(page);
  await page.locator('#mieter').fill('');
  await ready(page);
  await showDocument(page);
  await page.locator('#missingList button').filter({ hasText: /Mieter/ }).click();
  await expect(page.locator('#mieter')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Mieter leeren', exact: true })).toBeDisabled();
});
