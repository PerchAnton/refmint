import { test, expect } from '@playwright/test';

test('both existing-ID forms find the same record and stop invalid input before lookup', async ({ page }) => {
  const errors = [];
  const scripts = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname); });
  await page.goto('/comparison/');
  for (const kind of ['uint64', 'uuid']) {
    await page.getByLabel('Existing ID type').selectOption(kind);
    await page.getByRole('button', { name: 'Use printed reference' }).click();
    for (const name of ['refmint', 'bech32']) {
      await expect(page.locator(`#${name}-result`)).toHaveAttribute('data-state', 'found');
      await expect(page.locator(`#${name}-queries`)).toContainText('submission: 1');
    }
    await page.getByRole('button', { name: 'Introduce a typo' }).click();
    for (const name of ['refmint', 'bech32']) {
      await expect(page.locator(`#${name}-result`)).toContainText('typo check failed');
      await expect(page.locator(`#${name}-queries`)).toContainText('submission: 0');
    }
    await page.getByRole('button', { name: 'Try invalid character' }).click();
    await expect(page.locator('#refmint-result')).toContainText('position 6');
    await expect(page.locator('#bech32-result')).toHaveText(await page.locator('#refmint-result').textContent());
    await page.getByRole('button', { name: 'Valid but unknown' }).click();
    await expect(page.locator('#refmint-result')).toHaveAttribute('data-state', 'unknown');
    await expect(page.locator('#bech32-result')).toHaveAttribute('data-state', 'unknown');
    await page.getByRole('button', { name: 'Run all scenarios' }).click();
    await expect(page.locator('#matrix-status')).toContainText('14/14');
    await expect(page.locator('#matrix tr')).toHaveCount(14);
  }
  expect(errors).toEqual([]);
  expect(scripts).toContain('/dist/codec.js');
  expect(scripts).not.toContain('/dist/index.js');
});

test('comparison accepts manual input, reports raw positions and fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/comparison/');
  const printed = await page.locator('#reference').textContent();
  const input = page.getByLabel('Return reference', { exact: true });
  await input.fill('  ' + printed.replace('R', 'K'));
  await page.getByRole('button', { name: 'Check both forms' }).click();
  for (const name of ['refmint', 'bech32']) await expect(page.locator(`#${name}-result`)).toContainText('position 3');
  await input.fill(printed);
  await page.getByRole('button', { name: 'Check both forms' }).click();
  await expect(page.locator('#refmint-result')).toHaveAttribute('data-state', 'found');
  await page.getByLabel('Existing ID type').selectOption('uuid');
  await page.getByRole('button', { name: 'Run all scenarios' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
