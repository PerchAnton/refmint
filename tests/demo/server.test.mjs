import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import test, { before, after } from 'node:test';
import { createDemoServer } from '../../scripts/demo-server.mjs';

const server = createDemoServer();
before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

function get(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method, agent: false }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('Demo request timed out')));
    req.end();
  });
}

test('malformed URL returns 400 and the next request still succeeds', async () => {
  for (const path of ['//[', 'http://[']) assert.equal((await get(path)).status, 400);
  const page = await get('/');
  assert.equal(page.status, 200);
  assert.match(page.body, /RefMint/);
});

test('only demo assets are served, with correct types and no caching', async () => {
  for (const [path, type] of [['/?example=1', 'text/html'], ['/dist/index.js', 'text/javascript'], ['/dist/bech32m.js', 'text/javascript'], ['/dist/codec.js', 'text/javascript'], ['/dist/presentation.js', 'text/javascript'], ['/comparison/', 'text/html'], ['/comparison/app.mjs', 'text/javascript'], ['/comparison/style.css', 'text/css'], ['/vendor/bech32.mjs', 'text/javascript'], ['/docs/comparison.json', 'application/json']]) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.ok(response.headers['content-type'].startsWith(type));
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.ok(response.body.length > 0);
  }
  for (const path of ['/package.json', '/../package.json', '/%2e%2e/package.json', '/src/index.ts']) {
    assert.equal((await get(path)).status, 404);
  }
  assert.equal((await get('/', 'POST')).status, 404);
});
