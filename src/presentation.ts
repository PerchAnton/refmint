import { ALPHABET } from './bech32m.js';

/** Positions are zero-based UTF-16 offsets in the original, unmodified input. */
export interface ValidationDetails {
  readonly positions?: readonly number[];
  readonly expected?: string | number;
  readonly actual?: string | number;
  readonly unit?: 'input_code_units' | 'data_symbols' | 'payload_symbols';
}

type InputError = 'type' | 'too_long' | 'format' | 'case' | 'character';
export type Failure<E extends string> = { readonly ok: false; readonly error: E; readonly details: ValidationDetails };
export function failure<E extends string>(error: E, details: ValidationDetails = {}): Failure<E> {
  return { ok: false, error, details };
}

/** Normalize presentation only. Never guess a replacement character or checksum. */
export function readPresentation(input: unknown, prefixPattern: RegExp):
  { readonly ok: true; readonly canonical: string } | Failure<InputError> {
  if (typeof input !== 'string') return failure('type');
  if (input.length > 128) return failure('too_long', { expected: 128, actual: input.length, unit: 'input_code_units' });
  const nonAscii: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const cp = input.codePointAt(i)!;
    if (cp > 127) nonAscii.push(i);
    if (cp > 0xffff) i++;
  }
  if (nonAscii.length) return failure('character', { positions: nonAscii });
  const offset = input.match(/^[ \t\r\n]*/)![0].length;
  let text = input.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
  if (text !== text.toLowerCase() && text !== text.toUpperCase()) return failure('case');
  text = text.toLowerCase();
  const separator = text.lastIndexOf('1');
  if (separator < 1 || !prefixPattern.test(text.slice(0, separator))) return failure('format');
  const body = text.slice(separator + 1);
  if (body.includes('-')) {
    const groups = body.split('-');
    if (groups.some((group, i) => i < groups.length - 1 ? group.length !== 4 : group.length < 1 || group.length > 4)) {
      return failure('format');
    }
  }
  const positions: number[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '-' && !ALPHABET.includes(body[i]!)) positions.push(offset + separator + 1 + i);
  }
  if (positions.length) return failure('character', { positions });
  return { ok: true, canonical: text.slice(0, separator + 1) + body.replaceAll('-', '') };
}

export function formatBody(id: string): string {
  const start = id.lastIndexOf('1') + 1;
  return id.slice(0, start) + id.slice(start).match(/.{1,4}/g)!.join('-');
}
