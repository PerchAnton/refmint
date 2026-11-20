import { test, expect } from '@playwright/test';
import { good, bad, wrong } from './reference.mjs';
for (const library of ['rvf', 'atoms', 'webawesome', 'rsuite']) test(`${library}: real form validation and stale success`, async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/?library=${library}`);
  const input = page.getByRole('textbox', { name: library === 'webawesome' ? 'Reference *' : 'Reference', exact: true });
  const submit = page.getByRole('button', { name: 'Check reference' });
  for (const raw of [bad, wrong, '', 'О' + good.slice(1)]) {
    await input.fill(raw); await submit.click();
    await expect(page.getByRole('alert')).not.toBeEmpty();
    await expect(page.getByRole('status')).toBeEmpty(); await expect(input).toHaveValue(raw);
  }
  await input.fill(good); await submit.click();
  await expect(page.getByRole('status')).toHaveText('Valid reference; authorization not checked.');
  await expect(page.getByRole('alert')).toBeEmpty(); await expect(input).toHaveValue(good);
  await input.fill(bad); await expect(page.getByRole('status')).toBeEmpty();
  await submit.click(); await expect(page.getByRole('alert')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
