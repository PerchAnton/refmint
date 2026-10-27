/**
 * Generic Bech32m encoding, BIP-173 / BIP-350. Not a Bitcoin address codec.
 * The checksum follows Pieter Wuille's reference algorithm (2017, 2021).
 * See THIRD_PARTY_NOTICES.md for the retained MIT notice and specifications.
 */
export const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const CONSTANT = 0x2bc830a3;

/** Evaluate the 30-bit checksum polynomial on 5-bit symbols. */
function residue(words: readonly number[]): number {
  let state = 1;
  for (const word of words) {
    const top = state >>> 25;
    state = ((state & 0x1ffffff) << 5) ^ word;
    for (let bit = 0; bit < 5; bit++) {
      if ((top >>> bit) & 1) state ^= GENERATORS[bit]!;
    }
  }
  return state;
}

/** Protect both parts of every ASCII prefix character, as specified in BIP-173. */
function expand(prefix: string): number[] {
  const codes = Array.from(prefix, c => c.charCodeAt(0));
  return [...codes.map(c => c >>> 5), 0, ...codes.map(c => c & 31)];
}

/** Encode a lowercase printable ASCII prefix and payload symbols. */
export function encode(prefix: string, words: readonly number[]): string {
  if (!/^[!-~]+$/.test(prefix) || prefix !== prefix.toLowerCase() ||
      prefix.length + words.length + 7 > 90 ||
      words.some(w => !Number.isInteger(w) || w < 0 || w > 31)) {
    throw new RangeError('Invalid Bech32m input');
  }
  const check = residue([...expand(prefix), ...words, 0, 0, 0, 0, 0, 0]) ^ CONSTANT;
  const suffix = Array.from({ length: 6 }, (_, i) => (check >>> (5 * (5 - i))) & 31);
  return prefix + '1' + [...words, ...suffix].map(w => ALPHABET[w]!).join('');
}

/** Decode generic Bech32m, accepting uniformly upper- or lowercase text. */
export function decode(text: string): { prefix: string; words: number[] } | undefined {
  if (text.length > 90 || !/^[!-~]+$/.test(text) ||
      (text !== text.toLowerCase() && text !== text.toUpperCase())) return;
  const canonical = text.toLowerCase();
  const separator = canonical.lastIndexOf('1');
  if (separator < 1 || canonical.length - separator - 1 < 6) return;
  const prefix = canonical.slice(0, separator);
  const words = Array.from(canonical.slice(separator + 1), c => ALPHABET.indexOf(c));
  if (words.includes(-1) || residue([...expand(prefix), ...words]) !== CONSTANT) return;
  return { prefix, words: words.slice(0, -6) };
}
