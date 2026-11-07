// This file is copied outside the checkout and imports only installed archives.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as alpha from 'refmint-alpha3';
import * as beta from 'refmint-beta2';
import * as candidate from 'refmint';
import { createReferenceCodec as alphaCodec } from 'refmint-alpha3/codec';
import { createReferenceCodec as betaCodec } from 'refmint-beta2/codec';
import { createReferenceCodec as candidateCodec } from 'refmint/codec';

const releases = [
  { name: 'alpha.3', path: 'refmint-alpha3', api: alpha, codec: alphaCodec },
  { name: 'beta.2', path: 'refmint-beta2', api: beta, codec: betaCodec },
  { name: 'candidate', path: 'refmint', api: candidate, codec: candidateCodec }
];
const frozen = JSON.parse(await readFile(new URL('./formats-v1.json', import.meta.url)));
const tickets = JSON.parse(await readFile(new URL('./billetsys-v1.json', import.meta.url)));
const invalid = JSON.parse(await readFile(new URL('./compatibility-invalid-v1.json', import.meta.url)));
assert.equal(frozen.codec.length, 20);
assert.equal(frozen.legacy.length, 3);
assert.equal(tickets.codec.length, 5);
const vectors = [...frozen.codec, ...tickets.codec];
const valueOf = v => v.kind === 'uint64' ? BigInt(v.value) : v.value;
const grouped = id => {
  const start = id.lastIndexOf('1') + 1;
  return id.slice(0, start) + id.slice(start).match(/.{1,4}/g).join('-');
};
const presentations = id => [
  id, id.toUpperCase(), grouped(id), grouped(id).toUpperCase(),
  ' ' + id, id + ' ', '\t' + id + '\r\n', ' \t' + grouped(id).toUpperCase() + '\r\n'
];

for (const { name, path, api, codec } of releases) {
  test(`${name}: public entry points and factory contracts`, async () => {
    assert.deepEqual(Object.keys(api).sort(), ['collisionProbability', 'createReferenceCodec', 'createReferences', 'planReferences']);
    assert.equal(codec, api.createReferenceCodec);
    for (const internal of ['dist/index.js', 'dist/codec.js', 'dist/bech32m.js', 'dist/presentation.js']) {
      await assert.rejects(import(`${path}/${internal}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    }
    const options = { prefix: 'btk', kind: 'uint64', version: 1 };
    const c = codec(options);
    options.prefix = 'changed';
    assert.equal(c.prefix, 'btk');
    assert.equal(c.kind, 'uint64');
    assert.equal(c.version, 1);
    assert.ok(Object.isFrozen(c));
    assert.deepEqual(Object.keys(c).sort(), ['decode', 'decodeCanonical', 'diagnose', 'encode', 'format', 'kind', 'prefix', 'version']);
    assert.throws(() => c.format(c.encode(42n).toUpperCase()), TypeError);
    const uuid = codec({ prefix: 'btk', kind: 'uuid' });
    assert.throws(() => uuid.encode('550E8400-e29b-41d4-a716-446655440000'), TypeError);
    assert.throws(() => uuid.format(c.encode(42n)), TypeError);
    assert.equal(c.format(c.encode(42n)), 'btk_1pqp2-cy59-jf');
  });

  test(`${name}: documented exception classes remain distinguishable`, t => {
    const c = codec({ prefix: 'btk', kind: 'uint64' });
    for (const bad of [42, '42', null, undefined, {}, NaN]) assert.throws(() => c.encode(bad), TypeError);
    for (const bad of [-1n, 1n << 64n]) assert.throws(() => c.encode(bad), RangeError);
    for (const [options, ErrorClass] of [
      [null, TypeError], [undefined, TypeError], [{}, RangeError],
      [{ prefix: 'btk', kind: 'uint64', extra: true }, TypeError],
      [{ prefix: 'BTK', kind: 'uint64' }, RangeError],
      [{ prefix: 'btk', kind: 'number' }, RangeError],
      [{ prefix: 'btk', kind: 'uint64', version: 2 }, RangeError]
    ]) assert.throws(() => codec(options), ErrorClass);
    for (const [options, ErrorClass] of [
      [null, TypeError], [undefined, TypeError], [{}, RangeError],
      [{ prefix: 'ticket', unexpected: 1 }, TypeError],
      [{ prefix: 'ticket', randomLength: 14, expectedCount: 100, maxCollisionProbability: 1e-9 }, TypeError],
      [{ prefix: 'Ticket' }, RangeError], [{ prefix: 'ticket', randomLength: 7 }, RangeError],
      [{ prefix: 'ticket', expectedCount: 1 }, RangeError]
    ]) {
      assert.throws(() => api.createReferences(options), ErrorClass);
      assert.throws(() => api.planReferences(options), ErrorClass);
    }
    assert.throws(() => api.collisionProbability(7, 100), RangeError);
    assert.throws(() => api.collisionProbability(14, 0), RangeError);
    t.mock.getter(globalThis, 'crypto', () => undefined);
    assert.throws(() => api.createReferences({ prefix: 'ticket' }).generate(), Error);
    assert.equal(c.decode(c.encode(42n)).value, 42n); // Existing-ID codecs do not need an RNG.
  });

  test(`${name}: input rejection, error precedence and raw diagnostic positions`, () => {
    const c = codec({ prefix: 'btk', kind: 'uint64' });
    const id = 'btk_1pqp2cy59jf';
    const cases = [
      [null, 'type'], [42, 'type'], [{ toString() { throw new Error('must not coerce'); } }, 'type'],
      ['x'.repeat(128), 'format'], ['x'.repeat(129), 'too_long'], ['K'.repeat(129), 'too_long'],
      ['K' + id, 'character'], ['\ud800' + id, 'character'], ['\u00a0' + id, 'character'],
      ['B' + id.slice(1), 'case'], ['42', 'format'], ['btk_1p-qp2cy59jf', 'format'],
      [id + '!', 'character'], [id.slice(0, -1) + 'q', 'checksum'],
      ['xyz' + id.slice(3), 'checksum']
    ];
    for (const [input, error] of cases) {
      assert.deepEqual(c.decode(input), { ok: false, error });
      assert.equal(c.diagnose(input).error, error);
    }
    assert.deepEqual(c.diagnose('  💥' + id), { ok: false, error: 'character', details: { positions: [2] } });
    assert.deepEqual(c.diagnose(id.slice(0, -1) + 'q'), { ok: false, error: 'checksum', details: {} });
    assert.deepEqual(c.diagnose('x'.repeat(129)), {
      ok: false, error: 'too_long', details: { expected: 128, actual: 129, unit: 'input_code_units' }
    });
    for (const v of invalid.cases) {
      const reader = codec({ prefix: v.prefix, kind: v.kind });
      assert.deepEqual(reader.decode(v.reference), { ok: false, error: v.error }, v.description);
      // The stage and details must agree with the published alpha, including precedence.
      assert.deepEqual(reader.diagnose(v.reference), alphaCodec({ prefix: v.prefix, kind: v.kind }).diagnose(v.reference));
    }
    assert.equal(c.decode(codec({ prefix: 'other', kind: 'uint64' }).encode(42n)).error, 'prefix');
    assert.equal(c.decode(codec({ prefix: 'btk', kind: 'uuid' }).encode('00000000-0000-0000-0000-00000000002a')).error, 'kind');
  });

  test(`${name}: legacy API, immutable plans and error results`, () => {
    const config = { prefix: 'ticket', randomLength: 14 };
    const r = api.createReferences(config);
    config.randomLength = 8;
    assert.equal(r.plan.randomLength, 14);
    assert.ok(Object.isFrozen(r));
    assert.ok(Object.isFrozen(r.plan));
    assert.deepEqual(api.planReferences({ prefix: 'ticket' }), {
      randomLength: 26, randomBits: 130, checksumLength: 6, canonicalLength: 39,
      expectedCount: null, maxCollisionProbability: null, collisionUpperBound: null, collisionProbability: null
    });
    const budget = api.planReferences({ prefix: 'ticket', expectedCount: 1000000, maxCollisionProbability: 1e-9 });
    assert.equal(budget.randomLength, 14);
    assert.ok(budget.collisionUpperBound <= 1e-9);
    assert.ok(api.collisionProbability(14, 1000000) <= budget.collisionUpperBound);
    for (const input of [null, {}, 42, []]) assert.deepEqual(r.parse(input), { ok: false, error: 'type' });
    assert.throws(() => r.format('ticket1invalid'), TypeError);
    for (const v of frozen.legacy) {
      const reader = api.createReferences({ prefix: v.prefix, randomLength: v.randomLength });
      assert.deepEqual(reader.parseCanonical(v.reference), { ok: true, id: v.reference, normalized: false });
      assert.deepEqual(reader.parse(grouped(v.reference).toUpperCase()), { ok: true, id: v.reference, normalized: true });
      assert.equal(reader.parseCanonical(grouped(v.reference)).error, 'non_canonical');
      for (const kind of ['uint64', 'uuid']) assert.equal(codec({ prefix: v.prefix, kind }).decode(v.reference).ok, false);
    }
  });
}

for (const writer of releases) for (const reader of releases) {
  test(`${writer.name} writes → ${reader.name} reads: all frozen and application v1 codes`, () => {
    for (const v of vectors) {
      const options = { prefix: v.prefix, kind: v.kind, version: 1 };
      const w = writer.codec(options), r = reader.codec(options), value = valueOf(v);
      const id = w.encode(value);
      assert.equal(id, v.reference);
      assert.equal(w.format(id), grouped(v.reference));
      for (const input of presentations(id)) {
        const success = { ok: true, id, value, normalized: input !== id };
        assert.deepEqual(r.decode(input), success);
        assert.deepEqual(r.diagnose(input), success);
        assert.deepEqual(r.decodeCanonical(input), input === id ? success : { ok: false, error: 'non_canonical' });
        if (input !== id) assert.throws(() => r.format(input), TypeError);
        assert.equal(r.encode(r.decode(input).value), id);
      }
      assert.equal(reader.api.createReferences({ prefix: v.prefix }).parse(id).ok, false);
    }
    for (const v of frozen.legacy) {
      const options = { prefix: v.prefix, randomLength: v.randomLength };
      const w = writer.api.createReferences(options), r = reader.api.createReferences(options);
      for (const id of [w.generate(), v.reference]) {
        assert.equal(w.format(id), grouped(id));
        for (const input of presentations(id)) {
          const success = { ok: true, id, normalized: input !== id };
          assert.deepEqual(r.parse(input), success);
          assert.deepEqual(r.diagnose(input), success);
          assert.deepEqual(r.parseCanonical(input), input === id ? success : { ok: false, error: 'non_canonical' });
          if (input !== id) assert.throws(() => r.format(input), TypeError);
        }
      }
    }
  });
}
