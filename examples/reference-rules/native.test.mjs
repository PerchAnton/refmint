import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWith } from './schemas.mjs';
import { validateRequest } from './compiled/typia-rule.js';
import { good, bad, wrong } from './reference.mjs';
const cases = [['printed', good, true], ['checksum', bad, false], ['namespace', wrong, false],
  ['empty', '', false], ['non-ascii', 'О' + good.slice(1), false], ['wrong-type', 42, false]];
for (const library of ['runtypes', 'valibot']) {
  for (const [name, raw, ok] of cases) test(`${library}: ${name}`, () => {
    const result = validateWith(library, raw);
    assert.equal(result.ok, ok); assert.equal(result.raw, raw);
  });
}
for (const [name, raw, ok] of cases) test(`typia pipeline: ${name}`, () => {
  const request = { reference: raw }; const result = validateRequest(request);
  assert.equal(result.ok, ok); assert.equal(request.reference, raw);
  assert.equal(result.stage, ok ? 'complete' : typeof raw === 'string' ? 'reference' : 'shape');
  if (ok) assert.equal(result.data.reference, raw);
});
for (const input of [null, {}, [], '']) test(`typia rejects malformed request ${JSON.stringify(input)}`, () => {
  assert.equal(validateRequest(input).stage, 'shape');
});
