import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['../examples/browser/index.html', 'text/html; charset=utf-8']],
  ['/dist/index.js', ['../dist/index.js', 'text/javascript; charset=utf-8']],
  ['/dist/bech32m.js', ['../dist/bech32m.js', 'text/javascript; charset=utf-8']]
]);
for (const name of ['codec', 'presentation']) files.set(`/dist/${name}.js`, [`../dist/${name}.js`, 'text/javascript; charset=utf-8']);
for (const name of ['index.html', 'app.mjs', 'style.css', 'bech32-adapter.mjs', 'refmint-adapter.mjs', 'scenarios.mjs']) {
  const type = name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript';
  files.set('/comparison/' + (name === 'index.html' ? '' : name), [`../examples/comparison/${name}`, `${type}; charset=utf-8`]);
}
files.set('/docs/comparison.json', ['../docs/comparison.json', 'application/json; charset=utf-8']);
for (const [name, type] of [['index.html', 'text/html; charset=utf-8'], ['style.css', 'text/css; charset=utf-8'], ['app.mjs', 'text/javascript; charset=utf-8'], ['model.mjs', 'text/javascript; charset=utf-8'], ['sample-invoice.pdf', 'application/pdf']]) {
  files.set('/workflows/' + (name === 'index.html' ? '' : name), [`../examples/workflows/${name}`, type]);
}

export function createDemoServer() {
  return createServer(async (req, res) => {
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400).end('Bad request.'); return; }
    // Local, installed dev dependency; no CDN, eval or runtime package dependency.
    if (pathname === '/vendor/bech32.mjs' && req.method === 'GET') {
      try {
        const source = await readFile(new URL('../node_modules/bech32/dist/index.js', import.meta.url), 'utf8');
        const license = await readFile(new URL('../node_modules/bech32/LICENSE', import.meta.url), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(`/* ${license.replaceAll('*/', '* /')} */\nconst exports = {};\n${source}\nexport const bech32m = exports.bech32m;\n`);
      } catch { res.writeHead(500).end('Install development dependencies first.'); }
      return;
    }
    const entry = files.get(pathname);
    if (!entry || req.method !== 'GET') { res.writeHead(404).end(); return; }
    try {
      const data = await readFile(new URL(entry[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(500).end('Build the library with pnpm build first.'); }
  });
}
