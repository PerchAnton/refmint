import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
// TypeScript does not remove outputs of deleted or renamed source files.
await rm(new URL('dist/', root), { recursive: true, force: true });
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('node_modules/typescript/bin/tsc', root)), '-p', 'tsconfig.json'
], { cwd: fileURLToPath(root), stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
