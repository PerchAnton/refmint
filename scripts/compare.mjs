import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import { posix } from 'node:path';
import { bech32m } from 'bech32';
import { createRefMintAdapter } from '../examples/comparison/refmint-adapter.mjs';
import { createBech32Adapter } from '../examples/comparison/bech32-adapter.mjs';
import { scenarios, lookup, sampleUUID } from '../examples/comparison/scenarios.mjs';

const checking = process.argv.includes('--check');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const adapters = {};
for (const name of ['refmint', 'bech32']) {
  const file = `examples/comparison/${name}-adapter.mjs`;
  const source = await readFile(file, 'utf8');
  adapters[name] = { file, code_lines: source.split('\n').filter(line => line.trim() && !line.trimStart().startsWith('//')).length, bytes: Buffer.byteLength(source), sha256: hash(source) };
}
const runtime = (await readdir('dist')).filter(file => file.endsWith('.js')).sort().map(file => 'dist/' + file);
const loaded_code = {};
// Follow actual static module imports; never hide the complete root-entry cost.
async function imports(file, found = new Set()) {
  if (found.has(file)) return found;
  found.add(file);
  const source = await readFile(file, 'utf8');
  for (const [, dependency] of source.matchAll(/(?:import|export)[^;]*?from\s+['"]([^'"]+)['"]/g)) {
    assert.ok(dependency.startsWith('.'), 'Unexpected runtime dependency');
    await imports(posix.normalize(posix.join(posix.dirname(file), dependency)), found);
  }
  return found;
}
const codecRuntime = [...await imports('dist/codec.js')].sort();
for (const [name, files] of [['refmint', [...runtime, adapters.refmint.file]], ['refmint_codec', [...codecRuntime, adapters.refmint.file]], ['bech32', ['node_modules/bech32/dist/index.js', adapters.bech32.file]]]) {
  const entries = [];
  for (const file of files) { const bytes = await readFile(file); entries.push({ file, bytes: bytes.length, gzip_bytes: gzipSync(bytes).length, sha256: hash(bytes) }); }
  loaded_code[name] = { files: entries, bytes: entries.reduce((n, f) => n + f.bytes, 0), summed_gzip_bytes: entries.reduce((n, f) => n + f.gzip_bytes, 0) };
}
const results = [], lengths = [], jobs = [];
let mutationCount = 0;
const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
for (const kind of ['uint64', 'uuid']) {
  const a = createRefMintAdapter({ prefix: 'rma', kind });
  const b = createBech32Adapter(bech32m, { prefix: 'rma', kind });
  const value = kind === 'uint64' ? 123456n : sampleUUID;
  const id = a.encode(value);
  assert.equal(b.encode(value), id);
  lengths.push({ kind, original: String(value).length, refmint: id.length, bech32: id.length, printed: a.format(id).length });
  for (const s of scenarios(a, kind, bech32m)) {
    const left = lookup(a, s.input, kind), right = lookup(b, s.input, kind);
    assert.deepEqual(left, right, `${kind}: ${s.name}`);
    assert.equal(left.status, s.status);
    if (s.error) assert.equal(left.parsed.error, s.error);
    results.push({ kind, scenario: s.name, outcome: s.status, error: s.error ?? null, refmint_queries: left.queries, bech32_queries: right.queries });
    jobs.push([() => a.diagnose(s.input), () => b.diagnose(s.input)]);
  }
  for (let i = 0; i < id.length; i++) for (const c of i < 3 ? 'abcdefghijklmnopqrstuvwxyz' : i < 5 ? '' : alphabet) {
    if (id[i] === c) continue;
    const changed = id.slice(0, i) + c + id.slice(i + 1);
    assert.equal(a.diagnose(changed).ok, false);
    assert.equal(b.diagnose(changed).ok, false);
    mutationCount++;
  }
}
const facts = { adapters, loaded_code, lengths, scenarios: results,
  mutations: { tested_per_adapter: mutationCount, rejected_per_adapter: mutationCount,
    method: 'All alternative lowercase letters in rma, and all alternative alphabet symbols in data/checksum of two fixed fixtures. Underscore/separator and normalization excluded.' } };
if (checking) {
  const recorded = JSON.parse(await readFile('docs/comparison.json', 'utf8'));
  // Compressor output can differ between Node/zlib versions; verify source facts.
  const portable = value => JSON.parse(JSON.stringify(value, (key, item) => ['gzip_bytes', 'summed_gzip_bytes'].includes(key) ? undefined : item));
  for (const key of Object.keys(facts)) assert.deepEqual(portable(recorded[key]), portable(facts[key]), `Refresh pnpm compare: ${key}`);
  const optimization = JSON.parse(await readFile('docs/optimization.json', 'utf8'));
  assert.deepEqual(optimization.current.files, loaded_code.refmint.files.filter(f => f.file.startsWith('dist/')).map(f => ({ file: posix.basename(f.file), bytes: f.bytes, sha256: f.sha256 })), 'Refresh pnpm compare:previous: runtime changed');
  assert.equal(optimization.baseline.adapter_sha256, adapters.bech32.sha256, 'Previous comparison baseline changed');
  console.log(`PASS: ${results.length} shared scenarios and ${mutationCount} mutations per adapter; recorded sources and facts match.`);
} else {
  const iterations = 1000, rounds = 7;
  const timings = [[], []];
  for (let i = 0; i < 200; i++) for (const job of jobs) { job[0](); job[1](); }
  for (let round = 0; round < rounds; round++) for (const side of round % 2 ? [1, 0] : [0, 1]) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) for (const job of jobs) job[side]();
    timings[side].push(Math.round(jobs.length * iterations * 1000 / (performance.now() - start)));
  }
  const timing = samples => ({ ops_per_second: samples, median_ops_per_second: [...samples].sort((a, b) => a - b)[3] });
  const report = {
    generated_at: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model },
    baseline: 'bech32@2.0.0, Bech32m variant, independently implemented application adapter',
    ...facts,
    timing: { method: 'Seven alternating-order rounds, 200 warmup passes, 1000 passes per round through the same 28 cases. Diagnostic parsing only; no database, rendering or network.', refmint: timing(timings[0]), bech32: timing(timings[1]) },
    limits: [
      'This compares two implementations of the RefMint v1 contract, not every alternative ID scheme.',
      'Adapter lines exclude blank/comment lines, shared UI, fixtures and lookup; RefMint moves contract logic into its library. Line count alone is not a maintainability measure.',
      'refmint counts all emitted JS plus its adapter; refmint_codec follows the actual codec-only imports used by the form. No minification/tree shaking. RefMint JS omits implementation comments; source and declaration comments are preserved. Bech32 uses its shipped JS unchanged. Shared UI and browser-only CJS wrapper are excluded. gzip files are compressed separately and summed.',
      'Both use the same standard checksum and produce the same codes. Both reject the tested mutations.',
      'Lookup counts describe an in-memory example, not measured production database savings.',
      'No human study, adoption evidence or general speed advantage. Timing is machine-specific and input-mix-dependent.',
      'Sequential IDs remain recoverable. The checksum does not provide authentication or authorization.'
    ]
  };
  await writeFile('docs/comparison.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ adapters, lengths, scenarios: results.length, mutations: mutationCount, loaded_bytes: { refmint: loaded_code.refmint.bytes, bech32: loaded_code.bech32.bytes }, timing: report.timing }, null, 2));
}
