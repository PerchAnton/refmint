import {test,expect} from '@playwright/test';
import {good,bad,wrong} from './reference.mjs';
for(const library of ['modular-forms','vuelidate','regle','felte','json-editor']) {
 test(`${library}: checksum and namespace errors preserve input, valid code can submit`,async({page})=>{
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});await page.goto(`/?library=${library}`);
  const field=page.getByLabel('Reference',{exact:true});await expect(field).toBeVisible();
  for(const value of [bad,wrong,'','О'+good.slice(1)]){await field.fill(value);await page.getByRole('button',{name:'Validate',exact:true}).click();await expect(page.getByRole('alert')).toContainText('valid ORDER reference');await expect(field).toHaveValue(value);await expect(page.getByRole('status')).not.toContainText('Valid code')}
  await field.fill(good);await page.getByRole('button',{name:'Validate',exact:true}).click();await expect(page.getByRole('status')).toContainText('Valid code');await expect(field).toHaveValue(good);await field.fill(bad);await expect(page.getByRole('status')).not.toContainText('Valid code');expect(errors).toEqual([]);
 });
}
