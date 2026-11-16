import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStore, references, makeSession, start, search, finish, summarize, display, parse } from '../examples/order-pilot/model.mjs';

test('collision redraw and idempotency preserve one stored public reference', () => {
  const store = new OrderStore(); const first = references.generate(), second = references.generate();
  const a = store.create('alice', 'request-1', 'basket-1', () => first);
  let calls = 0; const b = store.create('alice', 'request-2', 'basket-2', () => ++calls === 1 ? first : second);
  assert.equal(calls, 2); assert.equal(b.reference, second); assert.notEqual(a.id, b.id);
  const replay = store.create('alice', 'request-2', 'basket-2', () => { throw new Error('must not allocate'); });
  assert.deepEqual(replay, b); assert.equal(store.size, 2);
  assert.throws(() => store.create('alice', 'request-2', 'different'), /idempotency conflict/);
});
test('exhausted collisions are bounded and never partially commit an order', () => {
  const store = new OrderStore(); const code = references.generate(); store.create('a', '1', 'basket', () => code);
  let attempts = 0; assert.throws(() => store.create('a', '2', 'basket', () => { attempts++; return code; }), /exhausted/);
  assert.equal(attempts, 8); assert.equal(store.size, 1);
  assert.throws(() => store.create('a', '3', 'basket', () => 'invalid'), /invalid generated/); assert.equal(store.size, 1);
});
test('a valid checksum never bypasses ownership; idempotency keys are scoped', () => {
  const store = new OrderStore(); const order = store.create('alice', 'request', 'basket');
  assert.equal(store.find('bob', order.reference), null); assert.deepEqual(store.find('alice', order.reference), order);
  const other = store.create('bob', 'request', 'basket'); assert.notEqual(other.id, order.id);
  order.basket = 'tampered'; assert.equal(store.find('alice', order.reference).basket, 'basket');
});
test('small-pilot alias and RefMint use 40 random bits with visible checksum overhead', () => {
  const s = makeSession('P-test', false, 7), record = s.tasks[0].record;
  assert.equal(record.alias.length, 8); assert.equal(references.plan.randomBits, 40);
  assert.equal(record.reference.length, 18); assert.equal(display('refmint', record).length, 21);
  assert.equal(display('alias', record).length, 9); assert.equal(display('uuid', record).length, 36);
  for (const route of ['uuid', 'alias', 'refmint']) assert.equal(parse(route, display(route, record)).ok, true);
  assert.equal(parse('alias', 'AB-CD-EFGH').ok, false); assert.equal(parse('refmint', 'Example order 01').ok, false);
});
test('randomized plan includes equal measured manual/paste counts and separate practices', () => {
  const a = makeSession('P-test', false, 7), b = makeSession('P-other', false, 7);
  assert.deepEqual(a.tasks.map(t => [t.route, t.mode]), b.tasks.map(t => [t.route, t.mode]));
  assert.equal(a.tasks.length, 15); assert.equal(a.tasks.filter(t => t.practice).length, 3);
  for (const route of ['uuid', 'alias', 'refmint']) for (const mode of ['manual', 'paste']) {
    assert.equal(a.tasks.filter(t => !t.practice && t.route === route && t.mode === mode).length, 2);
  }
  assert.equal(makeSession('P-test', true).tasks.length, 18);
});
test('practice alone is not a complete or eligible measured session', () => {
  const session = makeSession('P-test', false, 7);
  for (let i = 0; i < 3; i++) {
    const task = start(session, 0); search(session, display(task.route, task.record), 100); finish(session, 'confirm', 200);
  }
  assert.equal(session.state, 'ready'); assert.equal(session.results.length, 3);
  assert.equal(summarize(session).reduce((n, row) => n + row.eligible, 0), 0);
});
test('errors, wrong records, explicit confirmation and elapsed lookup time stay distinct', () => {
  const session = makeSession('P-test'); const task = start(session, 100);
  assert.throws(() => finish(session, 'confirm', 101), /look up/);
  assert.equal(search(session, task.record.label, 110).status, 'invalid');
  assert.equal(search(session, display(task.route, session.tasks[1].record), 120).status, 'found');
  finish(session, 'confirm', 130); const result = session.results[0];
  assert.equal(result.outcome, 'wrong-confirmation'); assert.equal(result.invalid, 1); assert.equal(result.wrongRecord, 1);
  assert.equal(result.firstCorrectMs, null); assert.equal(result.elapsedMs, 30);
});
test('interruptions and skipped tasks are excluded; timeouts remain failures', () => {
  const session = makeSession('P-test');
  for (let i = 0; i < 3; i++) { start(session, 0); finish(session, 'skip', 10); }
  start(session, 0); finish(session, 'interrupted', null);
  start(session, 0); finish(session, 'timeout', 90000);
  const rows = summarize(session); assert.equal(rows.reduce((n, r) => n + r.excluded, 0), 1);
  assert.equal(rows.reduce((n, r) => n + r.timeouts, 0), 1); assert.equal(rows.reduce((n, r) => n + r.success, 0), 0);
  assert.equal(session.results[3].elapsedMs, null);
});
test('paste-mode success without a paste is marked as a protocol deviation', () => {
  const session = makeSession('P-test');
  while (session.tasks[session.results.length].mode !== 'paste') { start(session, 0); finish(session, 'skip', 1); }
  const task = start(session, 0); search(session, display(task.route, task.record), 10); finish(session, 'confirm', 20);
  assert.equal(session.results.at(-1).eligible, false); assert.equal(session.results.at(-1).deviation, true);
});

test('pasting later cannot relabel an already typed lookup as a valid paste trial', () => {
  const session = makeSession('P-test');
  while (session.tasks[session.results.length].mode !== 'paste') { start(session, 0); finish(session, 'skip', 1); }
  const task = start(session, 0); search(session, display(task.route, task.record), 10);
  session.active.pastes = 1; search(session, display(task.route, task.record), 20); finish(session, 'confirm', 30);
  assert.equal(session.results.at(-1).eligible, false); assert.equal(session.results.at(-1).deviation, true);
});
