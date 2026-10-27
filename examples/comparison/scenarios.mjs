// Shared fixture construction and record lookup; neither adapter implements these.
export const sampleUUID = '550e8400-e29b-41d4-a716-446655440000';
export function scenarios(adapter, kind, bech32m) {
  const value = kind === 'uint64' ? 123456n : sampleUUID;
  const canonical = adapter.encode(value);
  const { prefix, words } = bech32m.decode(canonical);
  const bodyStart = canonical.lastIndexOf('1') + 1;
  const changed = canonical.slice(0, -1) + (canonical.endsWith('q') ? 'p' : 'q');
  return [
    { name: 'Canonical', input: canonical, status: 'found' },
    { name: 'Printed uppercase', input: adapter.format(canonical).toUpperCase(), status: 'found' },
    { name: 'Surrounding whitespace', input: ' \t' + adapter.format(canonical) + '\r\n', status: 'found' },
    { name: 'Changed symbol', input: changed, status: 'invalid', error: 'checksum' },
    { name: 'Illegal character', input: canonical.slice(0, bodyStart) + 'b' + canonical.slice(bodyStart + 1), status: 'invalid', error: 'character' },
    { name: 'Unicode lookalike', input: canonical.replace('r', 'ｒ'), status: 'invalid', error: 'character' },
    { name: 'Mixed case', input: 'R' + canonical.slice(1), status: 'invalid', error: 'case' },
    { name: 'Broken grouping', input: canonical + '-', status: 'invalid', error: 'format' },
    { name: 'Wrong namespace', input: bech32m.encode('doc_', words), status: 'invalid', error: 'prefix' },
    { name: 'Unknown version', input: bech32m.encode(prefix, [2, ...words.slice(1)]), status: 'invalid', error: 'version' },
    { name: 'Wrong value kind', input: bech32m.encode(prefix, [1, kind === 'uint64' ? 1 : 0, ...words.slice(2)]), status: 'invalid', error: 'kind' },
    { name: 'Missing payload', input: bech32m.encode(prefix, [1, words[1]]), status: 'invalid', error: 'length' },
    { name: 'Overflow', input: bech32m.encode(prefix, [1, words[1], kind === 'uint64' ? 16 : 8, ...Array(kind === 'uint64' ? 12 : 25).fill(0)]), status: 'invalid', error: 'overflow' },
    { name: 'Valid but unknown', input: adapter.encode(kind === 'uint64' ? 999999n : sampleUUID.slice(0, -1) + '1'), status: 'unknown' }
  ];
}

export function lookup(adapter, input, kind) {
  const parsed = adapter.diagnose(input);
  if (!parsed.ok) return { status: 'invalid', queries: 0, parsed };
  const original = kind === 'uint64' ? 123456n : sampleUUID;
  return { status: parsed.value === original ? 'found' : 'unknown', queries: 1, parsed };
}
