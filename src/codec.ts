import { decode, encode } from './bech32m.js';
import { failure, formatBody, readPresentation, type Failure } from './presentation.js';
import type { ParseError } from './index.js';

export type ReferenceKind = 'uint64' | 'uuid';
export type ReferenceValue<K extends ReferenceKind> = K extends 'uint64' ? bigint : string;
declare const encodedReferenceBrand: unique symbol;
export type EncodedReference<P extends string, K extends ReferenceKind> = string & {
  readonly [encodedReferenceBrand]: readonly [P, K, 1];
};
export interface ReferenceCodecOptions<P extends string, K extends ReferenceKind> {
  readonly prefix: P;
  readonly kind: K;
  readonly version?: 1;
}
export type DecodeError = ParseError | 'version' | 'kind' | 'overflow';
type Decoded<P extends string, K extends ReferenceKind> = {
  readonly ok: true;
  readonly id: EncodedReference<P, K>;
  readonly value: ReferenceValue<K>;
  readonly normalized: boolean;
};
export type DecodeResult<P extends string, K extends ReferenceKind> =
  Decoded<P, K> | { readonly ok: false; readonly error: DecodeError };
export type DecodeDiagnostic<P extends string, K extends ReferenceKind> = Decoded<P, K> | Failure<DecodeError>;
export interface ReferenceCodec<P extends string, K extends ReferenceKind> {
  readonly prefix: P;
  readonly kind: K;
  readonly version: 1;
  encode(value: ReferenceValue<K>): EncodedReference<P, K>;
  decode(input: unknown): DecodeResult<P, K>;
  decodeCanonical(input: unknown): DecodeResult<P, K>;
  diagnose(input: unknown): DecodeDiagnostic<P, K>;
  format(id: EncodedReference<P, K>): string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Reversible public-ID representation. No random allocation, encryption or authorization. */
export function createReferenceCodec<const P extends string, const K extends ReferenceKind>(
  options: ReferenceCodecOptions<P, K>
): ReferenceCodec<P, K> {
  if (options === null || typeof options !== 'object') throw new TypeError('Options must be an object');
  for (const key of Object.keys(options)) {
    if (!['prefix', 'kind', 'version'].includes(key)) throw new TypeError(`Unknown option: ${key}`);
  }
  const { prefix, kind, version = 1 } = options;
  if (typeof prefix !== 'string' || !/^[a-z][a-z0-9]{0,15}$/.test(prefix)) {
    throw new RangeError('prefix must be 1–16 lowercase ASCII letters/digits, starting with a letter');
  }
  if (kind !== 'uint64' && kind !== 'uuid') throw new RangeError('kind must be uint64 or uuid');
  if (version !== 1) throw new RangeError('Only format version 1 is supported');
  const kindWord = kind === 'uint64' ? 0 : 1;
  const bits = kind === 'uint64' ? 64n : 128n;
  // The underscore is forbidden by the alpha.1 random-reference grammar.
  const wirePrefix = prefix + '_';

  function inspect(input: unknown, strict: boolean): DecodeDiagnostic<P, K> {
    const presented = readPresentation(input, /^[a-z][a-z0-9]{0,15}_$/);
    if (!presented.ok) return presented;
    const { canonical } = presented;
    const decoded = decode(canonical);
    if (!decoded) return failure('checksum');
    if (decoded.prefix !== wirePrefix) return failure('prefix', { expected: prefix, actual: decoded.prefix.slice(0, -1) });
    const { words } = decoded;
    if (words.length < 2) return failure('length', { expected: 'at least 2', actual: words.length, unit: 'data_symbols' });
    if (words[0] !== 1) return failure('version', { expected: 1, actual: words[0]! });
    if (words[1] !== kindWord) return failure('kind', { expected: kind, actual: words[1] === 0 ? 'uint64' : words[1] === 1 ? 'uuid' : words[1]! });
    const payload = words.slice(2);
    if (kind === 'uuid' ? payload.length !== 26 : payload.length < 1 || payload.length > 13) {
      return failure('length', { expected: kind === 'uuid' ? 26 : '1–13', actual: payload.length, unit: 'payload_symbols' });
    }
    let value = 0n;
    for (const word of payload) value = (value << 5n) | BigInt(word);
    if (value >= (1n << bits)) return failure('overflow');
    if (kind === 'uint64' && payload.length > 1 && payload[0] === 0) return failure('non_canonical');
    if (strict && canonical !== input) return failure('non_canonical');
    const hex = value.toString(16).padStart(32, '0');
    const original = kind === 'uint64' ? value : hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
    return { ok: true, id: canonical as EncodedReference<P, K>, value: original as ReferenceValue<K>, normalized: canonical !== input };
  }
  function parse(input: unknown, strict: boolean): DecodeResult<P, K> {
    const result = inspect(input, strict);
    return result.ok ? result : { ok: false, error: result.error };
  }
  return Object.freeze({
    prefix, kind, version: 1,
    encode(input: ReferenceValue<K>): EncodedReference<P, K> {
      let value: bigint;
      if (kind === 'uuid') {
        if (typeof input !== 'string' || !UUID.test(input)) throw new TypeError('UUID must be canonical lowercase hexadecimal with hyphens');
        value = BigInt('0x' + input.replaceAll('-', ''));
      } else {
        if (typeof input !== 'bigint') throw new TypeError('uint64 requires bigint; numbers can lose precision');
        value = input;
      }
      if (value < 0n || value >= (1n << bits)) throw new RangeError('Value is outside the codec range');
      const length = kind === 'uuid' ? 26 : Math.max(1, Math.ceil(value.toString(2).length / 5));
      const words = Array.from({ length }, (_, i) => Number((value >> BigInt(5 * (length - i - 1))) & 31n));
      return encode(wirePrefix, [1, kindWord, ...words]) as EncodedReference<P, K>;
    },
    decode: (input: unknown) => parse(input, false),
    decodeCanonical: (input: unknown) => parse(input, true),
    diagnose: (input: unknown) => inspect(input, false),
    format(id: EncodedReference<P, K>): string {
      const result = parse(id, true);
      if (!result.ok) throw new TypeError(`Cannot format reference: ${result.error}`);
      return formatBody(id);
    }
  });
}
