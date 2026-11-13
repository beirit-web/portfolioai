const { test, expect } = require('@playwright/test');

test('rental document keeps its hierarchy and all free text through preview and export', async ({ page }, testInfo) => {
  await page.goto('/vertragsgenerator/?template=rent');
  const document = page.locator('#contractPreview .rental-document');
  await expect(document).toHaveCount(1);
  await expect(document.locator('.document-clause')).toHaveCount(5);
  await expect(document.locator('.rental-amount dd').first()).toHaveText('850,00 €');
  await expect(document.locator('.rental-amount dd').last()).toHaveText('1.700,00 €');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(document).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('rental-editor.png') });
  await page.emulateMedia({ media: 'print' });
  await expect(document.locator('.document-clause').first()).toHaveCSS('break-inside', 'avoid');
  await page.pdf({ path: testInfo.outputPath('mietvertrag.pdf'), format: 'A4' });
  await page.emulateMedia({ media: 'screen' });

  const party = 'Max Beispiel\n\nBeispielweg 1\n12345 Musterstadt';
  const agreement = '1. Schlüssel erhalten.\n\n2. Zählerstand bei Übergabe prüfen.\nUnterschrift erst nach Besichtigung.';
  await page.locator('#vermieter').fill(party);
  await page.locator('#stepList [data-group="terms"] button').click();
  await page.locator('#zusatz').fill(agreement);
  await expect(document.locator('.document-party p').first()).toHaveText(party);
  await expect(document.locator('[data-clause="5"] > p')).toHaveText(agreement);
  await expect(document.locator('.document-clause')).toHaveCount(5);
  await expect(document.locator('.document-party p').first()).toHaveCSS('white-space', 'pre-wrap');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#documentTab').click();
  await expect(document).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('AI rental result shares the rental design at narrow and wide widths', async ({ page }, testInfo) => {
  await page.route('**/vertragsgenerator/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace('"aiAvailable": false', '"aiAvailable": true')
      .replace('id="aiSubmit" disabled', 'id="aiSubmit"');
    await route.fulfill({ response, body: html });
  });
  await page.route('**/vertragsgenerator/assistent/', route => route.fulfill({ json: {
    template: 'rent', fields: { vermieter: 'Max Beispiel', mieter: 'Mira Muster' },
    text: 'Mietvertrag\n\nFiktiver Vertragsentwurf', documentValues: {
      vermieter: 'Max Beispiel\nBeispielweg 1\n12345 Musterstadt', mieter: 'Mira Muster',
      adresse: 'Beispielstraße 12, 2. OG links, 12345 Musterstadt', beginn: '01.12.2026',
      miete: '850,00 €', kaution: '1.700,00 €', zahlbarBis: 'jeweils zum 3. Werktag eines Monats',
      uebergabe: 'Die Wohnung wird besenrein übergeben.', zusatz: 'Keine zusätzlichen Vereinbarungen.',
      ort: 'Musterstadt', datum: '01.11.2026',
    },
  } }));
  await page.goto('/vertragsgenerator/#assistant');
  await page.locator('#aiTemplate').selectOption('rent');
  await page.locator('#aiExample').click();
  await page.locator('#aiConsent').check();
  await page.locator('#aiSubmit').click();
  const paper = page.locator('#aiResultDocument');
  await expect(paper.locator('.rental-document')).toBeVisible();
  await expect(paper.locator('.document-clause')).toHaveCount(5);
  for (const width of [1440, 390, 280]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await paper.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(paper).toContainText('850,00 €');
  }
  await page.screenshot({ path: testInfo.outputPath('rental-assistant-mobile.png'), fullPage: true });
});
