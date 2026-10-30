const { test, expect } = require('@playwright/test');

test('purchase item stays editable, saves and renders multiline content as plain text', async ({ page }) => {
  await page.goto('/vertragsgenerator/?template=purchase');
  // "item" also names a native HTMLFormControlsCollection method.
  await expect(page.locator('#item')).toHaveValue('Mini-Familienplaner als PDF');
  await page.locator('#stepList [data-group="object"] button').click();
  const item = '<strong>Fiktives Fahrrad</strong>\nMit Fahrradlampe und Klingel';
  await page.locator('#item').fill(item);
  const clause = page.locator('#contractPreview .document-clause').filter({ hasText: 'Kaufgegenstand' });
  await expect(clause.locator('p')).toHaveText(item);
  await expect(clause.locator('strong')).toHaveCount(0);
  await expect(clause.locator('p')).toHaveCSS('white-space', 'pre-wrap');
  await page.locator('#stepList [data-group="terms"] button').click();
  await page.locator('#terms').fill('Unterschrift erst nach vollständiger Zahlung.\nWeitere Absprachen bleiben erhalten.');
  await expect(page.locator('#contractPreview')).toContainText('Unterschrift erst nach vollständiger Zahlung.');
  await expect(page.locator('#contractPreview')).toContainText('Weitere Absprachen bleiben erhalten.');
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('beirit-contract-generator:purchase') || '{}').item)).toBe(item);

  await page.reload();
  await expect(page.locator('#item')).toHaveValue(item);
  await expect(clause.locator('p')).toHaveText(item);
  await page.locator('#stepList [data-group="object"] button').click();
  await page.getByRole('button', { name: 'Kaufgegenstand leeren', exact: true }).click();
  await expect(page.locator('#item')).toHaveValue('');
  await expect(clause).not.toContainText('Fiktives Fahrrad');
  await expect(page.locator('#seller')).not.toHaveValue('');
});

test('document uses the available preview width while keeping exact zoom and paired parties', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/vertragsgenerator/?template=purchase');
  const paper = page.locator('#contractPreview');
  await expect(paper).toHaveAttribute('aria-busy', 'false');
  await expect(paper.locator('.document-party')).toHaveCount(2);
  await expect(paper.locator('.signature-card')).toHaveCount(2);
  const parties = await paper.locator('.document-party').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, left: rect.left, right: rect.right };
  }));
  expect(parties[0].top).toBeCloseTo(parties[1].top, 0);
  expect(parties[1].left).toBeGreaterThan(parties[0].right);

  await expect.poll(() => paper.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(1000);
  const fitted = await page.evaluate(() => {
    const stage = document.querySelector('#documentStage');
    const style = getComputedStyle(stage);
    return { available: stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      paper: document.querySelector('#contractPreview').getBoundingClientRect().width };
  });
  expect(fitted.paper).toBeCloseTo(Math.min(fitted.available, 794 * 1.5), 0);

  await page.locator('#zoomSelect').selectOption('1');
  await expect.poll(() => paper.evaluate(node => node.getBoundingClientRect().width)).toBeCloseTo(794, 0);
  await page.locator('#zoomSelect').selectOption('fit');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#documentTab').click();
  await expect(paper).toBeVisible();
  await expect.poll(() => paper.evaluate(node => node.getBoundingClientRect().width)).toBeLessThan(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
