import { test, expect } from '@playwright/test';

test('three routes show successes, typo trade-offs and equal authorization outcomes', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/workflows/');
  for (const domain of ['invoice', 'fleet']) {
    await page.getByLabel('Workflow', { exact: true }).selectOption(domain);
    for (const route of ['existing', 'alias', 'refmint']) await expect(page.locator(`#${route}-result`)).toHaveAttribute('data-state', 'found');
    await page.getByRole('button', { name: 'One-symbol change', exact: true }).click();
    await expect(page.locator('#refmint-result')).toContainText('Logical lookups: 0');
    await expect(page.locator('#alias-result')).toHaveAttribute('data-state', 'found');
    await page.getByRole('button', { name: 'Outside allowed scope', exact: true }).click();
    for (const route of ['existing', 'alias', 'refmint']) await expect(page.locator(`#${route}-result`)).toContainText('No accessible record found');
    await page.getByRole('button', { name: 'Another valid code', exact: true }).click();
    await expect(page.locator('#refmint-result')).toHaveAttribute('data-state', 'found');
  }
  const pdf = await request.get('/workflows/sample-invoice.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(errors).toEqual([]);
});

test('manual pasted identifiers work on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workflows/');
  const reference = await page.locator('#refmint').inputValue();
  await page.getByLabel('RefMint reference', { exact: true }).fill(`  ${reference.toUpperCase()}  `);
  await page.getByRole('button', { name: 'Look up all three', exact: true }).click();
  await expect(page.locator('#refmint-result')).toContainText('INV-2026-000042');
  await page.getByLabel('Local alias', { exact: true }).fill('<script>bad()</script>');
  await page.getByRole('button', { name: 'Look up all three', exact: true }).click();
  await expect(page.locator('#alias-result')).toHaveAttribute('data-state', 'not_found');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
