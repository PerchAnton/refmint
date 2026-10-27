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
