const { test, expect } = require('@playwright/test');

test('named drafts survive reload, search, duplication and restore', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/vertragsgenerator/');
  await expect(page.locator('#workspaceTitle')).toBeVisible();
  await expect(page.locator('.template-card')).toHaveCount(3);
  await page.locator('[data-open-template="rent"]').click();
  await page.locator('#vermieter').fill('Fiktive Beispielperson');
  await page.locator('#saveSnapshotButton').click();
  await page.locator('#snapshotName').fill('Musterwohnung <Test>');
  await page.locator('#snapshotForm button[type="submit"]').click();
  await expect(page.locator('#snapshotDialog')).not.toBeVisible();
  await page.locator('#vermieter').fill('Neue Arbeitskopie');
  await page.getByRole('link', { name: 'Zur Übersicht', exact: true }).click();
  await page.locator('.studio-nav [data-workspace-link="drafts"]').click();
  await page.reload();
  await expect(page.locator('.draft-row h3')).toHaveText('Musterwohnung <Test>');
  await page.locator('#draftSearch').fill('kein Ergebnis');
  await expect(page.locator('.draft-no-results')).toBeVisible();
  await page.locator('#draftSearch').fill('');
  await page.locator('#draftFilter').selectOption('vehicle');
  await expect(page.locator('.draft-row')).toHaveCount(0);
  await page.locator('#draftFilter').selectOption('all');
  await page.getByRole('button', { name: 'Musterwohnung <Test> duplizieren', exact: true }).click();
  await expect(page.locator('.draft-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Musterwohnung <Test> öffnen', exact: true }).click();
  await expect(page.locator('#vermieter')).toHaveValue('Fiktive Beispielperson');
  await page.getByRole('link', { name: 'Zur Übersicht', exact: true }).click();
  await expect(page.locator('.draft-row')).toHaveCount(3);
  await expect(page.locator('.draft-row h3').first()).toContainText('vor Wiederherstellung');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Musterwohnung <Test> – Kopie löschen', exact: true }).click();
  await expect(page.locator('.draft-row')).toHaveCount(2);
  await page.goBack();
  await expect(page.locator('body')).toHaveAttribute('data-workspace', 'editor');
  expect(errors).toEqual([]);
});

test('storage failures stay visible', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.goto('/vertragsgenerator/?template=purchase');
  await page.locator('#saveSnapshotButton').click();
  await page.locator('#snapshotForm button[type="submit"]').click();
  await expect(page.locator('#snapshotError')).toContainText('Speichern nicht möglich');
  await expect(page.locator('#snapshotDialog')).toBeVisible();
});

test('illustrations load and workspace fits small screens', async ({ page }, testInfo) => {
  await page.goto('/vertragsgenerator/');
  await expect(page.locator('body')).toHaveClass(/is-enhanced/);
  for (const image of await page.locator('.studio-shell img').all()) {
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true });
  for (const width of [280, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('.studio-nav [data-workspace-link="templates"]').click();
    await expect(page.locator('#templates')).toBeVisible();
    await expect(page.locator('#drafts')).toBeHidden();
    await page.locator('.studio-nav [data-workspace-link="overview"]').click();
  }
});

test('AI suggestions require review and handle provider limits', async ({ page }, testInfo) => {
  await page.route('**/vertragsgenerator/assistent/', route => route.fulfill({json: {
    template: 'purchase', fields: {seller: 'Max Beispiel', buyer: 'Mira Muster', item: 'Fiktives Fahrrad', price: '180'},
    text: 'Fiktiver Kaufvertrag über ein Fahrrad für 180 Euro.', source: 'gemini',
  }}));
  // Enable the UI only. Provider requests are intercepted and never leave this test.
  await page.route('**/vertragsgenerator/', async route => {
    const response = await route.fetch();
    let html = await response.text();
    html = html.replace('"aiAvailable": false', '"aiAvailable": true').replace('id="aiSubmit" disabled', 'id="aiSubmit"');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/vertragsgenerator/#assistant');
  await expect(page.locator('#assistant')).toBeVisible();
  await page.locator('#aiTemplate').selectOption('purchase');
  await page.locator('#aiExample').click();
  await page.locator('#aiConsent').check();
  await page.locator('#aiSubmit').click();
  await expect(page.locator('#aiResultText')).toHaveValue(/Fiktiver Kaufvertrag/);
  await expect(page.locator('body')).toHaveAttribute('data-workspace', 'assistant');
  await page.screenshot({ path: testInfo.outputPath('assistant.png'), fullPage: true });
  await page.locator('#aiApply').click();
  await expect(page.locator('#seller')).toHaveValue('Max Beispiel');
  await page.getByRole('link', { name: 'KI-Assistent öffnen' }).click();
  await page.locator('#aiAction').selectOption('shorten');
  await page.unroute('**/vertragsgenerator/assistent/');
  await page.route('**/vertragsgenerator/assistent/', route => route.fulfill({status: 429, json: {error: 'Kostenloses Kontingent ausgeschöpft.'}}));
  await page.locator('#aiSubmit').click();
  await expect(page.locator('#aiStatus')).toContainText('Kontingent ausgeschöpft');
  await expect(page.locator('#aiSubmit')).toBeEnabled();
  await expect(page.locator('#aiResultActions')).toBeHidden();
});
