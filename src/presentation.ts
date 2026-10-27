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
  if (/[^\x00-\x7f]/.test(input)) {
    const positions: number[] = [];
    for (let i = 0; i < input.length; i++) {
      const cp = input.codePointAt(i)!;
      if (cp > 127) positions.push(i);
      if (cp > 0xffff) i++;
    }
    return failure('character', { positions });
  }
  let text = input.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
  const lower = text.toLowerCase();
  if (text !== lower && text !== text.toUpperCase()) return failure('case');
  text = lower;
  const separator = text.lastIndexOf('1');
  if (separator < 1 || !prefixPattern.test(text.slice(0, separator))) return failure('format');
  const body = text.slice(separator + 1);
  if (body.includes('-')) {
    const groups = body.split('-');
    if (groups.some((group, i) => i < groups.length - 1 ? group.length !== 4 : group.length < 1 || group.length > 4)) {
      return failure('format');
    }
  }
  const invalid = /[^qpzry9x8gf2tvdw0s3jn54khce6mua7l-]/g;
  if (invalid.test(body)) {
    const start = input.match(/^[ \t\r\n]*/)![0].length + separator + 1;
    invalid.lastIndex = 0;
    return failure('character', { positions: Array.from(body.matchAll(invalid), m => start + m.index) });
  }
  return { ok: true, canonical: text.replaceAll('-', '') };
}

export function formatBody(id: string): string {
  const start = id.lastIndexOf('1') + 1;
  return id.slice(0, start) + id.slice(start).match(/.{1,4}/g)!.join('-');
}
