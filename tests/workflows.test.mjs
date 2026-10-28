import assert from 'node:assert/strict';
import test from 'node:test';
import { domains, routes, records, identifier, lookup, scenarios } from '../examples/workflows/model.mjs';

test('lookup alternatives preserve identifiers and scope across every case', () => {
  const before = JSON.stringify(records);
  for (const domain of domains) for (const route of routes) {
    for (const item of scenarios(domain, route)) assert.equal(lookup(domain, route, item.input).status, item.expected);
    const denied = records.find(r => r.domain === domain && r.owner === 'other-team');
    assert.deepEqual(lookup(domain, route, identifier(denied, route)), { status: 'not_found', queries: 1 });
    assert.equal(lookup(domain, route, identifier(denied, route), 'other-team').status, 'found');
  }
  assert.equal(JSON.stringify(records), before);
  assert.equal(records.find(r => r.domain === 'invoice').existing, 'INV-2026-000042');
});

test('checksum cannot authenticate or detect a different complete valid code', () => {
  for (const domain of domains) {
    const [, neighbor] = records.filter(r => r.domain === domain);
    assert.equal(lookup(domain, 'refmint', identifier(neighbor, 'refmint')).record.id, neighbor.id);
  }
});

test('existing hostname search can be more useful than an exact reference', () => {
  assert.deepEqual(lookup('fleet', 'existing', 'press'), { status: 'ambiguous', queries: 1, matches: 2 });
  assert.equal(lookup('fleet', 'refmint', 'press').status, 'invalid');
  assert.ok(identifier(records[0], 'refmint', true).length > identifier(records[0], 'alias').length);
});
