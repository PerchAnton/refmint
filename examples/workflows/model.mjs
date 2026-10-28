// Local fixture, not Octofleet/Invoice Builder's implementation or production data.
import { createReferenceCodec } from '../../dist/codec.js';

export const domains = ['fleet', 'invoice'];
export const routes = ['existing', 'alias', 'refmint'];
export const records = Object.freeze([
  Object.freeze({ domain: 'fleet', id: '550e8400-e29b-41d4-a716-446655440000', existing: 'press-07', alias: 'A1042', owner: 'demo-team' }),
  Object.freeze({ domain: 'fleet', id: '550e8400-e29b-41d4-a716-446655440001', existing: 'press-08', alias: 'A1043', owner: 'demo-team' }),
  Object.freeze({ domain: 'fleet', id: '550e8400-e29b-41d4-a716-446655440002', existing: 'press-09', alias: 'A1044', owner: 'other-team' }),
  Object.freeze({ domain: 'invoice', id: '42', existing: 'INV-2026-000042', alias: 'D1042', owner: 'demo-team' }),
  Object.freeze({ domain: 'invoice', id: '43', existing: 'INV-2026-000043', alias: 'D1043', owner: 'demo-team' }),
  Object.freeze({ domain: 'invoice', id: '44', existing: 'INV-2026-000044', alias: 'D1044', owner: 'other-team' })
]);

export function codec(domain) {
  if (!domains.includes(domain)) throw new Error('unknown domain');
  return createReferenceCodec({ prefix: domain === 'fleet' ? 'asset' : 'invoice', kind: domain === 'fleet' ? 'uuid' : 'uint64', version: 1 });
}

export function identifier(record, route, printed = false) {
  if (!routes.includes(route)) throw new Error('unknown route');
  if (route !== 'refmint') return record[route];
  const c = codec(record.domain);
  const value = record.domain === 'fleet' ? record.id : BigInt(record.id);
  const id = c.encode(value);
  return printed ? c.format(id).toUpperCase() : id;
}

export function lookup(domain, route, input, actor = 'demo-team') {
  const c = codec(domain);
  if (!routes.includes(route)) throw new Error('unknown route');
  if (typeof input !== 'string' || input.length > 128 || !input.trim()) return { status: 'invalid', reason: 'input', queries: 0 };
  let matches;
  if (route === 'refmint') {
    const result = c.diagnose(input);
    if (!result.ok) return { status: 'invalid', reason: result.error, queries: 0 };
    matches = r => r.id === String(result.value);
  } else {
    const query = input.trim().toLowerCase();
    // Fleet's existing baseline supports hostname substring search; invoice/alias
    // use exact strings. This deliberately does not recreate either upstream app.
    matches = r => route === 'existing' && domain === 'fleet'
      ? r.existing.toLowerCase().includes(query) : r[route].toLowerCase() === query;
  }
  // Apply the same scope to every route. In production this belongs on the server.
  const found = records.filter(r => r.domain === domain && r.owner === actor && matches(r));
  if (!found.length) return { status: 'not_found', queries: 1 };
  if (found.length > 1) return { status: 'ambiguous', queries: 1, matches: found.length };
  return { status: 'found', queries: 1, record: { id: found[0].id, label: found[0].existing } };
}

export function changedSymbol(input) {
  return input.slice(0, -1) + (input.endsWith('q') ? 'p' : 'q');
}

export function scenarios(domain, route) {
  const [target, neighbor, denied] = records.filter(r => r.domain === domain);
  const original = identifier(target, route);
  const otherDomain = records.find(r => r.domain !== domain);
  const unknown = { ...target, id: domain === 'fleet' ? target.id.slice(0, -1) + 'f' : '99', existing: 'missing-99', alias: 'Z9999' };
  // Select a one-symbol neighbor for the plain identifiers. The corresponding
  // RefMint case changes one symbol WITHOUT recomputing its checksum.
  const typo = route === 'refmint' ? changedSymbol(original) : identifier(neighbor, route);
  return [
    { name: 'Exact', input: original, expected: 'found', intended: target.id },
    { name: 'Printed / pasted', input: `  ${identifier(target, route, true)}  `, expected: 'found', intended: target.id },
    { name: 'One-symbol change', input: typo, expected: route === 'refmint' ? 'invalid' : 'found', intended: target.id },
    { name: 'Truncated', input: original.slice(0, -1), expected: route === 'refmint' ? 'invalid' : domain === 'fleet' && route === 'existing' ? 'ambiguous' : 'not_found', intended: target.id },
    { name: 'Wrong record type', input: identifier(otherDomain, route), expected: route === 'refmint' ? 'invalid' : 'not_found' },
    { name: 'Valid but unknown', input: identifier(unknown, route), expected: 'not_found' },
    { name: 'Outside allowed scope', input: identifier(denied, route), expected: 'not_found' },
    { name: 'Another valid code', input: identifier(neighbor, route), expected: 'found', intended: target.id },
    { name: 'Empty', input: '', expected: 'invalid' }
  ];
}
