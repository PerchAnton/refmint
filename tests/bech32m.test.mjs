import assert from 'node:assert/strict';
import test from 'node:test';
import { bech32m } from 'bech32';
import { ALPHABET, decode, encode } from '../dist/bech32m.js';

// Generic Bech32m test vectors from BIP-350 (BSD-2-Clause; see notices).
const valid = [
  'A1LQFN3A', 'a1lqfn3a',
  'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6',
  'abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx',
  '11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8',
  'split1checkupstagehandshakeupstreamerranterredcaperredlc445v', '?1v759aa'
];
const invalid = [
  '\x201xj0phk', '\x7f1g6xzxy', '\x801vctc34',
  'an84characterslonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11d6pts4',
  'qyrz8wqd2c9m', '1qyrz8wqd2c9m', 'y1b0jsk6g', 'lt1igcx5c0', 'in1muywd',
  'mm1crxm3i', 'au1s5cgom', 'M1VUXWEZ', '16plkw9', '1p2gdwpf'
];

test('all 7 valid BIP-350 generic vectors decode and reproduce canonically', () => {
  for (const text of valid) {
    const got = decode(text);
    assert.ok(got, text);
    assert.equal(encode(got.prefix, got.words), text.toLowerCase());
    assert.deepEqual(got, bech32m.decode(text));
  }
});
test('all 14 invalid BIP-350 generic vectors are rejected', () => {
  for (const text of invalid) assert.equal(decode(text), undefined, text);
});
test('legacy Bech32 and mixed-case strings are rejected', () => {
  assert.equal(decode('a12uel5l'), undefined);
  assert.equal(decode('a1LQFN3A'), undefined);
});
test('encoding agrees with an independent npm implementation across supported lengths', () => {
  for (let length = 8; length <= 64; length++) {
    for (const prefix of ['doc', 'ticket', 'v1', 'abcdefghijklmnop']) {
      const words = Array.from({ length }, (_, i) => (i * 17 + length) & 31);
      const encoded = encode(prefix, words);
      assert.equal(encoded, bech32m.encode(prefix, words));
      assert.deepEqual(decode(encoded), { prefix, words });
    }
  }
});
test('every single-symbol payload/checksum substitution is detected in boundary fixtures', () => {
  for (const length of [8, 14, 26, 64]) {
    const text = encode('ticket', Array.from({ length }, (_, i) => i % 32));
    for (let i = 7; i < text.length; i++) {
      for (const char of ALPHABET) {
        if (char !== text[i]) assert.equal(decode(text.slice(0, i) + char + text.slice(i + 1)), undefined);
      }
    }
  }
});
test('deterministic samples of two, three and four substitutions are detected', () => {
  let seed = 789;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const text = encode('ticket', Array.from({ length: 26 }, (_, i) => i));
  for (const count of [2, 3, 4]) {
    for (let sample = 0; sample < 1000; sample++) {
      const positions = new Set();
      while (positions.size < count) positions.add(7 + next() % 32);
      const mutated = [...text];
      for (const i of positions) mutated[i] = ALPHABET[(ALPHABET.indexOf(mutated[i]) + 1 + next() % 31) % 32];
      assert.equal(decode(mutated.join('')), undefined);
    }
  }
});
test('codec refuses unsupported encoding inputs and overlong strings', () => {
  for (const [prefix, words] of [['', []], ['A', []], ['a', [32]], ['a', [-1]], ['a', [0.5]], ['a'.repeat(84), []]]) {
    assert.throws(() => encode(prefix, words), RangeError);
  }
});
