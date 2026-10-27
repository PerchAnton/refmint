import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bech32m } from 'bech32';
import { createReferenceCodec, createReferences } from '../dist/index.js';
import { createBech32Adapter } from '../examples/comparison/bech32-adapter.mjs';
import { scenarios, lookup } from '../examples/comparison/scenarios.mjs';

const uint = createReferenceCodec({ prefix: 'rma', kind: 'uint64' });
const uuid = createReferenceCodec({ prefix: 'rma', kind: 'uuid' });

test('frozen format vectors survive upgrades and legacy references remain disjoint', async () => {
  const vectors = JSON.parse(await readFile(new URL('./fixtures/formats-v1.json', import.meta.url)));
  for (const v of vectors.codec) {
    const codec = createReferenceCodec({ prefix: v.prefix, kind: v.kind, version: 1 });
    const value = v.kind === 'uint64' ? BigInt(v.value) : v.value;
    assert.equal(codec.encode(value), v.reference);
    assert.deepEqual(codec.decodeCanonical(v.reference), { ok: true, id: v.reference, value, normalized: false });
    assert.equal(createReferences({ prefix: v.prefix }).parse(v.reference).ok, false);
  }
  for (const v of vectors.legacy) {
    const old = createReferences({ prefix: v.prefix, randomLength: v.randomLength });
    assert.equal(old.parseCanonical(v.reference).id, v.reference);
    for (const kind of ['uuid', 'uint64']) assert.equal(createReferenceCodec({ prefix: v.prefix, kind }).decode(v.reference).ok, false);
  }
});

test('uint64 exact boundaries and UUID bits round trip through an independent oracle', () => {
  const integers = [0n, 1n, (1n << 64n) - 1n];
  for (let bit = 1n; bit < 64n; bit++) integers.push((1n << bit) - 1n, 1n << bit, (1n << bit) + 1n);
  const uuids = ['00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff'];
  for (let i = 0; i < 1000; i++) {
    const bytes = createHash('sha256').update('refmint-v1:' + i).digest();
    integers.push(bytes.readBigUInt64BE());
    uuids.push(bytes.toString('hex').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'));
  }
  for (const [c, values] of [[uint, integers], [uuid, uuids]]) for (const value of values) {
    const id = c.encode(value);
    assert.equal(c.decode(id).value, value);
    assert.equal(c.decode(c.format(id).toUpperCase()).value, value);
    const d = bech32m.decode(id);
    assert.equal(d.prefix, 'rma_');
    assert.equal(d.words[0], 1);
    const numeric = d.words.slice(2).reduce((n, word) => n * 32n + BigInt(word), 0n);
    assert.equal(numeric, typeof value === 'bigint' ? value : BigInt('0x' + value.replaceAll('-', '')));
    assert.equal(bech32m.encode(d.prefix, d.words), id);
  }
});

test('encoding never truncates, rounds a number, changes UUID case or needs randomness', t => {
  t.mock.getter(globalThis, 'crypto', () => undefined);
  for (const value of [1, Number.MAX_SAFE_INTEGER + 1, '1', -1n, 1n << 64n, null]) assert.throws(() => uint.encode(value));
  for (const value of [1n, null, 'abc', '550E8400-e29b-41d4-a716-446655440000']) assert.throws(() => uuid.encode(value));
  assert.equal(uint.decode(uint.encode(9007199254740993n)).value, 9007199254740993n);
});

test('UUID conversion is exact across every bit boundary, including 50-bit chunks', () => {
  for (let bit = 1n; bit < 128n; bit++) for (const n of [(1n << bit) - 1n, 1n << bit, (1n << bit) + 1n]) {
    const value = n.toString(16).padStart(32, '0').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
    const id = uuid.encode(value);
    assert.equal(uuid.decode(id).value, value);
    assert.equal(bech32m.decode(id).words.slice(2).reduce((v, word) => v * 32n + BigInt(word), 0n), n);
  }
});

test('all ASCII substitutions retain diagnostics and input-error precedence', () => {
  for (const kind of ['uint64', 'uuid']) {
    const a = createReferenceCodec({ prefix: 'rma', kind });
    const b = createBech32Adapter(bech32m, { prefix: 'rma', kind });
    const id = a.encode(kind === 'uint64' ? 123456n : 'ffffffff-ffff-ffff-ffff-ffffffffffff');
    for (const text of [id, a.format(id), ' \t' + a.format(id).toUpperCase() + '\r\n']) {
      for (let at = 0; at < text.length; at++) for (let code = 0; code < 128; code++) {
        const input = text.slice(0, at) + String.fromCharCode(code) + text.slice(at + 1);
        assert.deepEqual(a.diagnose(input), b.diagnose(input), JSON.stringify(input));
      }
    }
  }
});

test('valid checksums cannot bypass version, kind, length, range or canonicality', () => {
  const wrap = data => bech32m.encode('rma_', data);
  const cases = [
    [[], 'length'], [[1], 'length'], [[2, 0, 1], 'version'], [[1, 9, 1], 'kind'],
    [[1, 0], 'length'], [[1, 0, ...Array(14).fill(1)], 'length'],
    [[1, 0, 16, ...Array(12).fill(0)], 'overflow'], [[1, 0, 0, 1], 'non_canonical']
  ];
  for (const [data, error] of cases) assert.deepEqual(uint.decode(wrap(data)), { ok: false, error });
  assert.equal(uuid.decode(wrap([1, 1, 8, ...Array(25).fill(0)])).error, 'overflow');
  assert.equal(uuid.decode(wrap([1, 1, ...Array(25).fill(0)])).error, 'length');
  const id = uint.encode(42n);
  assert.equal(uint.decodeCanonical(uint.format(id)).error, 'non_canonical');
  assert.throws(() => uint.format(uuid.encode('00000000-0000-0000-0000-000000000000')));
  assert.equal(uint.decode(id.replace('rma', 'doc')).error, 'checksum');
});

test('new configuration is immutable and reads dynamic options once', () => {
  const reads = { prefix: 0, kind: 0, version: 0 };
  const c = createReferenceCodec({
    get prefix() { reads.prefix++; return reads.prefix === 1 ? 'rma' : 'doc'; },
    get kind() { reads.kind++; return 'uint64'; },
    get version() { reads.version++; return 1; }
  });
  assert.deepEqual(reads, { prefix: 1, kind: 1, version: 1 });
  assert.ok(Object.isFrozen(c));
  assert.equal(c.decode(c.encode(1n)).value, 1n);
  for (const opts of [null, {}, { prefix: 'rma', kind: 'number' }, { prefix: 'rma_', kind: 'uuid' },
    { prefix: 'rma', kind: 'uuid', version: 2 }, { prefix: 'rma', kind: 'uuid', version: null },
    { prefix: 'rma', kind: 'uuid', randomLength: 26 }]) assert.throws(() => createReferenceCodec(opts));
  const long = createReferenceCodec({ prefix: 'v111111111111111', kind: 'uuid' });
  const id = long.encode('ffffffff-ffff-ffff-ffff-ffffffffffff');
  assert.equal(long.decode(long.format(id)).id, id);
});

test('both form adapters agree on all scenarios, including lookup counts and diagnostics', () => {
  for (const kind of ['uint64', 'uuid']) {
    const c = createReferenceCodec({ prefix: 'rma', kind });
    const native = createBech32Adapter(bech32m, { prefix: 'rma', kind });
    for (const s of scenarios(c, kind, bech32m)) {
      const result = lookup(c, s.input, kind);
      assert.equal(result.status, s.status, s.name);
      if (s.error) assert.equal(result.parsed.error, s.error, s.name);
      assert.deepEqual(lookup(native, s.input, kind), result, s.name);
      if (result.parsed.ok) assert.equal(native.encode(result.parsed.value), result.parsed.id);
    }
  }
});

test('all selected single-symbol changes and distinct adjacent swaps are rejected by both adapters', () => {
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  for (const kind of ['uint64', 'uuid']) {
    const c = createReferenceCodec({ prefix: 'rma', kind });
    const native = createBech32Adapter(bech32m, { prefix: 'rma', kind });
    const id = scenarios(c, kind, bech32m)[0].input;
    for (let i = 0; i < id.length; i++) for (const ch of i < 3 ? 'abcdefghijklmnopqrstuvwxyz' : i < 5 ? '' : alphabet) {
      if (id[i] === ch) continue;
      const changed = id.slice(0, i) + ch + id.slice(i + 1);
      assert.equal(c.decode(changed).ok, false);
      assert.equal(native.diagnose(changed).ok, false);
    }
    for (let i = 0; i < id.length - 1; i++) {
      if (id[i] === id[i + 1]) continue;
      const changed = id.slice(0, i) + id[i + 1] + id[i] + id.slice(i + 2);
      assert.equal(c.decode(changed).ok, false);
      assert.equal(native.diagnose(changed).ok, false);
    }
  }
});
