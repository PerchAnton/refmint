// Exercise the distributable, rather than importing from this checkout's dist/.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const manager = process.env.npm_execpath;
assert.ok(manager, 'Run this check with pnpm test:package');
const temp = await mkdtemp(join(tmpdir(), 'refmint-package-'));
let stale;
function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: process.env, timeout: 120000 });
  if (result.status !== 0) throw new Error(`${script} failed:\n${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
}
try {
  const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const packs = join(temp, 'packs');
  await mkdir(packs);
  // A previous build may have emitted a module that has since been deleted.
  await mkdir(join(root, 'dist'), { recursive: true });
  stale = await mkdtemp(join(root, 'dist', 'refmint-stale-'));
  await writeFile(join(stale, 'removed-module.js'), '// Synthetic old build output.\n');
  run(manager, ['pack', '--pack-destination', packs], root);
  await assert.rejects(readFile(join(stale, 'removed-module.js')), { code: 'ENOENT' });
  const archives = (await readdir(packs)).filter(file => file.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const consumer = join(temp, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'refmint-package-check', private: true, type: 'module', packageManager: source.packageManager,
    dependencies: { refmint: 'file:' + join(packs, archives[0]).replaceAll('\\', '/') }
  }));
  // Offline + a fresh store: any accidental runtime dependency fails this check.
  run(manager, ['install', '--offline', '--ignore-scripts', '--no-frozen-lockfile', '--store-dir', join(temp, 'store')], consumer);
  const installed = join(consumer, 'node_modules', 'refmint');
  const packaged = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(packaged.version, source.version);
  assert.equal(packaged.publishConfig.tag, 'alpha');
  assert.deepEqual(packaged.dependencies ?? {}, {});
  const files = await readdir(installed, { recursive: true });
  assert.deepEqual((await readdir(join(installed, 'dist'))).sort(),
    ['bech32m.d.ts', 'bech32m.js', 'codec.d.ts', 'codec.js', 'index.d.ts', 'index.js', 'presentation.d.ts', 'presentation.js'], 'Unexpected build output in the archive');
  assert.ok(!files.some(file => /(^|[/\\])(src|tests|scripts|\.github|node_modules)([/\\]|$)/.test(file)));
  for (const name of ['dist/index.js', 'dist/index.d.ts', 'dist/bech32m.js', 'SPEC.md', 'LICENSE-MIT', 'LICENSE-APACHE', 'THIRD_PARTY_NOTICES.md']) {
    assert.ok((await readFile(join(installed, name))).length > 0, name);
  }
  assert.match(await readFile(join(installed, 'dist/index.d.ts'), 'utf8'), /A validated canonical reference/, 'Retain declaration documentation');
  const evidence = JSON.parse(await readFile(join(installed, 'docs/evidence.json'), 'utf8'));
  assert.equal(evidence.version, source.version, 'Refresh evidence for this version');
  assert.deepEqual(evidence.size.files.map(file => file.file).sort(), (await readdir(join(installed, 'dist'))).filter(file => file.endsWith('.js')).map(file => 'dist/' + file).sort());
  for (const file of evidence.size.files) {
    const bytes = await readFile(join(installed, file.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, 'Runtime changed: regenerate evidence');
    assert.equal(bytes.length, file.bytes);
  }
  // Markdown links/images must remain usable when read from the installed package.
  for (const file of files.filter(file => file.endsWith('.md'))) {
    const markdown = await readFile(join(installed, file), 'utf8');
    for (const [, target] of markdown.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^(?:[a-z][\w+.-]*:|#)/i.test(target)) continue;
      const path = resolve(dirname(join(installed, file)), target.split('#')[0]);
      assert.ok((await readFile(path)).length > 0, `${file} -> ${target}`);
    }
  }
  await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { createReferences, createReferenceCodec, planReferences, collisionProbability } from 'refmint';
import { createReferenceCodec as standalone } from 'refmint/codec';
assert.equal(standalone, createReferenceCodec);
const refs = createReferences({prefix:'ticket', expectedCount:1000000, maxCollisionProbability:1e-9});
const id = refs.generate();
assert.equal(refs.parse(refs.format(id).toUpperCase()).id, id);
assert.equal(refs.parseCanonical(refs.format(id)).error, 'non_canonical');
assert.equal(refs.parse(id.toUpperCase().replace('K', '\\u212a')).error, 'character');
assert.equal(planReferences({prefix:'ticket'}).randomBits, 130);
assert.ok(collisionProbability(14, 1000000) < 1e-9);
const codec = createReferenceCodec({prefix:'rma',kind:'uint64',version:1});
const encoded = codec.encode(9007199254740993n);
assert.equal(codec.decode(codec.format(encoded).toUpperCase()).value, 9007199254740993n);
assert.equal(codec.diagnose(encoded.replace('r', '\\uff52')).details.positions[0], 0);
assert.equal(refs.parse(encoded).ok, false);
await assert.rejects(import('refmint/dist/bech32m.js'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
`);
  run(join(consumer, 'smoke.mjs'), [], consumer);
  await writeFile(join(consumer, 'types.mts'), `
import { createReferences, createReferenceCodec, type Reference } from 'refmint';
import { createReferenceCodec as standalone, type EncodedReference } from 'refmint/codec';
const standaloneId: EncodedReference<'rma', 'uint64'> = standalone({prefix:'rma',kind:'uint64'}).encode(42n);
createReferenceCodec({prefix:'rma',kind:'uint64'}).format(standaloneId);
const docs = createReferences({prefix:'doc'});
const ticket: Reference<'ticket'> = createReferences({prefix:'ticket'}).generate();
// @ts-expect-error The installed declarations must retain namespace branding.
docs.format(ticket);
// @ts-expect-error An unvalidated string is not a reference.
docs.format('anything');
const result = docs.parse('anything');
if (result.ok) docs.format(result.id);
const numbers = createReferenceCodec({prefix:'rma',kind:'uint64'});
const uuid = createReferenceCodec({prefix:'rma',kind:'uuid'});
const n = numbers.encode(1n);
// @ts-expect-error Codec kinds must not be mixed in the installed declarations.
uuid.format(n);
// @ts-expect-error uint64 never accepts a floating-point number.
numbers.encode(1);
const decoded = numbers.decode(n);
if (decoded.ok) { const original: bigint = decoded.value; void original; }
`);
  run(join(root, 'node_modules/typescript/bin/tsc'), ['--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'types.mts'], consumer);
  console.log(`PASS: ${source.name}@${source.version} archive installs offline; ESM, types, documentation and licenses are intact.`);
} finally {
  if (stale) await rm(stale, { recursive: true, force: true });
  await rm(temp, { recursive: true, force: true });
}
