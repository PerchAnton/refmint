import { ALPHABET, decode, encode } from './bech32m.js';

declare const referenceBrand: unique symbol;
/** A validated canonical reference. Branding prevents accidental cross-prefix use. */
export type Reference<P extends string> = string & { readonly [referenceBrand]: P };

/** Use either an explicit random length or a lifetime collision budget. */
export type ReferenceOptions<P extends string> = { readonly prefix: P } & (
  | { readonly randomLength?: number; readonly expectedCount?: never; readonly maxCollisionProbability?: never }
  | { readonly randomLength?: never; readonly expectedCount: number; readonly maxCollisionProbability: number }
);

/** Lengths count canonical ASCII characters; display separators are additional. */
export interface ReferencePlan {
  readonly randomLength: number;
  readonly randomBits: number;
  readonly checksumLength: 6;
  readonly canonicalLength: number;
  readonly expectedCount: number | null;
  readonly maxCollisionProbability: number | null;
  readonly collisionUpperBound: number | null;
  readonly collisionProbability: number | null;
}

export type ParseError = 'type' | 'too_long' | 'format' | 'case' | 'character' |
  'checksum' | 'prefix' | 'length' | 'non_canonical';
export type ParseResult<P extends string> =
  | { readonly ok: true; readonly id: Reference<P>; readonly normalized: boolean }
  | { readonly ok: false; readonly error: ParseError };

export interface References<P extends string> {
  readonly prefix: P;
  readonly plan: ReferencePlan;
  /** Generate with Web Crypto. Throws if secure randomness is unavailable. */
  generate(): Reference<P>;
  /** Accept exact groups of four, uniform uppercase, and surrounding ASCII whitespace. */
  parse(input: unknown): ParseResult<P>;
  /** Require the exact lowercase, ungrouped storage representation. */
  parseCanonical(input: unknown): ParseResult<P>;
  /** Format a validated ID in groups of four after the separator. */
  format(id: Reference<P>): string;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;
const DEFAULT_LENGTH = 26; // 130 random bits; independent of checksum/prefix.

function checkLength(length: number): void {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError('randomLength must be an integer from 8 to 64');
  }
}

function checkCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError('expectedCount must be a positive safe integer');
  }
}

/** Birthday approximation under independent, uniform generation; not a uniqueness guarantee. */
export function collisionProbability(randomLength: number, count: number): number {
  checkLength(randomLength);
  checkCount(count);
  return -Math.expm1(-pairsPerSpace(randomLength, count));
}

/** Union bound before clamping: number of unordered pairs / random space size. */
function pairsPerSpace(length: number, count: number): number {
  return count * (count - 1) / (2 * 32 ** length);
}

/** Round the exact pair count upward before exact power-of-two scaling. */
function collisionUpperBound(length: number, count: number): number {
  const pairs = BigInt(count) * BigInt(count - 1) / 2n;
  let rounded = Number(pairs);
  if (BigInt(rounded) < pairs) {
    const bits = new DataView(new ArrayBuffer(8));
    bits.setFloat64(0, rounded);
    bits.setBigUint64(0, bits.getBigUint64(0) + 1n);
    rounded = bits.getFloat64(0);
  }
  return Math.min(1, rounded / 32 ** length);
}

/** Pick the shortest supported payload satisfying the conservative birthday union bound. */
export function planReferences<P extends string>(options: ReferenceOptions<P>): ReferencePlan {
  if (options === null || typeof options !== 'object') throw new TypeError('Options must be an object');
  for (const key of Object.keys(options)) {
    if (!['prefix', 'randomLength', 'expectedCount', 'maxCollisionProbability'].includes(key)) {
      throw new TypeError(`Unknown option: ${key}`);
    }
  }
  const { prefix, expectedCount, maxCollisionProbability, randomLength } = options;
  if (randomLength !== undefined) checkLength(randomLength);
  if (typeof prefix !== 'string' || !/^[a-z][a-z0-9]{0,15}$/.test(prefix)) {
    throw new RangeError('prefix must be 1–16 lowercase ASCII letters/digits, starting with a letter');
  }
  let length = randomLength ?? DEFAULT_LENGTH;
  const budgeted = expectedCount !== undefined || maxCollisionProbability !== undefined;
  if (budgeted) {
    if (randomLength !== undefined) throw new TypeError('Choose randomLength or a collision budget, not both');
    checkCount(expectedCount!);
    if (typeof maxCollisionProbability !== 'number' || !Number.isFinite(maxCollisionProbability) ||
        maxCollisionProbability <= 0 || maxCollisionProbability >= 1) {
      throw new RangeError('maxCollisionProbability must be between 0 and 1, exclusive');
    }
    length = MIN_LENGTH;
    while (length <= MAX_LENGTH && collisionUpperBound(length, expectedCount!) > maxCollisionProbability) length++;
    if (length > MAX_LENGTH) throw new RangeError('Collision budget needs more than 64 random characters');
  }
  checkLength(length);
  return Object.freeze({
    randomLength: length, randomBits: length * 5, checksumLength: 6,
    canonicalLength: prefix.length + 1 + length + 6,
    expectedCount: expectedCount ?? null, maxCollisionProbability: maxCollisionProbability ?? null,
    collisionUpperBound: budgeted ? collisionUpperBound(length, expectedCount!) : null,
    collisionProbability: budgeted ? collisionProbability(length, expectedCount!) : null
  });
}

/** Create one fixed reference namespace. Persist its prefix and payload length with your schema. */
export function createReferences<const P extends string>(options: ReferenceOptions<P>): References<P> {
  const plan = planReferences(options);
  const prefix = options.prefix;

  function parse(input: unknown, strict: boolean): ParseResult<P> {
    const fail = (error: ParseError): ParseResult<P> => ({ ok: false, error });
    if (typeof input !== 'string') return fail('type');
    // Bound work before trimming, regex matching or allocating character arrays.
    if (input.length > 128) return fail('too_long');
    let text = input.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
    if (text !== text.toLowerCase() && text !== text.toUpperCase()) return fail('case');
    text = text.toLowerCase();
    const separator = text.lastIndexOf('1');
    if (separator < 1 || !/^[a-z][a-z0-9]{0,15}$/.test(text.slice(0, separator))) return fail('format');
    let body = text.slice(separator + 1);
    if (body.includes('-')) {
      const groups = body.split('-');
      if (groups.some((group, i) => i < groups.length - 1 ? group.length !== 4 : group.length < 1 || group.length > 4)) {
        return fail('format');
      }
      body = groups.join('');
    }
    if (Array.from(body).some(c => !ALPHABET.includes(c))) return fail('character');
    text = text.slice(0, separator + 1) + body;
    const decoded = decode(text);
    if (!decoded) return fail('checksum');
    if (decoded.prefix !== prefix) return fail('prefix');
    if (decoded.words.length !== plan.randomLength) return fail('length');
    if (strict && text !== input) return fail('non_canonical');
    return { ok: true, id: text as Reference<P>, normalized: text !== input };
  }

  return Object.freeze({
    prefix, plan,
    generate(): Reference<P> {
      if (typeof globalThis.crypto?.getRandomValues !== 'function') {
        throw new Error('RefMint requires crypto.getRandomValues; no insecure fallback is provided');
      }
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(plan.randomLength));
      // 256 is divisible by 32: every symbol has exactly eight byte preimages.
      return encode(prefix, Array.from(bytes, byte => byte & 31)) as Reference<P>;
    },
    parse: (input: unknown) => parse(input, false),
    parseCanonical: (input: unknown) => parse(input, true),
    format(id: Reference<P>): string {
      const parsed = parse(id, true);
      if (!parsed.ok) throw new TypeError(`Cannot format reference: ${parsed.error}`);
      const start = prefix.length + 1;
      return id.slice(0, start) + id.slice(start).match(/.{1,4}/g)!.join('-');
    }
  });
}
