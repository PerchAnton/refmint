import { test, expect } from '@playwright/test';
import { printed, canonical, mistyped } from '../../shared/reference.mjs';
for (const name of ['rjsf', 'formik', 'final-form', 'mantine', 'formily', 'primevue', 'uniforms']) {
  const url = name === 'uniforms' ? 'http://127.0.0.1:5189/' : `http://127.0.0.1:5187/${name}/`;
  test(`${name}: a late success cannot replace an edited field's result`, async ({ page }) => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    let arrived;
    const requestStarted = new Promise(resolve => { arrived = resolve; });
    await page.route('**/api/lookup', async route => {
      arrived();
      await pending;
      await route.fulfill({ json: { ok: true, canonical } });
    });
    await page.goto(url);
    const field = page.getByRole('textbox', { name: 'Order reference' });
    await field.fill(printed);
    await page.getByRole('button', { name: 'Submit reference' }).click();
    await requestStarted;
    await field.fill(mistyped);
    const response = page.waitForResponse('**/api/lookup');
    release();
    await response;
    await expect(field).toHaveValue(mistyped);
    await expect(page.getByTestId('result')).toBeEmpty();
  });
}
for (const name of ['formik', 'final-form', 'mantine', 'formily'])
  test(`${name}: Reset clears field, errors, and lookup result`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:5187/${name}/`);
    const field = page.getByRole('textbox', { name: 'Order reference' });
    await field.fill(printed);
    await page.getByRole('button', { name: 'Submit reference' }).click();
    await expect(page.getByTestId('result')).toHaveText(canonical);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(field).toHaveValue('');
    await expect(page.getByTestId('result')).toBeEmpty();
  });
