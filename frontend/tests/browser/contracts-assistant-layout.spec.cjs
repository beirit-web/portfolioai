const { test, expect } = require('@playwright/test');

const contractText = `Einfacher Kaufvertrag

Verkäufer:
Max Beispiel

Käufer:
Mira Muster

1. Kaufgegenstand
Fiktives Fahrrad mit Fahrradlampe

2. Kaufpreis und Zahlung
Kaufpreis: 180 EUR
Zahlungsfrist: Bei Abholung

3. Übergabe oder Lieferung
Abholung in Musterstadt

4. Bedingungen
Keine zusätzlichen Bedingungen.

Musterstadt, 01.12.2026

Unterschrift Verkäufer: ______________________________
Unterschrift Käufer: ______________________________`;

async function openAssistant(page) {
  await page.route('**/vertragsgenerator/', async route => {
    const response = await route.fetch();
    const html = (await response.text())
      .replace('"aiAvailable": false', '"aiAvailable": true')
      .replace('id="aiSubmit" disabled', 'id="aiSubmit"');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/vertragsgenerator/#assistant');
  await expect(page.locator('body')).toHaveClass(/is-enhanced/);
}

test('AI contracts use a readable document while rewritten text stays editable', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/vertragsgenerator/assistent/', async route => {
    const action = new URLSearchParams(route.request().postData()).get('action');
    await route.fulfill({ json: action === 'generate' ? {
      template: 'purchase', fields: { seller: 'Max Beispiel', buyer: 'Mira Muster', item: 'Fiktives Fahrrad', price: '180' },
      text: contractText, source: 'gemini',
    } : { text: '180 Euro bei Abholung.', source: 'gemini' } });
  });
  await openAssistant(page);
  await page.locator('#aiTemplate').selectOption('purchase');
  await page.locator('#aiExample').click();
  await page.locator('#aiConsent').check();
  await page.locator('#aiSubmit').click();
  await expect(page.locator('#aiResultDocument')).toBeVisible();
  await expect(page.locator('#aiResultDocument')).toContainText('Einfacher Kaufvertrag');
  await expect(page.locator('#aiResultDocument')).toContainText('Max Beispiel');
  await expect(page.locator('#aiResultDocument h2, #aiResultDocument h3').first()).toBeVisible();
  await expect(page.locator('#aiResultText')).toBeHidden();
  await expect(page.locator('#aiResultText')).toHaveValue(contractText);
  await page.screenshot({ path: testInfo.outputPath('assistant-document.png'), fullPage: true });

  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 280, height: 1000 });
  const narrowDocument = await page.locator('#aiResultDocument').evaluate(article => ({
    width: article.clientWidth, contentWidth: article.scrollWidth,
    values: [...article.querySelectorAll('.document-facts dd')].map(value => value.getBoundingClientRect().width),
  }));
  expect(narrowDocument.contentWidth).toBeLessThanOrEqual(narrowDocument.width);
  expect(narrowDocument.values.length).toBeGreaterThan(0);
  expect(Math.min(...narrowDocument.values)).toBeGreaterThan(120);
  await page.setViewportSize(originalViewport);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
    } });
  });
  await page.locator('#aiCopy').click();
  const manualCopy = await page.locator('#aiResultDocument').evaluate(article => {
    const clipboardData = new DataTransfer();
    const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
    article.dispatchEvent(event);
    return { handled: event.defaultPrevented, text: clipboardData.getData('text/plain') };
  });
  expect(manualCopy).toEqual({ handled: true, text: contractText });
  const partialCopyHandled = await page.locator('#aiResultDocument').evaluate(article => {
    const range = document.createRange();
    range.selectNodeContents(article.querySelector('.document-clause'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
    article.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(partialCopyHandled).toBe(false);

  await page.locator('#aiAction').selectOption('shorten');
  await expect(page.locator('#aiResultDocument')).toBeEmpty();
  await expect(page.locator('#aiResultText')).toHaveValue('');
  await expect(page.locator('#aiStatus')).not.toContainText('Vorschlag bereit');
  await page.locator('#aiSubmit').click();
  await expect(page.locator('#aiResultText')).toBeVisible();
  await expect(page.locator('#aiResultText')).toBeEditable();
  await page.locator('#aiResultText').fill('190 Euro bei Abholung.');
  await expect(page.locator('#aiResultText')).toHaveValue('190 Euro bei Abholung.');
  await expect(page.locator('#aiApply')).toBeHidden();
  await expect(page.locator('#aiResultDocument')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a tab without the shared renderer can still review and apply an AI result', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Model an older editor bundle: its own rendering works, but it does not
  // expose the new shared function to assistant.js.
  await page.route('**/contracts/app.js*', async route => {
    const response = await route.fetch();
    const script = (await response.text()).replaceAll('createDocumentContent', 'legacyCreateDocumentContent');
    await route.fulfill({ response, body: script });
  });
  await page.route('**/vertragsgenerator/assistent/', route => route.fulfill({ json: {
    template: 'purchase', fields: { seller: 'Max Beispiel', buyer: 'Mira Muster', item: 'Fiktives Fahrrad', price: '180' },
    text: contractText, source: 'gemini',
  } }));
  await openAssistant(page);
  expect(await page.evaluate(() => typeof createDocumentContent)).toBe('undefined');
  await page.locator('#aiTemplate').selectOption('purchase');
  await page.locator('#aiExample').click();
  await page.locator('#aiConsent').check();
  await page.locator('#aiSubmit').click();
  await expect(page.locator('#aiResultText')).toBeVisible();
  await expect(page.locator('#aiResultText')).toHaveValue(contractText);
  await expect(page.locator('#aiResultText')).not.toBeEditable();
  await expect(page.locator('#aiResultDocument')).toBeHidden();
  await expect(page.locator('#aiStatus')).toContainText('Vorschlag bereit');
  await expect(page.locator('.ai-result')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#aiCopy')).toBeVisible();
  await page.locator('#aiApply').click();
  await expect(page.locator('body')).toHaveAttribute('data-workspace', 'editor');
  await expect(page.locator('#seller')).toHaveValue('Max Beispiel');
  await expect(page.locator('#contractPreview')).toContainText('Max Beispiel');
  expect(errors).toEqual([]);
});

test('assistant preview uses the available width and stacks without overflow', async ({ page }) => {
  await openAssistant(page);
  for (const width of [280, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(() => {
      const form = document.querySelector('#aiForm').getBoundingClientRect();
      const preview = document.querySelector('.ai-result').getBoundingClientRect();
      return {
        pageWidth: document.documentElement.scrollWidth,
        formWidth: form.width, previewWidth: preview.width, previewRight: preview.right,
        formTop: form.top, formBottom: form.bottom, previewTop: preview.top,
      };
    });
    expect(layout.pageWidth).toBeLessThanOrEqual(width);
    if (width >= 1440) {
      expect(layout.previewWidth).toBeGreaterThan(layout.formWidth);
      expect(width - layout.previewRight).toBeLessThanOrEqual(34);
      expect(Math.abs(layout.formTop - layout.previewTop)).toBeLessThan(2);
      expect(layout.previewTop).toBeLessThan(270);
    } else if (width <= 390) {
      expect(layout.previewTop).toBeGreaterThan(layout.formBottom);
    }
  }
});
