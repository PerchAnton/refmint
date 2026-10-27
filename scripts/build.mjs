import { rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url);
// TypeScript does not remove outputs of deleted or renamed source files.
await rm(new URL('dist/', root), { recursive: true, force: true });
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('node_modules/typescript/bin/tsc', root)), '-p', 'tsconfig.json'
], { cwd: fileURLToPath(root), stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
// Strip implementation comments from JS only. Keep authored source and JSDoc
// in .d.ts; no minification, renamed symbols, dependency or runtime helper.
if (result.status === 0) {
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  for (const name of await readdir(new URL('dist/', root))) {
    if (!name.endsWith('.js')) continue;
    const path = new URL('dist/' + name, root);
    const source = ts.createSourceFile(name, await readFile(path, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    await writeFile(path, printer.printFile(source));
  }
}
