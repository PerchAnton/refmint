import { test, expect } from '@playwright/test';

test('instructions distinguish the code from the order label; practice is not completion', async ({ page }) => {
  await page.goto('/order-pilot/'); await page.getByRole('button', { name: 'Create a session' }).click();
  await expect(page.getByText('Enter the code, not “Example order …”.')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Start this task' }).click();
    await expect(page.locator('#active-mode')).toContainText('manual');
    await expect(page.locator('#active-instruction')).toContainText('Type the complete code');
    const code = await page.locator('#code').textContent(); const label = await page.locator('#record-label').textContent();
    await page.getByLabel('Code to look up').fill(label); await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('#response')).toContainText('Enter the whole code');
    await page.getByLabel('Code to look up').fill(''); await page.getByLabel('Code to look up').pressSequentially(code);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('#response')).toContainText(`Found ${label}`);
    await page.getByRole('button', { name: 'Confirm this is the requested order' }).click();
  }
  await expect(page.locator('#progress')).toContainText('3 / 15'); await expect(page.locator('#scope')).toContainText('Partial results');
  await expect(page.locator('#summary tr')).toHaveCount(0);
});
test('reload interrupts an active task and exports explicit partial state', async ({ page }) => {
  await page.goto('/order-pilot/'); await page.getByRole('button', { name: 'Create a session' }).click();
  await page.getByRole('button', { name: 'Start this task' }).click(); await page.reload();
  await expect(page.locator('#progress')).toContainText('1 / 15');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('refmint-order-pilot-v1')));
  expect(saved.results[0].outcome).toBe('interrupted'); expect(saved.results[0].eligible).toBe(false); expect(saved.state).toBe('ready');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON results' }).click();
  expect((await download).suggestedFilename()).toBe('order-pilot-P02.json');
  await page.getByRole('button', { name: 'Show JSON on this page' }).click();
  const shown = JSON.parse(await page.locator('#results-json').inputValue());
  expect(shown.results[0].outcome).toBe('interrupted'); expect(shown.results).toEqual(saved.results);
});
test('manual paste is blocked and recorded, including on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/order-pilot/');
  await page.getByRole('button', { name: 'Create a session' }).click(); await page.getByRole('button', { name: 'Start this task' }).click();
  await page.locator('#query').dispatchEvent('paste');
  await expect(page.locator('#response')).toContainText('paste attempt is recorded'); await expect(page.locator('#query')).toHaveValue('');
  await page.getByRole('button', { name: 'Skip task' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('refmint-order-pilot-v1')));
  expect(saved.results[0].blockedPastes).toBe(1); expect(saved.results[0].deviation).toBe(true);
  await expect(page.locator('#last-task-notice')).toContainText('recorded but excluded');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('paste instructions remain visible; a real clipboard paste is eligible', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permission automation is supported here only in Chromium.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/order-pilot/'); await page.getByRole('button', { name: 'Create a session' }).click();
  for (let task = 0; task < 15; task++) {
    await page.getByRole('button', { name: 'Start this task' }).click();
    if ((await page.locator('#active-mode').textContent()).endsWith('/ paste')) break;
    await page.getByRole('button', { name: 'Skip task' }).click();
  }
  await expect(page.locator('#active-instruction')).toContainText('Use Copy code');
  const code = await page.locator('#code').textContent();
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.locator('#response')).toContainText('Copied. Paste the code');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
  await page.getByLabel('Code to look up').press('ControlOrMeta+v');
  await expect(page.getByLabel('Code to look up')).toHaveValue(code);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm this is the requested order' }).click();
  const last = await page.evaluate(() => JSON.parse(localStorage.getItem('refmint-order-pilot-v1')).results.at(-1));
  expect(last.pastes).toBe(1); expect(last.copyActions).toBe(1); expect(last.eligible).toBe(true);
});

test('typing a paste task warns before confirmation and explains the exclusion', async ({ page }) => {
  await page.goto('/order-pilot/'); await page.getByRole('button', { name: 'Create a session' }).click();
  for (let task = 0; task < 15; task++) {
    await page.getByRole('button', { name: 'Start this task' }).click();
    if ((await page.locator('#active-mode').textContent()).endsWith('/ paste')) break;
    await page.getByRole('button', { name: 'Skip task' }).click();
  }
  await page.getByLabel('Code to look up').fill(await page.locator('#code').textContent());
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('#response')).toContainText('no paste event was detected');
  await page.getByRole('button', { name: 'Confirm this is the requested order' }).click();
  await expect(page.locator('#last-task-notice')).toContainText('no paste event was detected');
});
