import assert from 'node:assert/strict';
import test from 'node:test';
import { bech32m } from 'bech32';
import { createReferences, createReferenceCodec } from '../dist/index.js';

test('diagnostics preserve raw offsets through whitespace, case and grouping', () => {
  for (const refs of [createReferences({ prefix: 'rma', randomLength: 8 }), createReferenceCodec({ prefix: 'rma', kind: 'uint64' })]) {
    const id = refs.generate ? bech32m.encode('rma', Array(8).fill(0)) : refs.encode(123456n);
    const display = ' \t' + refs.format(id).toUpperCase() + '\r\n';
    const i = display.indexOf('-') + 1;
    const invalid = display.slice(0, i) + 'B' + display.slice(i + 1);
    assert.deepEqual(refs.diagnose(invalid), { ok: false, error: 'character', details: { positions: [i] } });
    assert.deepEqual(refs.diagnose('😀' + id + 'K').details.positions, [0, id.length + 2]);
    assert.equal(refs.diagnose(display).id, id);
    assert.deepEqual(refs.diagnose('a'.repeat(129)), { ok: false, error: 'too_long', details: { expected: 128, actual: 129, unit: 'input_code_units' } });
  }
});

test('length and namespace diagnostics only follow a valid checksum; no guessed correction', () => {
  const refs = createReferences({ prefix: 'rma', randomLength: 8 });
  assert.deepEqual(refs.diagnose(bech32m.encode('rma', Array(9).fill(0))), {
    ok: false, error: 'length', details: { expected: 8, actual: 9, unit: 'payload_symbols' }
  });
  assert.deepEqual(refs.diagnose(bech32m.encode('doc', Array(8).fill(0))), {
    ok: false, error: 'prefix', details: { expected: 'rma', actual: 'doc' }
  });
  const id = bech32m.encode('rma', Array(8).fill(0));
  const wrong = id.slice(0, -1) + (id.endsWith('q') ? 'p' : 'q');
  assert.deepEqual(refs.diagnose(wrong), { ok: false, error: 'checksum', details: {} });
  assert.deepEqual(refs.parse(wrong), { ok: false, error: 'checksum' });
});
