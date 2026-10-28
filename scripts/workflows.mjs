import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { domains, routes, records, identifier, lookup, scenarios } from '../examples/workflows/model.mjs';

const root = new URL('../', import.meta.url);
const rows = [];
for (const domain of domains) for (const route of routes) for (const scenario of scenarios(domain, route)) {
  const result = lookup(domain, route, scenario.input);
  assert.equal(result.status, scenario.expected, `${domain}/${route}/${scenario.name}`);
  rows.push({ domain, route, case: scenario.name, input: scenario.input, ...result,
    different_record: result.status === 'found' && scenario.intended !== undefined && result.record.id !== scenario.intended });
}
const lengths = domains.flatMap(domain => routes.map(route => {
  const record = records.find(r => r.domain === domain);
  return { domain, route, canonical: identifier(record, route).length, printed: identifier(record, route, true).length };
}));
const sources = ['examples/workflows/model.mjs', 'scripts/workflows.mjs', 'dist/codec.js', 'dist/presentation.js', 'dist/bech32m.js'];
const hashes = {};
for (const path of sources) hashes[path] = createHash('sha256').update((await readFile(new URL(path, root), 'utf8')).replaceAll('\r\n', '\n')).digest('hex');
const evidence = { schema: 1, recorded: '2026-10-28', sample: 'synthetic local fixtures, not production support cases',
  measured: 'logical lookup calls and identifier lengths, not latency or human error rates', sources: hashes, lengths, rows };
const invoice = records.find(r => r.domain === 'invoice');
const pdfData = { invoice_number: invoice.existing, database_id: invoice.id, alias: invoice.alias,
  reference: identifier(invoice, 'refmint', true), lookup_url: 'http://127.0.0.1:4173/workflows/',
  warning: 'DEMONSTRATION ONLY - NOT A TAX INVOICE' };
const outputs = new Map([
  ['docs/workflows.json', JSON.stringify(evidence, null, 2) + '\n'],
  ['examples/workflows/invoice-data.json', JSON.stringify(pdfData, null, 2) + '\n']
]);
const table = ['# Local lookup results', '', 'Synthetic fixtures, recorded 28 October 2026. No production support cases or human timing data.', '',
  '| Domain | Route | Canonical characters | Printed characters |', '| --- | --- | ---: | ---: |',
  ...lengths.map(r => `| ${r.domain} | ${r.route} | ${r.canonical} | ${r.printed} |`), '',
  '| Domain | Route | Case | Result | Logical lookups | Different record from intended? |', '| --- | --- | --- | --- | ---: | --- |',
  ...rows.map(r => `| ${r.domain} | ${r.route} | ${r.case} | ${r.status}${r.reason ? ` (${r.reason})` : ''} | ${r.queries} | ${r.different_record ? 'yes' : 'no'} |`), '',
  'A valid code for another record still passes its checksum. Scope restrictions apply equally to all routes.',
  'The one-symbol cases were selected to expose a failure mode, not sampled to estimate its frequency.', ''].join('\n');
outputs.set('docs/workflow-results.md', table);
for (const [path, content] of outputs) {
  const url = new URL(path, root);
  if (process.argv.includes('--check')) assert.equal((await readFile(url, 'utf8')).replaceAll('\r\n', '\n'), content, `stale ${path}`);
  else await writeFile(url, content);
}
console.log(`${rows.length} fixture cases checked; ${fileURLToPath(new URL('docs/workflows.json', root))}`);
