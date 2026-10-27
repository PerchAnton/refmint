import assert from 'node:assert/strict';
import test from 'node:test';
import { bech32m } from 'bech32';
import { createReferences, planReferences } from '../dist/index.js';

// Independent oracle: compare exact integer ratios, including the precise IEEE
// value of the user's budget, rather than rounding a bound as the library does.
function ratio(value) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const significand = (bits & ((1n << 52n) - 1n)) | (exponent ? 1n << 52n : 0n);
  const shift = exponent ? exponent - 1075 : -1074;
  return shift >= 0 ? [significand << BigInt(shift), 1n] : [significand, 1n << BigInt(-shift)];
}

function neighbor(value, direction) {
  if (value === 0 && direction < 0) return 0;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  view.setBigUint64(0, view.getBigUint64(0) + BigInt(direction));
  return view.getFloat64(0);
}

test('planner meets exact budgets immediately above and below length cutoffs', t => {
  let checked = 0;
  const spaces = Array.from({ length: 65 }, (_, length) => 1n << BigInt(5 * length));
  const counts = [1, 2, 3, 1000, 1_000_000, 2 ** 26, 2 ** 27 + 1, 2 ** 32 - 1, 2 ** 32, 2 ** 48 + 1,
    Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER];
  for (const count of counts) {
    const pairs = BigInt(count) * BigInt(count - 1) / 2n;
    const budgets = new Set([Number.MIN_VALUE, 2 ** -320, 1e-9, neighbor(1, -1)]);
    for (let length = 8; length <= 64; length++) {
      const cutoff = Number(pairs) / 32 ** length;
      for (const p of [neighbor(cutoff, -1), cutoff, neighbor(cutoff, 1)]) {
        if (p > 0 && p < 1) budgets.add(p);
      }
    }
    for (const p of budgets) {
      const [numerator, denominator] = ratio(p);
      const exactLength = spaces.findIndex((space, length) => length >= 8 && pairs * denominator <= numerator * space);
      const options = { prefix: 'budget', expectedCount: count, maxCollisionProbability: p };
      if (exactLength === -1) assert.throws(() => planReferences(options), RangeError);
      else {
        const plan = planReferences(options);
        assert.equal(plan.randomLength, exactLength, `${count} references at budget ${p}`);
        assert.ok(plan.collisionUpperBound <= p);
        const [boundNumerator, boundDenominator] = ratio(plan.collisionUpperBound);
        assert.ok(boundNumerator * spaces[exactLength] >= pairs * boundDenominator);
        assert.ok(plan.collisionProbability >= 0 && plan.collisionProbability <= plan.collisionUpperBound);
      }
      checked++;
    }
  }
  t.diagnostic(`${checked} distinct count/budget pairs checked with exact integer ratios`);
});

test('all 912 prefix/payload length combinations preserve canonical identity', () => {
  for (let prefixLength = 1; prefixLength <= 16; prefixLength++) {
    const prefix = ('a123456789abcdef').repeat(2).slice(0, prefixLength);
    for (let length = 8; length <= 64; length++) {
      const refs = createReferences({ prefix, randomLength: length });
      const id = bech32m.encode(prefix, Array.from({ length }, (_, i) => (i * 17 + length) % 32));
      assert.equal(id.length, refs.plan.canonicalLength);
      assert.deepEqual(refs.parseCanonical(id), { ok: true, id, normalized: false });
      const printed = refs.format(id);
      for (const input of [id.toUpperCase(), printed, printed.toUpperCase(), ' \t' + printed + '\r\n']) {
        assert.deepEqual(refs.parse(input), { ok: true, id, normalized: true });
        assert.equal(refs.parseCanonical(input).error, 'non_canonical');
      }
      // Check the actual input limit independently of the canonical length.
      const padded = ' '.repeat(128 - printed.length) + printed;
      assert.equal(refs.parse(padded).id, id);
      assert.equal(refs.parse(padded + ' ').error, 'too_long');
      const generated = refs.generate();
      const decoded = bech32m.decode(generated);
      assert.equal(decoded.prefix, prefix);
      assert.equal(decoded.words.length, length);
    }
  }
});

test('parsing arbitrary values does not invoke user conversion hooks', () => {
  const refs = createReferences({ prefix: 'ticket' });
  const hostile = new Proxy({}, { get() { throw new Error('Do not inspect this object'); } });
  for (const input of [undefined, null, false, 0, NaN, Infinity, 1n, Symbol('input'), [], {}, new String('ticket'), hostile]) {
    assert.deepEqual(refs.parse(input), { ok: false, error: 'type' });
    assert.deepEqual(refs.parseCanonical(input), { ok: false, error: 'type' });
  }
});
