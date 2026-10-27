/**
 * Generic Bech32m encoding, BIP-173 / BIP-350. Not a Bitcoin address codec.
 * The checksum follows Pieter Wuille's reference algorithm (2017, 2021).
 * See THIRD_PARTY_NOTICES.md for the retained MIT notice and specifications.
 */
export const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const CONSTANT = 0x2bc830a3;

// The five high bits have only 32 combinations. Expand their XOR once, not
// five branches per input symbol. The BIP polynomial and wire format are unchanged.
const TOP = Array.from({ length: 32 }, (_, top) =>
  GENERATORS.reduce((sum, generator, bit) => sum ^ ((top >>> bit) & 1 ? generator : 0), 0));
function step(state: number, word = 0): number {
  return ((state & 0x1ffffff) << 5) ^ TOP[state >>> 25]! ^ word;
}

/** Protect both parts of every ASCII prefix character, as specified in BIP-173. */
function prefixState(prefix: string): number {
  let state = 1;
  for (let i = 0; i < prefix.length; i++) state = step(state, prefix.charCodeAt(i) >>> 5);
  state = step(state);
  for (let i = 0; i < prefix.length; i++) state = step(state, prefix.charCodeAt(i) & 31);
  return state;
}

/** Encode a lowercase printable ASCII prefix and payload symbols. */
export function encode(prefix: string, words: readonly number[]): string {
  if (!/^[!-~]+$/.test(prefix) || prefix !== prefix.toLowerCase() ||
      prefix.length + words.length + 7 > 90 ||
      words.some(w => !Number.isInteger(w) || w < 0 || w > 31)) {
    throw new RangeError('Invalid Bech32m input');
  }
  let state = prefixState(prefix), text = prefix + '1';
  for (const word of words) { state = step(state, word); text += ALPHABET[word]; }
  for (let i = 0; i < 6; i++) state = step(state);
  state ^= CONSTANT;
  for (let shift = 25; shift >= 0; shift -= 5) text += ALPHABET[(state >>> shift) & 31];
  return text;
}

/** Decode generic Bech32m, accepting uniformly upper- or lowercase text. */
export function decode(text: string): { prefix: string; words: number[] } | undefined {
  if (text.length > 90 || !/^[!-~]+$/.test(text) ||
      (text !== text.toLowerCase() && text !== text.toUpperCase())) return;
  const canonical = text.toLowerCase();
  const separator = canonical.lastIndexOf('1');
  if (separator < 1 || canonical.length - separator - 1 < 6) return;
  const prefix = canonical.slice(0, separator);
  let state = prefixState(prefix);
  const words: number[] = [];
  for (let i = separator + 1; i < canonical.length; i++) {
    const word = ALPHABET.indexOf(canonical[i]!);
    if (word < 0) return;
    state = step(state, word);
    if (i < canonical.length - 6) words.push(word);
  }
  if (state === CONSTANT) return { prefix, words };
}
