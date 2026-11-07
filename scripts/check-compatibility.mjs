// Compare published releases with the exact archive under review, not checkout imports.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const manager = process.env.npm_execpath;
assert.ok(manager, 'Run with pnpm test:compatibility');
assert.ok(process.argv.length <= 3, 'Usage: pnpm test:compatibility [candidate.tgz]');
const temp = await mkdtemp(join(tmpdir(), 'refmint-compatibility-'));
function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd, encoding: 'utf8', env: process.env, timeout: 120000
  });
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
  return result.stdout;
}
try {
  const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const pins = JSON.parse(await readFile(join(root, 'tests/fixtures/historical-releases.json'), 'utf8'));
  const frozen = await readFile(join(root, 'tests/fixtures/formats-v1.json'));
  assert.equal(createHash('sha256').update(frozen).digest('hex'), pins.formatsV1Sha256,
    'The historical format vectors must not change');
  let candidate = process.argv[2] && resolve(process.argv[2]);
  if (!candidate) {
    const packs = join(temp, 'packs');
    await mkdir(packs);
    run(manager, ['pack', '--pack-destination', packs], root);
    const archives = (await readdir(packs)).filter(name => name.endsWith('.tgz'));
    assert.equal(archives.length, 1);
    candidate = join(packs, archives[0]);
  }
  const dependencies = { refmint: 'file:' + candidate.replaceAll('\\', '/') };
  const archives = [{ alias: 'refmint', version: source.version,
    sha512: createHash('sha512').update(await readFile(candidate)).digest('base64') }];
  assert.deepEqual(pins.releases.map(x => [x.alias, x.version]),
    [['refmint-alpha3', '0.1.0-alpha.3'], ['refmint-beta2', '0.1.0-beta.2']]);
  for (const release of pins.releases) {
    assert.equal(release.tarball, `https://registry.npmjs.org/refmint/-/refmint-${release.version}.tgz`);
    const response = await fetch(release.tarball, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `${release.version}: HTTP ${response.status}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      assert.ok(size <= 1024 * 1024, 'Historical archive exceeds the one MiB bound');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    const digest = createHash('sha512').update(bytes).digest('base64');
    assert.equal('sha512-' + digest, release.integrity, `${release.version}: archive integrity mismatch`);
    const file = join(temp, `${release.alias}.tgz`);
    await writeFile(file, bytes);
    dependencies[release.alias] = 'file:' + file.replaceAll('\\', '/');
    archives.push({ alias: release.alias, version: release.version, sha512: digest });
  }
  const consumer = join(temp, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'refmint-compatibility-consumer', private: true, type: 'module',
    packageManager: source.packageManager, dependencies
  }));
  // The only network inputs are the two pinned, verified archives above.
  // A fresh offline store also rejects an accidental runtime dependency.
  run(manager, ['install', '--offline', '--ignore-scripts', '--no-frozen-lockfile', '--store-dir', join(temp, 'store')], consumer);
  for (const archive of archives) {
    const manifest = JSON.parse(await readFile(join(consumer, 'node_modules', archive.alias, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'refmint');
    assert.equal(manifest.version, archive.version, `${archive.alias}: wrong installed version`);
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      assert.deepEqual(manifest[field] ?? {}, {}, `${archive.alias}: unexpected ${field}`);
    }
    assert.equal(manifest.type, 'module');
    assert.equal(manifest.engines.node, '>=22');
    assert.equal(manifest.sideEffects, false);
    assert.deepEqual(manifest.exports, {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './codec': { types: './dist/codec.d.ts', import: './dist/codec.js' }
    });
  }
  await writeFile(join(consumer, 'formats-v1.json'), frozen);
  for (const name of ['billetsys-v1.json', 'compatibility-invalid-v1.json']) {
    await copyFile(join(root, 'tests/fixtures', name), join(consumer, name));
  }
  await copyFile(join(root, 'tests/compatibility/runtime.mjs'), join(consumer, 'runtime.mjs'));
  const types = await readFile(join(root, 'tests/compatibility/types.mts'), 'utf8');
  const typeFiles = [];
  for (const { alias } of archives) {
    const name = `${alias}.mts`;
    await writeFile(join(consumer, name), types.replaceAll("'refmint", "'" + alias));
    typeFiles.push(name);
  }
  // Compile the same consumer against each published declaration surface and the candidate.
  run(join(root, 'node_modules/typescript/bin/tsc'), [
    '--noEmit', '--strict', '--exactOptionalPropertyTypes', '--noUncheckedIndexedAccess',
    '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', ...typeFiles
  ], consumer);
  console.log(run(join(consumer, 'runtime.mjs'), [], consumer));
  console.log('PASS: installed alpha.3, beta.2 and candidate API/types; all 9 writer/reader pairs.');
  console.log('Verified archives: ' + JSON.stringify(archives));
} finally {
  await rm(temp, { recursive: true, force: true });
}
