import { test, expect } from '@playwright/test';

test('printed code, typo and valid-but-unknown have distinct outcomes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Use printed code' }).click();
  await page.getByRole('button', { name: 'Find ticket', exact: true }).click();
  await expect(page.locator('#result')).toContainText('Ticket found:');
  await page.getByRole('button', { name: 'Introduce a typo' }).click();
  await page.getByRole('button', { name: 'Find ticket', exact: true }).click();
  await expect(page.locator('#result')).toContainText('failed its typo check');
  await page.getByRole('button', { name: 'Use an unknown code' }).click();
  await page.getByRole('button', { name: 'Find ticket', exact: true }).click();
  await expect(page.locator('#result')).toContainText('no matching ticket');
  expect(errors).toEqual([]);
});

test('new ticket replaces the old record and narrow viewport has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const old = await page.locator('#reference').textContent();
  await page.getByRole('button', { name: 'Create another ticket' }).click();
  await page.getByLabel('Ticket reference', { exact: true }).fill(old);
  await page.getByRole('button', { name: 'Find ticket', exact: true }).click();
  await expect(page.locator('#result')).toContainText('no matching ticket');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Unicode lookalike cannot resolve to the real ticket', async ({ page }) => {
  await page.goto('/');
  const reference = await page.locator('#reference').textContent();
  await page.getByLabel('Ticket reference', { exact: true }).fill(reference.replace('K', '\u212a'));
  await page.getByRole('button', { name: 'Find ticket', exact: true }).click();
  await expect(page.locator('#result')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#result')).toContainText('character this format does not use');
});
