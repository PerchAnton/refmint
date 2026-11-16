import { test, expect } from '@playwright/test';

test('instructions distinguish the code from the order label; practice is not completion', async ({ page }) => {
  await page.goto('/order-pilot/'); await page.getByRole('button', { name: 'Create a session' }).click();
  await expect(page.getByText('Enter the code, not “Example order …”.')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Start this task' }).click();
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
});
test('manual paste is blocked and recorded, including on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/order-pilot/');
  await page.getByRole('button', { name: 'Create a session' }).click(); await page.getByRole('button', { name: 'Start this task' }).click();
  await page.locator('#query').dispatchEvent('paste');
  await expect(page.locator('#response')).toContainText('paste attempt is recorded'); await expect(page.locator('#query')).toHaveValue('');
  await page.getByRole('button', { name: 'Skip task' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('refmint-order-pilot-v1')));
  expect(saved.results[0].blockedPastes).toBe(1); expect(saved.results[0].deviation).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
