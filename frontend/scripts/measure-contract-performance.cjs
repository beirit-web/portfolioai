/* Local, repeatable measurements; never submits a real AI request. */
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { localBaseUrl } = require('./lib/browser-checks.cjs');

const phase = process.argv[2] || 'measurement';
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error('Use a simple phase name.');
const base = localBaseUrl(process.env.CONTRACTS_BASE_URL || 'http://localhost:8000');
const output = path.resolve(__dirname, '../../runtime/contracts-performance');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const profile of ['desktop', 'mobile']) {
      for (const workspace of ['overview', 'editor']) {
        for (let run = 1; run <= 3; run++) {
          const context = await browser.newContext({ viewport: profile === 'mobile'
            ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
          const page = await context.newPage();
          const session = await context.newCDPSession(page);
          await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await session.send('Network.enable');
          await session.send('Network.setCacheDisabled', { cacheDisabled: true });
          await context.route('**/*', route => new URL(route.request().url()).origin === base
            ? route.continue() : route.abort());
          await page.addInitScript(() => {
            window.contractLCP = 0;
            new PerformanceObserver(list => {
              window.contractLCP = list.getEntries().at(-1)?.startTime || 0;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          });
          let previewRequests = 0;
          page.on('request', request => {
            if (request.url().includes('/vertragsgenerator/vorschau/')) previewRequests++;
          });
          await page.goto(`${base}/vertragsgenerator/${workspace === 'editor' ? '?template=rent' : ''}`);
          await expect(page.locator('body')).toHaveClass(/is-enhanced/);
          if (workspace === 'editor') await expect(page.locator('#contractPreview .rental-document')).toHaveCount(1);
          await page.waitForTimeout(500);
          const load = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            return { ttfbMs: nav.responseStart - nav.requestStart,
              fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
              lcpMs: window.contractLCP, resources: resources.length,
              transferBytes: nav.transferSize + resources.reduce((sum, item) => sum + item.transferSize, 0) };
          });
          const initialPreviewRequests = previewRequests;
          let typing = null;
          if (workspace === 'editor') {
            typing = await page.evaluate(async () => {
              const field = document.querySelector('#vermieter');
              let mutations = 0;
              let labelClones = 0;
              const clone = Node.prototype.cloneNode;
              Node.prototype.cloneNode = function(...args) {
                if (this.nodeName === 'LABEL') labelClones++;
                return clone.apply(this, args);
              };
              const observer = new MutationObserver(records => { mutations += records.length; });
              observer.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true });
              const start = performance.now();
              for (let index = 0; index < 200; index++) {
                field.value = `Max Beispiel, Beispielweg ${index}, 12345 Musterstadt`;
                field.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const handlerMs = performance.now() - start;
              await Promise.resolve();
              mutations += observer.takeRecords().length;
              observer.disconnect();
              Node.prototype.cloneNode = clone;
              return { events: 200, handlerMs, mutations, labelClones };
            });
            await expect(page.locator('#contractPreview')).toContainText('Beispielweg 199');
          }
          results.push({ profile, workspace, run, load, initialPreviewRequests, typing });
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
  const summary = [];
  for (const profile of ['desktop', 'mobile']) for (const workspace of ['overview', 'editor']) {
    const rows = results.filter(row => row.profile === profile && row.workspace === workspace);
    summary.push({ profile, workspace, runs: rows.length,
      ttfbMs: median(rows.map(row => row.load.ttfbMs)),
      fcpMs: median(rows.map(row => row.load.fcpMs)), lcpMs: median(rows.map(row => row.load.lcpMs)),
      initialPreviewRequests: median(rows.map(row => row.initialPreviewRequests)),
      ...(workspace === 'editor' ? {
        typingHandlerMs: median(rows.map(row => row.typing.handlerMs)),
        typingMutations: median(rows.map(row => row.typing.mutations)),
        typingLabelClones: median(rows.map(row => row.typing.labelClones)),
      } : {}) });
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, `${phase}.json`), JSON.stringify({ phase, base,
    methodology: 'Cold Chromium, CPU slowed 4x, local network; median of 3 runs per viewport/route. Typing measures 200 synchronous input events, not INP.',
    summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
