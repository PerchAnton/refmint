import { String as StringType } from 'runtypes';
import * as v from 'valibot';
import { valid, message } from './reference.mjs';
export const runtimeReference = StringType.withConstraint(raw => valid(raw) || message);
export const referenceSchema = v.pipe(v.string(), v.check(valid, message));
export const formSchema = v.object({ reference: referenceSchema });
export function validateWith(library, raw) {
  if (library === 'runtypes') return { ok: runtimeReference.inspect(raw).success, raw };
  if (library === 'valibot') return { ok: v.safeParse(referenceSchema, raw).success, raw };
  throw new Error(`Unknown library: ${library}`);
}
