import { createReferenceCodec } from '../../dist/index.js';

export function createRefMintAdapter(options) {
  return createReferenceCodec({ ...options, version: 1 });
}
