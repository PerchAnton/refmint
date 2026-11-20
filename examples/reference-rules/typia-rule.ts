import typia from 'typia';
import { createReferenceCodec } from 'refmint/codec';

const codec = createReferenceCodec({ prefix: 'order', kind: 'uint64', version: 1 });
interface Request { reference: string }
// Typia checks the request shape. The codec handles checksum and namespace separately.
const validateShape = typia.createValidate<Request>();
export function validateRequest(input: unknown) {
  const shape = validateShape(input);
  if (!shape.success) return { ok: false, stage: 'shape', errors: shape.errors };
  const diagnosis = codec.diagnose(shape.data.reference);
  if (!diagnosis.ok) return { ok: false, stage: 'reference', diagnosis };
  return { ok: true, stage: 'complete', data: shape.data };
}
