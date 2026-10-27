import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['../examples/browser/index.html', 'text/html; charset=utf-8']],
  ['/dist/index.js', ['../dist/index.js', 'text/javascript; charset=utf-8']],
  ['/dist/bech32m.js', ['../dist/bech32m.js', 'text/javascript; charset=utf-8']]
]);

export function createDemoServer() {
  return createServer(async (req, res) => {
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400).end('Bad request.'); return; }
    const entry = files.get(pathname);
    if (!entry || req.method !== 'GET') { res.writeHead(404).end(); return; }
    try {
      const data = await readFile(new URL(entry[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(500).end('Build the library with pnpm build first.'); }
  });
}
