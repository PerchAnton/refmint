import { createReferenceCodec } from '../../dist/codec.js';

export function createRefMintAdapter(options) {
  return createReferenceCodec({ ...options, version: 1 });
}
