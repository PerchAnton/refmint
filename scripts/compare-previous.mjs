// Compare a built previous checkout, the current build and unchanged Bech32m
// in one process. Nothing is fetched or executed from GitHub by this command.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { bech32m } from 'bech32';
import * as current from '../dist/index.js';
import { createBech32Adapter } from '../examples/comparison/bech32-adapter.mjs';
import { scenarios } from '../examples/comparison/scenarios.mjs';

const previousDist = process.argv[2];
const revision = process.argv[3];
assert.ok(previousDist && /^[0-9a-f]{40}$/.test(revision ?? ''),
  'Usage: pnpm compare:previous /path/to/previous/dist FULL_COMMIT_SHA');
const previous = await import(pathToFileURL(resolve(previousDist, 'index.js')).href);
const report = JSON.parse(await readFile('docs/comparison.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function sources(directory) {
  return Promise.all((await readdir(directory)).filter(f => f.endsWith('.js')).sort().map(async name => {
    const bytes = await readFile(join(directory, name));
    return { file: name, bytes: bytes.length, sha256: hash(bytes) };
  }));
}
const jobs = [];
let comparisons = 0;
const countEqual = (a, b) => { assert.deepEqual(a, b); comparisons++; };
for (const kind of ['uint64', 'uuid']) {
  const options = { prefix: 'rma', kind };
  const before = previous.createReferenceCodec(options), after = current.createReferenceCodec(options);
  const baseline = createBech32Adapter(bech32m, options);
  for (const s of scenarios(after, kind, bech32m)) {
    countEqual(before.diagnose(s.input), after.diagnose(s.input));
    countEqual(baseline.diagnose(s.input), after.diagnose(s.input));
    jobs.push([() => before.diagnose(s.input), () => after.diagnose(s.input), () => baseline.diagnose(s.input)]);
  }
}

// Differential behavior, including the legacy API, malformed UTF-16, length
// limits and raw offsets. Seeded inputs are evidence, not production randomness.
let seed = 20261027;
const next = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const alphabets = ['\0\t\r\n -_1qpzry9x8gf2tvdw0s3jn54khce6mua7lABCDEFGHIJKLMNOPQRSTUVWXYZ', '😀Ké\ud800\udc00'];
for (const options of [{ prefix: 'rma', kind: 'uint64' }, { prefix: 'v111', kind: 'uuid' }, { prefix: 'ticket', randomLength: 26 }]) {
  const factory = options.kind ? 'createReferenceCodec' : 'createReferences';
  const a = previous[factory](options), b = current[factory](options);
  const parse = options.kind ? 'decode' : 'parse', strict = parse + 'Canonical';
  for (let i = 0; i < 3000; i++) {
    const bytes = createHash('sha256').update('optimization:' + i).digest();
    const hex = bytes.toString('hex').slice(0, 32);
    const value = options.kind === 'uint64' ? bytes.readBigUInt64BE() : hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
    const id = options.kind ? a.encode(value) : bech32m.encode(options.prefix, Array.from(bytes.subarray(0, 26), n => n & 31));
    if (options.kind) countEqual(a.encode(value), b.encode(value));
    countEqual(a.format(id), b.format(id));
    const form = i % 3 === 0 ? ' \t' + a.format(id).toUpperCase() + '\r\n' : id;
    const at = next() % (form.length + 1);
    const alphabet = alphabets[i % 2];
    const ch = alphabet[next() % alphabet.length];
    const inputs = [form, form.slice(0, at) + ch + form.slice(at + 1), form.slice(0, at), form + ' '.repeat(i % 129)];
    for (const input of inputs) for (const method of ['diagnose', parse, strict]) countEqual(a[method](input), b[method](input));
  }
  for (const input of [null, undefined, 1, 1n, {}, [], '\ud800', '\udc00', '😀K', ''.padEnd(129, 'q')]) {
    for (const method of ['diagnose', parse, strict]) countEqual(a[method](input), b[method](input));
  }
}

// A longer run of the same 28 cases. Rotate all three positions to avoid
// systematically giving one implementation the warmest or coolest CPU.
const iterations = 10000, rounds = 9, warmup = 1000;
const timings = [[], [], []];
let consumed = 0;
function run(side, passes) {
  for (let i = 0; i < passes; i++) for (const job of jobs) {
    const result = job[side]();
    consumed += result.ok ? result.id.length : result.error.length;
  }
}
for (let side = 0; side < 3; side++) run(side, warmup);
for (let round = 0; round < rounds; round++) for (let offset = 0; offset < 3; offset++) {
  const side = (round + offset) % 3;
  const start = performance.now();
  run(side, iterations);
  timings[side].push(Math.round(jobs.length * iterations * 1000 / (performance.now() - start)));
}
const summarize = samples => ({ ops_per_second: samples, median_ops_per_second: [...samples].sort((a, b) => a - b)[4] });
const evidence = {
  generated_at: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model },
  previous: { revision, files: await sources(previousDist) },
  current: { files: await sources('dist') },
  baseline: { package: 'bech32@2.0.0', adapter_sha256: report.adapters.bech32.sha256 },
  differential: { comparisons, method: '3000 seeded values per uint64/UUID/legacy factory, generated encodings, formatting, canonical/displayed/mutated/truncated/overlong inputs, all parse modes and raw diagnostics; plus non-string and malformed UTF-16 inputs.' },
  timing: { method: `${rounds} rotated-order rounds in one process, ${warmup} warmup passes per implementation, ${iterations} passes per round over the same ${jobs.length} scenarios. Results consumed; no I/O.`, previous: summarize(timings[0]), current: summarize(timings[1]), bech32: summarize(timings[2]), consumed },
  limits: ['One machine and one input distribution; not a browser, database or user study.', 'The main comparison retains its original shorter two-way timing method; its medians can differ from this three-way run.', 'Full-root and codec-only sizes are separate in comparison.json. JS comments were removed from RefMint outputs only; source/declaration docs and all APIs are retained.']
};
await writeFile('docs/optimization.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ comparisons, previous: evidence.timing.previous.median_ops_per_second, current: evidence.timing.current.median_ops_per_second, bech32: evidence.timing.bech32.median_ops_per_second }, null, 2));
