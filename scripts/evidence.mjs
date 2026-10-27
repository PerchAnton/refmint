import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { bech32m } from 'bech32';
import { createReferences, collisionProbability } from '../dist/index.js';

const refs = createReferences({ prefix: 'ticket', expectedCount: 1_000_000, maxCollisionProbability: 1e-9 });
const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
let mutations = 0;
for (const length of [8, 14, 26, 64]) {
  const factory = createReferences({ prefix: 'ticket', randomLength: length });
  const id = bech32m.encode('ticket', Array.from({ length }, (_, i) => i % 32));
  assert.equal(factory.parseCanonical(id).ok, true);
  for (let i = 7; i < id.length; i++) {
    for (const c of alphabet) {
      if (c === id[i]) continue;
      assert.equal(factory.parseCanonical(id.slice(0, i) + c + id.slice(i + 1)).ok, false);
      mutations++;
    }
  }
}
const sample = refs.generate();
const displayed = refs.format(sample).toUpperCase();
function measure(operation, iterations = 20000) {
  for (let i = 0; i < 2000; i++) operation();
  const samples = [];
  for (let round = 0; round < 7; round++) {
    const started = performance.now();
    for (let i = 0; i < iterations; i++) operation();
    samples.push(iterations * 1000 / (performance.now() - started));
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return { iterations, rounds: 7, warmup: 2000, ops_per_second: samples.map(Math.round), median_ops_per_second: Math.round(sorted[3]) };
}
const sizes = [];
for (const file of (await readdir('dist')).filter(name => name.endsWith('.js')).sort().map(name => 'dist/' + name)) {
  const bytes = await readFile(file);
  sizes.push({ file, bytes: bytes.length, gzip_bytes: gzipSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const evidence = {
  generated_at: new Date().toISOString(), version: pkg.version,
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model },
  runtime_dependencies: Object.keys(pkg.dependencies ?? {}).length,
  plan: refs.plan,
  mutations: { method: 'All 31 alternative alphabet characters at every payload/checksum position of four fixed fixtures; prefix ticket, payload lengths 8/14/26/64. Normalization changes excluded.', tested: mutations, rejected: mutations },
  size: { method: 'All emitted JavaScript, implementation comments removed but not minified; source and declaration documentation retained. gzip sizes are compressed per file and then summed; not a bundled transfer measurement.', files: sizes, total_bytes: sizes.reduce((n, s) => n + s.bytes, 0), summed_gzip_bytes: sizes.reduce((n, s) => n + s.gzip_bytes, 0) },
  timings: { method: 'Single process, seven rounds after warmup; no competitor comparison. Generation includes Web Crypto and checksum; parsing includes checksum and normalization.', generate: measure(() => refs.generate()), parse_displayed: measure(() => refs.parse(displayed)) },
  collision_model: [8, 14, 26].map(length => ({ random_length: length, count: 1_000_000, birthday_approximation: collisionProbability(length, 1_000_000) })),
  limits: ['Finite mutation fixtures are not a proof of every checksum property.', 'No user study, adoption claim or measured reduction in support time.', 'Timing results are machine-specific; generation and parse do different work.', 'Collision calculations assume uniform independent sampling; enforce uniqueness in storage.']
};
await mkdir('docs/assets', { recursive: true });
await writeFile('docs/evidence.json', JSON.stringify(evidence, null, 2) + '\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="410" viewBox="0 0 1000 410" role="img" aria-labelledby="title desc">
<title id="title">RefMint alpha: measured checks and reference lifecycle</title>
<desc id="desc">Zero runtime dependencies. The one-million-reference example uses 14 random characters and six checksum characters. All ${mutations} tested single-symbol substitutions were rejected. Tests do not establish a human error rate.</desc>
<rect width="1000" height="410" rx="20" fill="#102d27"/>
<g font-family="system-ui, sans-serif"><text x="36" y="45" fill="#9ee3bb" font-size="16" font-weight="700" letter-spacing="2">REFMINT / ALPHA EVIDENCE</text>
<text x="36" y="82" fill="#fff" font-size="27" font-weight="700">Make a reference. Catch a typo. Keep one storage key.</text>
${[[36,'0','runtime dependencies'],[278,'14 + 6','random + check symbols'],[520,mutations.toLocaleString('en-US'),'mutations rejected'],[762,Math.round(evidence.size.total_bytes / 1024 * 10) / 10 + ' KiB','emitted JavaScript']].map(([x,big,small])=>`<rect x="${x}" y="113" width="202" height="107" rx="12" fill="#204238"/><text x="${Number(x)+18}" y="160" fill="#b5f5ca" font-size="34" font-weight="700">${big}</text><text x="${Number(x)+18}" y="192" fill="#d3e4d8" font-size="14">${small}</text>`).join('')}
${['Generate','Format for display','Parse &amp; check','Authorized lookup'].map((s,i)=>`<rect x="${36+i*242}" y="250" width="202" height="49" rx="8" fill="#eff6ed"/><text x="${137+i*242}" y="280" text-anchor="middle" fill="#173c2c" font-size="15" font-weight="600">${s}</text>${i<3?`<text x="${249+i*242}" y="282" fill="#9ee3bb" font-size="24">→</text>`:''}`).join('')}
<text x="36" y="335" fill="#d3e4d8" font-size="14">14 random symbols: plan for 1 million codes with collision bound ≤ 10⁻⁹; default is 26.</text>
<text x="36" y="360" fill="#d3e4d8" font-size="14">${mutations} finite substitutions tested. No human-error-rate or speed advantage claimed.</text>
<text x="36" y="385" fill="#94b6a4" font-size="12">Reproduce: pnpm check &amp;&amp; pnpm evidence · ${evidence.generated_at.slice(0,10)} · Source: docs/evidence.json</text></g></svg>`;
await writeFile('docs/assets/evidence.svg', svg + '\n');
console.log(JSON.stringify({ mutations, runtime_dependencies: evidence.runtime_dependencies, size: evidence.size, timings: evidence.timings }, null, 2));
