import test from 'node:test';
import assert from 'node:assert/strict';
import { latestLookup } from '../shared/latest-lookup.mjs';
test('disposing a view invalidates pending work without publishing to the unmounted view', async () => {
  let resolve;
  const seen = [];
  const lookup = latestLookup(v => seen.push(v), () => new Promise(r => { resolve = r; }));
  const pending = lookup.submit('old');
  lookup.dispose();
  resolve({ ok: true, canonical: 'old' });
  await pending;
  assert.deepEqual(seen, [null]);
});
test('an edit invalidates a pending successful response', async () => {
  let resolve;
  const seen = [];
  const lookup = latestLookup(v => seen.push(v), () => new Promise(r => { resolve = r; }));
  const pending = lookup.submit('old');
  lookup.invalidate();
  resolve({ ok: true, canonical: 'old' });
  await pending;
  assert.deepEqual(seen, [null, null]);
});
test('only the newest request may publish, including network failures', async () => {
  const finish = [];
  const seen = [];
  const lookup = latestLookup(v => seen.push(v), () => new Promise((resolve, reject) => finish.push({ resolve, reject })));
  const first = lookup.submit('first');
  const second = lookup.submit('second');
  finish[1].resolve({ ok: true, canonical: 'second' });
  await second;
  finish[0].reject(new Error('offline'));
  await first;
  assert.deepEqual(seen, [null, null, { ok: true, canonical: 'second' }]);
});
