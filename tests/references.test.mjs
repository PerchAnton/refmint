import assert from 'node:assert/strict';
import test from 'node:test';
import { bech32m } from 'bech32';
import { collisionProbability, createReferences, planReferences } from '../dist/index.js';

const fixture = (prefix = 'ticket', length = 14) => bech32m.encode(prefix, Array.from({ length }, (_, i) => i % 32));
const tickets = createReferences({ prefix: 'ticket', expectedCount: 1_000_000, maxCollisionProbability: 1e-9 });

test('budget uses 14 random symbols / 70 bits, excluding the six checksum symbols', () => {
  assert.equal(tickets.plan.randomLength, 14);
  assert.equal(tickets.plan.randomBits, 70);
  assert.equal(tickets.plan.canonicalLength, 27);
  assert.ok(tickets.plan.collisionUpperBound <= 1e-9);
  assert.ok(collisionProbability(13, 1_000_000) > 1e-9);
  assert.ok(Math.abs(collisionProbability(8, 1_000_000) - 0.36539143049797307) < 1e-15);
  assert.ok(collisionProbability(26, 2) > 0); // Avoid cancellation to zero.
  assert.equal(collisionProbability(26, 1), 0);
});
test('planner selects the shortest supported length using independent BigInt pair counts', () => {
  for (const count of [1, 2, 1000, 1_000_000, Number.MAX_SAFE_INTEGER]) {
    for (const divisor of [100n, 1_000_000_000n, 1_000_000_000_000n]) {
      const pairs = BigInt(count) * BigInt(count - 1) / 2n;
      const plan = planReferences({ prefix: 'doc', expectedCount: count, maxCollisionProbability: 1 / Number(divisor) });
      assert.ok(pairs * divisor <= 32n ** BigInt(plan.randomLength));
      if (plan.randomLength > 8) assert.ok(pairs * divisor > 32n ** BigInt(plan.randomLength - 1));
    }
  }
});
test('default is 130 random bits and the configuration is immutable', () => {
  const options = { prefix: 'doc' };
  const docs = createReferences(options);
  options.prefix = 'order';
  assert.equal(docs.prefix, 'doc');
  assert.equal(docs.plan.randomBits, 130);
  assert.equal(docs.plan.collisionProbability, null);
  assert.ok(Object.isFrozen(docs) && Object.isFrozen(docs.plan));
});
test('reported upper bound never rounds below the exact pair count at large budgets', () => {
  for (let offset = 0; offset < 100; offset++) {
    const count = Number.MAX_SAFE_INTEGER - offset;
    const plan = planReferences({ prefix: 'doc', expectedCount: count, maxCollisionProbability: 1e-50 });
    const exactPairs = BigInt(count) * BigInt(count - 1) / 2n;
    assert.ok(BigInt(plan.collisionUpperBound * 32 ** plan.randomLength) >= exactPairs);
  }
});
test('invalid, incomplete, contradictory or misspelled configuration fails closed', () => {
  for (const options of [null, undefined, {}, { prefix: '' }, { prefix: 'Ticket' }, { prefix: 'doc_1' },
    { prefix: 'a'.repeat(17) }, { prefix: 'док' }, { prefix: 'doc', randomLength: 7 },
    { prefix: 'doc', randomLength: 65 }, { prefix: 'doc', randomLength: NaN },
    { prefix: 'doc', randomLength: null },
    { prefix: 'doc', expectedCount: 10 }, { prefix: 'doc', maxCollisionProbability: 1e-9 },
    { prefix: 'doc', expectedCount: 0, maxCollisionProbability: 1e-9 },
    { prefix: 'doc', expectedCount: 2.5, maxCollisionProbability: 1e-9 },
    { prefix: 'doc', expectedCount: Infinity, maxCollisionProbability: 1e-9 },
    { prefix: 'doc', expectedCount: 2, maxCollisionProbability: 0 },
    { prefix: 'doc', expectedCount: 2, maxCollisionProbability: 1 },
    { prefix: 'doc', expectedCount: 2, maxCollisionProbability: NaN },
    { prefix: 'doc', expectedCount: 2, maxCollisionProbability: 1e-300 },
    { prefix: 'doc', expectedCount: 2, maxCollisionProbability: 1e-9, randomLength: 14 },
    { prefix: 'doc', randomLenght: 8 }]) assert.throws(() => createReferences(options));
});
test('canonical, uniformly uppercase and exactly grouped input converge to one stored key', () => {
  const id = fixture();
  const grouped = id.slice(0, 7) + id.slice(7).match(/.{1,4}/g).join('-');
  assert.deepEqual(tickets.parse(id), { ok: true, id, normalized: false });
  for (const input of [id.toUpperCase(), grouped, ' \t' + grouped.toUpperCase() + '\r\n']) {
    assert.deepEqual(tickets.parse(input), { ok: true, id, normalized: true });
    assert.equal(tickets.parseCanonical(input).error, 'non_canonical');
  }
  assert.equal(tickets.format(id), grouped);
});
test('input errors are distinguishable without silently correcting a wrong code', () => {
  const id = fixture();
  const cases = [
    [null, 'type'], [123, 'type'], ['a'.repeat(129), 'too_long'], ['', 'format'],
    ['T' + id.slice(1), 'case'], [id.slice(0, 7) + 'b' + id.slice(8), 'character'],
    [id.slice(0, 7) + '-' + id.slice(7), 'format'], [id + '-', 'format'],
    [id.slice(0, 9) + '-' + id.slice(9), 'format'], ['\u00a0' + id, 'format'],
    [id.slice(0, -1) + (id.endsWith('q') ? 'p' : 'q'), 'checksum'],
    [fixture('order'), 'prefix'], [fixture('ticket', 15), 'length']
  ];
  for (const [input, error] of cases) assert.deepEqual(tickets.parse(input), { ok: false, error }, String(input));
  assert.throws(() => tickets.format(fixture('order')), /prefix/);
});
test('checksum binds prefix; changing a valid prefix invalidates the original checksum', () => {
  assert.equal(tickets.parse(fixture().replace('ticket', 'docket')).error, 'checksum');
});
test('prefixes containing separator digits and maximum payload round trip', () => {
  const refs = createReferences({ prefix: 'v11', randomLength: 64 });
  const id = refs.generate();
  assert.equal(refs.parse(refs.format(id).toUpperCase()).id, id);
  assert.ok(id.length <= 90);
});
test('8-to-5-bit sampling gives every alphabet symbol exactly eight preimages', t => {
  let next = 0;
  t.mock.method(globalThis.crypto, 'getRandomValues', array => {
    for (let i = 0; i < array.length; i++) array[i] = next++ & 255;
    return array;
  });
  const refs = createReferences({ prefix: 'test', randomLength: 64 });
  const counts = Array(32).fill(0);
  for (let i = 0; i < 4; i++) for (const word of bech32m.decode(refs.generate()).words) counts[word]++;
  assert.deepEqual(counts, Array(32).fill(8));
});
test('real Web Crypto output is accepted by the independent decoder', () => {
  for (let i = 0; i < 100; i++) {
    const id = tickets.generate();
    assert.equal(bech32m.decode(id).words.length, 14);
    assert.equal(tickets.parseCanonical(id).id, id);
  }
});
test('missing randomness fails explicitly without a Math.random fallback', t => {
  t.mock.getter(globalThis, 'crypto', () => undefined);
  assert.throws(() => tickets.generate(), /requires crypto.getRandomValues/);
});
