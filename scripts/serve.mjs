import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['../examples/browser/index.html', 'text/html; charset=utf-8']],
  ['/dist/index.js', ['../dist/index.js', 'text/javascript; charset=utf-8']],
  ['/dist/bech32m.js', ['../dist/bech32m.js', 'text/javascript; charset=utf-8']]
]);
const server = createServer(async (req, res) => {
  const entry = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!entry || req.method !== 'GET') { res.writeHead(404).end(); return; }
  try {
    const data = await readFile(new URL(entry[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(500).end('Build the library with pnpm build first.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('RefMint demo: http://127.0.0.1:4173'));
