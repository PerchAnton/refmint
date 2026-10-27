import { createReferences } from '../dist/index.js';

const tickets = createReferences({
  prefix: 'ticket', expectedCount: 1_000_000, maxCollisionProbability: 1e-9
});
const id = tickets.generate();
// In production use a UNIQUE database constraint and a bounded retry on conflict.
const records = new Map([[id, { title: 'Exported PDF has the wrong paper size' }]]);
const input = tickets.format(id).toUpperCase();
const parsed = tickets.parse(input);
if (!parsed.ok) throw new Error(`Check the reference: ${parsed.error}`);
console.log({ displayed: input, canonical: parsed.id, found: records.get(parsed.id), plan: tickets.plan });

const typo = id.slice(0, -1) + (id.endsWith('q') ? 'p' : 'q');
console.log('One mistyped character:', tickets.parse(typo));
const validButUnknown = tickets.generate();
console.log('Valid format does not prove a record exists:', records.has(validButUnknown));
