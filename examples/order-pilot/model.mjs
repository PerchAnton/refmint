import { createReferences } from '../../dist/index.js';

// Persist this configuration alongside stored references. Forty bits is a small
// experiment budget, not a production recommendation for a large order database.
export const references = createReferences({ prefix: 'ord', randomLength: 8 });
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function alias() {
  return [...crypto.getRandomValues(new Uint8Array(8))].map(byte => crockford[byte & 31]).join('');
}
export function display(route, record) {
  return route === 'refmint' ? references.format(record.reference)
    : route === 'alias' ? `${record.alias.slice(0, 4)}-${record.alias.slice(4)}` : record.id;
}
export function parse(route, input) {
  if (typeof input !== 'string' || input.length > 200) return { ok: false, error: 'length' };
  if (route === 'refmint') return references.parse(input);
  if (route === 'uuid') {
    const id = input.trim().toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
      ? { ok: true, id } : { ok: false, error: 'format' };
  }
  if (route !== 'alias') throw new Error('unknown route');
  const value = input.trim().toUpperCase();
  const valid = /^[0-9A-HJKMNP-TV-Z]{8}$/.test(value) || /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(value);
  return valid ? { ok: true, id: value.replace('-', '') } : { ok: false, error: 'format' };
}

// In-memory model of server invariants. In production these Maps must become
// transactional unique indexes; this synchronous model does not prove DB concurrency.
export class OrderStore {
  #orders = new Map();
  #references = new Map();
  #requests = new Map();
  create(subject, key, basket, generate = () => references.generate()) {
    if (!subject || !key || !basket || typeof subject !== 'string' || typeof key !== 'string' || typeof basket !== 'string') throw new Error('authenticated subject, idempotency key and basket required');
    const request = JSON.stringify([subject, key]);
    const prior = this.#requests.get(request);
    if (prior) {
      if (prior.basket !== basket) throw new Error('idempotency conflict');
      return structuredClone(this.#orders.get(prior.id));
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const reference = generate();
      if (!references.parseCanonical(reference).ok) throw new Error('invalid generated reference');
      if (this.#references.has(reference)) continue;
      const order = { id: crypto.randomUUID(), subject, basket, reference };
      this.#orders.set(order.id, order); this.#references.set(reference, order.id);
      this.#requests.set(request, { id: order.id, basket });
      return structuredClone(order);
    }
    throw new Error('reference allocation exhausted');
  }
  find(subject, reference) {
    const parsed = references.parse(reference);
    if (!parsed.ok) return null;
    const order = this.#orders.get(this.#references.get(parsed.id));
    return order?.subject === subject ? structuredClone(order) : null;
  }
  get size() { return this.#orders.size; }
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function seeded(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6d2b79f5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeSession(participant, spoken = false, seed = crypto.getRandomValues(new Uint32Array(1))[0]) {
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(participant)) throw new Error('use a participant code, not a name/email');
  const routes = ['uuid', 'alias', 'refmint']; const random = seeded(seed);
  const practice = routes.map(route => ({ route, mode: 'manual', practice: true }));
  const main = [];
  for (const mode of ['manual', 'paste']) for (const route of routes) for (let repeat = 0; repeat < 2; repeat++) main.push({ route, mode, practice: false });
  if (spoken) for (const route of routes) main.push({ route, mode: 'spoken', practice: false });
  const used = new Set();
  const tasks = [...shuffle(practice, random), ...shuffle(main, random)].map((task, index) => {
    let reference, short;
    do { reference = references.generate(); } while (used.has(reference)); used.add(reference);
    do { short = alias(); } while (used.has(short)); used.add(short);
    return { ...task, taskId: `t${index + 1}`, record: { id: crypto.randomUUID(), reference, alias: short,
      label: `Example order ${String(index + 1).padStart(2, '0')}`, product: ['Notebook', 'Mug', 'Bag'][index % 3] } };
  });
  return { schema: 1, protocol: 'order-lookup-pilot-v1', participant, seed, createdAt: new Date().toISOString(),
    referenceConfig: { prefix: 'ord', randomLength: 8, randomBits: 40, checksumSymbols: 6 },
    tasks, results: [], active: null, state: 'ready', feedback: '', provenance: 'participant-operated-browser' };
}
export function start(session, now) {
  if (!Number.isFinite(now)) throw new Error('finite monotonic time required');
  if (session.active || session.results.length >= session.tasks.length) throw new Error('cannot start');
  const task = session.tasks[session.results.length];
  session.active = { taskId: task.taskId, startedMs: now, startedAt: new Date().toISOString(), attempts: 0,
    invalid: 0, notFound: 0, wrongRecord: 0, firstCorrectMs: null, pastes: 0, blockedPastes: 0, copyActions: 0,
    deviation: false, found: null };
  session.state = 'active'; return task;
}
export function search(session, input, now) {
  if (!session.active) throw new Error('no active task');
  if (!Number.isFinite(now) || now < session.active.startedMs) throw new Error('invalid monotonic time');
  const active = session.active, task = session.tasks[session.results.length]; active.attempts++;
  const parsed = parse(task.route, input);
  active.found = null;
  if (!parsed.ok) { active.invalid++; return { status: 'invalid', error: parsed.error }; }
  const key = task.route === 'uuid' ? 'id' : task.route === 'alias' ? 'alias' : 'reference';
  const record = session.tasks.find(t => t.record[key] === parsed.id)?.record;
  if (!record) { active.notFound++; return { status: 'not-found' }; }
  active.found = record.id;
  if (record.id !== task.record.id) active.wrongRecord++;
  else active.firstCorrectMs ??= Math.max(0, now - active.startedMs);
  return { status: 'found', record };
}
export function finish(session, outcome, now) {
  if (!session.active) throw new Error('no active task');
  if (!['confirm', 'timeout', 'skip', 'interrupted'].includes(outcome)) throw new Error('invalid outcome');
  const active = session.active, task = session.tasks[session.results.length];
  if (!(now === null && outcome === 'interrupted') && (!Number.isFinite(now) || now < active.startedMs)) throw new Error('invalid monotonic time');
  if (outcome === 'confirm' && active.found === null) throw new Error('look up a record before confirming');
  const result = outcome === 'confirm' ? active.found === task.record.id ? 'success' : 'wrong-confirmation' : outcome;
  if (task.mode === 'paste' && active.pastes === 0 && result === 'success') active.deviation = true;
  const { found, startedMs, ...observed } = active;
  session.results.push({ ...observed, route: task.route, mode: task.mode, practice: task.practice, outcome: result,
    elapsedMs: now === null ? null : now - startedMs, printedCharacters: display(task.route, task.record).length,
    eligible: !task.practice && !active.deviation && !['skip', 'interrupted'].includes(result) });
  session.active = null;
  session.state = session.results.length === session.tasks.length ? 'complete' : 'ready';
}
export function summarize(session) {
  return ['manual', 'paste', 'spoken'].flatMap(mode => ['uuid', 'alias', 'refmint'].map(route => {
    const all = session.results.filter(r => !r.practice && r.route === route && r.mode === mode);
    const eligible = all.filter(r => r.eligible), successful = eligible.filter(r => r.outcome === 'success');
    const times = successful.map(r => r.elapsedMs).sort((a, b) => a - b), middle = Math.floor(times.length / 2);
    const medianMs = !times.length ? null : times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
    return { mode, route, completed: all.length, eligible: eligible.length, success: successful.length,
      medianSuccessMs: medianMs, errors: eligible.reduce((n, r) => n + r.invalid + r.notFound + r.wrongRecord, 0),
      timeouts: eligible.filter(r => r.outcome === 'timeout').length,
      wrongConfirmations: eligible.filter(r => r.outcome === 'wrong-confirmation').length, excluded: all.length - eligible.length };
  }));
}
