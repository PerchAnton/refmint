import { createReferenceCodec } from 'refmint/codec';
export const codec = createReferenceCodec({ prefix: 'order', kind: 'uint64', version: 1 });
export const good = codec.format(codec.encode(42n)).toUpperCase();
export const bad = good.slice(0, -1) + (good.endsWith('Q') ? 'P' : 'Q');
export const wrong = createReferenceCodec({ prefix: 'other', kind: 'uint64', version: 1 }).encode(42n);
export const message = 'Enter a valid ORDER reference from the card.';
export const valid = raw => typeof raw === 'string' && raw.length > 0 && codec.diagnose(raw).ok;
