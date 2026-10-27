import { createReferences, type Reference } from '../dist/index.js';
const docs = createReferences({ prefix: 'doc' });
const tickets = createReferences({ prefix: 'ticket', randomLength: 14 });
const id: Reference<'doc'> = docs.generate();
docs.format(id);
// @ts-expect-error Different namespaces must not be mixed.
tickets.format(id);
// @ts-expect-error Unvalidated strings must not be treated as IDs.
docs.format('doc1anything');
// @ts-expect-error A budget requires both parameters.
createReferences({ prefix: 'doc', expectedCount: 100 });
// @ts-expect-error A budget cannot be combined with an explicit length.
createReferences({ prefix: 'doc', randomLength: 12, expectedCount: 100, maxCollisionProbability: 1e-9 });
const result = docs.parse('user input');
if (result.ok) docs.format(result.id);
else { const error: string = result.error; void error; }

import { createReferenceCodec, type EncodedReference } from '../dist/index.js';
const numbers = createReferenceCodec({ prefix: 'rma', kind: 'uint64', version: 1 });
const uuids = createReferenceCodec({ prefix: 'rma', kind: 'uuid' });
const encoded: EncodedReference<'rma', 'uint64'> = numbers.encode(42n);
// @ts-expect-error No floating-point numbers for uint64.
numbers.encode(42);
// @ts-expect-error Kind is part of the reference brand.
uuids.format(encoded);
// @ts-expect-error Random IDs are not encoded existing IDs.
numbers.format(createReferences({ prefix: 'rma' }).generate());
// @ts-expect-error Version 2 is not supported.
createReferenceCodec({ prefix: 'rma', kind: 'uuid', version: 2 });
const decoded = numbers.decode('input');
if (decoded.ok) { const original: bigint = decoded.value; void original; }
const diagnostic = uuids.diagnose('input');
if (diagnostic.ok) { const original: string = diagnostic.value; void original; }
else { const positions: readonly number[] | undefined = diagnostic.details.positions; void positions; }
