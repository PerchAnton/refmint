import { bech32m } from '/vendor/bech32.mjs';
import { createRefMintAdapter } from './refmint-adapter.mjs';
import { createBech32Adapter } from './bech32-adapter.mjs';
import { scenarios, lookup, sampleUUID } from './scenarios.mjs';

const $ = selector => document.querySelector(selector);
let kind, adapters, cases;
const json = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() + 'n' : v, 2);
function message(result) {
  if (result.status === 'found') return 'Return found: received. The original database key was restored.';
  if (result.status === 'unknown') return 'Valid reference, but no matching return exists in this sample.';
  const { error, details } = result.parsed;
  if (error === 'character') return `Unsupported character at position ${details.positions.map(n => n + 1).join(', ')}. Compare with the original; nothing was corrected.`;
  if (error === 'length') return `Wrong payload length: expected ${details.expected}, received ${details.actual} (${details.unit}).`;
  if (error === 'prefix') return `This reference belongs to “${details.actual}”, not “${details.expected}”.`;
  if (error === 'version') return `Format version ${details.actual} is not supported. This form accepts version ${details.expected}.`;
  if (error === 'kind') return `This reference holds ${details.actual}; this form expects ${details.expected}.`;
  return {
    checksum: 'The typo check failed. Compare the entire reference with the original; the wrong position is not known.',
    case: 'Use all lowercase or all uppercase letters.',
    format: 'Check the prefix, separator and groups of four.',
    overflow: 'The encoded value is outside the supported ID range.',
    non_canonical: 'This code has an unsupported representation of the ID.',
    too_long: 'The input is too long. No lookup was made.',
    type: 'Enter a text reference.'
  }[error];
}
function compare() {
  for (const [name, adapter] of Object.entries(adapters)) {
    const result = lookup(adapter, $('#input').value, kind);
    $(`#${name}-result`).textContent = message(result);
    $(`#${name}-result`).dataset.state = result.status;
    $(`#${name}-queries`).textContent = `Lookup calls for this submission: ${result.queries}`;
    $(`#${name}-details`).textContent = json(result.parsed);
  }
}
function reset() {
  kind = $('#kind').value;
  adapters = { refmint: createRefMintAdapter({ prefix: 'rma', kind }), bech32: createBech32Adapter(bech32m, { prefix: 'rma', kind }) };
  cases = scenarios(adapters.refmint, kind, bech32m);
  const value = kind === 'uint64' ? 123456n : sampleUUID;
  const reference = adapters.refmint.encode(value);
  $('#original').textContent = String(value);
  $('#reference').textContent = adapters.refmint.format(reference).toUpperCase();
  $('#length').textContent = `${String(value).length} original characters → ${reference.length} canonical / ${adapters.refmint.format(reference).length} printed characters. Same length in both forms.`;
  $('#input').value = '';
  $('#matrix').replaceChildren();
  $('#matrix-status').textContent = 'Run the shared cases to compare outcomes.';
  for (const name of Object.keys(adapters)) {
    $(`#${name}-result`).textContent = 'Ready to check.';
    $(`#${name}-result`).dataset.state = 'idle';
    $(`#${name}-queries`).textContent = 'Lookup calls: 0';
    $(`#${name}-details`).textContent = '—';
  }
}
$('#kind').addEventListener('change', reset);
$('#compare').addEventListener('submit', event => { event.preventDefault(); compare(); });
for (const [id, name] of [['correct', 'Printed uppercase'], ['typo', 'Changed symbol'], ['illegal', 'Illegal character'], ['unknown', 'Valid but unknown']]) {
  $('#' + id).addEventListener('click', () => { $('#input').value = cases.find(s => s.name === name).input; compare(); });
}
$('#run').addEventListener('click', () => {
  $('#matrix').replaceChildren();
  let matched = 0;
  for (const s of cases) {
    const a = lookup(adapters.refmint, s.input, kind);
    const b = lookup(adapters.bech32, s.input, kind);
    const equal = json(a) === json(b);
    const expected = a.status === s.status && (!s.error || a.parsed.error === s.error);
    if (equal && expected) matched++;
    const row = document.createElement('tr');
    for (const text of [s.name, a.status === 'invalid' ? a.parsed.error : a.status, b.status === 'invalid' ? b.parsed.error : b.status, equal && expected ? 'Pass' : 'FAIL']) {
      const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
    }
    $('#matrix').append(row);
  }
  $('#matrix-status').textContent = `${matched}/${cases.length} scenarios match the expected outcome in both forms.`;
});
reset();
try {
  const response = await fetch('/docs/comparison.json');
  if (!response.ok) throw new Error('Evidence is not built. Run pnpm compare.');
  const report = await response.json();
  const code = report.loaded_code;
  $('#metrics').textContent = `Recorded ${report.generated_at.slice(0, 10)} on ${report.environment.node}. Adapter source: ${report.adapters.refmint.code_lines} RefMint lines, ${report.adapters.bech32.code_lines} Bech32m adapter lines (nonblank, noncomment). This form loads the codec-only RefMint import: ${code.refmint_codec.bytes} vs ${code.bech32.bytes} bytes including adapters; summed per-file gzip: ${code.refmint_codec.summed_gzip_bytes} vs ${code.bech32.summed_gzip_bytes} bytes. The complete RefMint root import is ${code.refmint.bytes} bytes. No minification or tree shaking; RefMint removes implementation comments from JS, retaining source/type documentation. Local median diagnostic checks/second: ${report.timing.refmint.median_ops_per_second} vs ${report.timing.bech32.median_ops_per_second}. Timings depend on the machine and input mix; gzip sums are not bundled transfer sizes.`;
} catch (error) { $('#metrics').textContent = error.message; }
