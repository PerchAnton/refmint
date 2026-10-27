import { decode, encode } from './bech32m.js';
import { failure, formatBody, readPresentation, type Failure } from './presentation.js';
export { createReferenceCodec } from './codec.js';
export type { ReferenceCodecOptions, ReferenceCodec, ReferenceKind, ReferenceValue, EncodedReference, DecodeError, DecodeResult, DecodeDiagnostic } from './codec.js';
export type { ValidationDetails } from './presentation.js';

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
export type ParseDiagnostic<P extends string> = Extract<ParseResult<P>, { ok: true }> | Failure<ParseError>;

export interface References<P extends string> {
  readonly prefix: P;
  readonly plan: ReferencePlan;
  /** Generate with Web Crypto. Throws if secure randomness is unavailable. */
  generate(): Reference<P>;
  /** Accept exact groups of four, uniform uppercase, and surrounding ASCII whitespace. */
  parse(input: unknown): ParseResult<P>;
  /** Require the exact lowercase, ungrouped storage representation. */
  parseCanonical(input: unknown): ParseResult<P>;
  /** Same human-input rules, with bounded diagnostics; never suggests a corrected ID. */
  diagnose(input: unknown): ParseDiagnostic<P>;
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
  return configure(options).plan;
}

/** Read each option once so dynamic getters cannot invalidate a factory's plan. */
function configure<P extends string>(options: ReferenceOptions<P>): { prefix: P; plan: ReferencePlan } {
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
  const plan = Object.freeze({
    randomLength: length, randomBits: length * 5, checksumLength: 6,
    canonicalLength: prefix.length + 1 + length + 6,
    expectedCount: expectedCount ?? null, maxCollisionProbability: maxCollisionProbability ?? null,
    collisionUpperBound: budgeted ? collisionUpperBound(length, expectedCount!) : null,
    collisionProbability: budgeted ? collisionProbability(length, expectedCount!) : null
  });
  return { prefix, plan };
}

/** Create one fixed reference namespace. Persist its prefix and payload length with your schema. */
export function createReferences<const P extends string>(options: ReferenceOptions<P>): References<P> {
  const { prefix, plan } = configure(options);

  function inspect(input: unknown, strict: boolean): ParseDiagnostic<P> {
    const presented = readPresentation(input, /^[a-z][a-z0-9]{0,15}$/);
    if (!presented.ok) return presented;
    const text = presented.canonical;
    const decoded = decode(text);
    if (!decoded) return failure('checksum');
    if (decoded.prefix !== prefix) return failure('prefix', { expected: prefix, actual: decoded.prefix });
    if (decoded.words.length !== plan.randomLength) return failure('length', { expected: plan.randomLength, actual: decoded.words.length, unit: 'payload_symbols' });
    if (strict && text !== input) return failure('non_canonical');
    return { ok: true, id: text as Reference<P>, normalized: text !== input };
  }
  function parse(input: unknown, strict: boolean): ParseResult<P> {
    const result = inspect(input, strict);
    return result.ok ? result : { ok: false, error: result.error };
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
    diagnose: (input: unknown) => inspect(input, false),
    format(id: Reference<P>): string {
      const parsed = parse(id, true);
      if (!parsed.ok) throw new TypeError(`Cannot format reference: ${parsed.error}`);
      return formatBody(id);
    }
  });
}
