import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lookup, changedSymbol } from './model.mjs';

const inputs = JSON.parse(await readFile(process.argv[2], 'utf8'));
for (const route of ['existing', 'alias', 'refmint']) {
  const result = lookup('invoice', route, inputs[route]);
  assert.equal(result.status, 'found');
  assert.equal(result.record.id, '42');
  assert.equal(result.record.label, 'INV-2026-000042');
}
assert.deepEqual(lookup('invoice', 'refmint', changedSymbol(inputs.refmint.toLowerCase())), { status: 'invalid', reason: 'checksum', queries: 0 });
