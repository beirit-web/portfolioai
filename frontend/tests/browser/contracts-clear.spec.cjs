const { test, expect } = require('@playwright/test');

test('clearing one field updates the working copy and preserves saved drafts', async ({ page }) => {
  await page.goto('/vertragsgenerator/?template=purchase');
  await page.locator('#seller').fill('Fiktive Beispielperson');
  const buyer = await page.locator('#buyer').inputValue();
  await page.locator('#saveSnapshotButton').click();
  await page.locator('#snapshotName').fill('Fiktiver Kaufvertrag');
  await page.locator('#snapshotForm button[type="submit"]').click();
  await expect(page.locator('#snapshotDialog')).not.toBeVisible();
  const snapshot = await page.evaluate(() => localStorage.getItem('beirit-contract-generator:library-v1'));

  const clear = page.getByRole('button', { name: 'Verkäufer leeren', exact: true });
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#seller')).toHaveValue('');
  await expect(page.locator('#seller')).toBeFocused();
  await expect(clear).toBeDisabled();
  await expect(page.locator('#buyer')).toHaveValue(buyer);
  await expect(page.locator('#contractPreview')).not.toContainText('Fiktive Beispielperson');
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('beirit-contract-generator:purchase') || '{}').seller)).toBe('');
  expect(await page.evaluate(() => localStorage.getItem('beirit-contract-generator:library-v1'))).toBe(snapshot);

  await page.reload();
  await expect(page.locator('#seller')).toHaveValue('');
  await expect(clear).toBeDisabled();
  await page.locator('#draftMenu summary').click();
  await page.locator('#fillSample').click();
  await expect(clear).toBeEnabled();
});

test('new template fields can clear text, amounts and dates without losing their controls', async ({ page }) => {
  await page.goto('/vertragsgenerator/?template=rent');
  await page.locator('#templateTrigger').click();
  await page.getByRole('option', { name: /Einfacher Kaufvertrag/ }).click();
  await expect(page.getByRole('button', { name: 'Verkäufer leeren', exact: true })).toBeEnabled();
  await page.locator('#stepList [data-group="payment"] button').click();
  await page.locator('#price').fill('123.45');
  await expect.poll(() => page.locator('#price').evaluate(field => parseFloat(getComputedStyle(field).paddingRight))).toBeGreaterThanOrEqual(72);
  await expect.poll(() => page.locator('#paymentDue').evaluate(field => parseFloat(getComputedStyle(field).paddingRight))).toBeGreaterThanOrEqual(49);
  await expect(page.locator('#price + .field-unit')).toHaveText('€');
  await page.getByRole('button', { name: 'Kaufpreis leeren', exact: true }).click();
  await expect(page.locator('#price')).toHaveValue('');
  await expect(page.locator('#price')).toBeFocused();
  await expect(page.locator('#price + .field-unit')).toHaveText('€');
  await expect(page.locator('#paymentDue')).not.toHaveValue('');

  await page.locator('#stepList [data-group="closing"] button').click();
  await page.locator('#date').fill('2026-12-01');
  await expect.poll(() => page.locator('#date').evaluate(field => parseFloat(getComputedStyle(field).paddingRight))).toBeGreaterThanOrEqual(49);
  await page.getByRole('button', { name: 'Datum leeren', exact: true }).click();
  await expect(page.locator('#date')).toHaveValue('');
  await expect(page.locator('#date')).toBeFocused();
  await expect(page.locator('#date')).toHaveAttribute('type', 'date');
  await page.locator('#place').fill('Musterstadt');
  await page.getByRole('button', { name: 'Ort leeren', exact: true }).click();
  await expect(page.locator('#place')).toHaveValue('');
  expect(await page.evaluate(() => window.ContractInputs.clear(document.querySelector('input[name="csrfmiddlewaretoken"]')))).toBe(false);
});

test('clearing the AI description also clears the suggestion and character count', async ({ page }) => {
  let releaseRequest;
  const pendingRequest = new Promise(resolve => { releaseRequest = resolve; });
  await page.route('**/vertragsgenerator/assistent/', async route => {
    await pendingRequest;
    await route.fulfill({ json: {
      template: 'purchase', fields: { seller: 'Max Beispiel', buyer: 'Mira Muster', item: 'Fiktives Fahrrad', price: '180' },
      text: 'Fiktiver Kaufvertrag über ein Fahrrad.', source: 'gemini',
    } });
  });
  await page.route('**/vertragsgenerator/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace('"aiAvailable": false', '"aiAvailable": true')
      .replace('id="aiSubmit" disabled', 'id="aiSubmit"');
    await route.fulfill({ response, body: html });
  });
  try {
    await page.goto('/vertragsgenerator/#assistant');
    const clear = page.getByRole('button', { name: 'Deine Beschreibung leeren', exact: true });
    await expect(clear).toBeDisabled();
    await page.locator('#aiTemplate').selectOption('purchase');
    await page.locator('#aiExample').click();
    await expect(clear).toBeEnabled();
    await page.locator('#aiConsent').check();
    await page.locator('#aiSubmit').click();
    await expect(clear).toBeDisabled();
    releaseRequest();
    await expect(page.locator('#aiResultDocument')).toBeVisible();
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(page.locator('#aiPrompt')).toHaveValue('');
    await expect(page.locator('#aiPrompt')).toBeFocused();
    await expect(page.locator('#aiCharacterCount')).toHaveText('0 / 5.000');
    await expect(page.locator('#aiResultText')).toBeHidden();
    await expect(page.locator('#aiResultDocument')).toBeHidden();
    await expect(page.locator('#aiResultActions')).toBeHidden();
    await expect(page.locator('#aiResultEmpty')).toBeVisible();
    await expect(page.locator('#aiConsent')).toBeChecked();
    await expect(clear).toBeDisabled();
    await page.locator('#aiAction').selectOption('shorten');
    await expect(page.getByRole('button', { name: 'Text zum Überarbeiten leeren', exact: true })).toBeDisabled();
  } finally {
    releaseRequest();
  }
});
