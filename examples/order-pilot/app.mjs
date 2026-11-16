import { makeSession, display, start, search, finish, summarize } from './model.mjs';
const $ = id => document.getElementById(id);
const storageKey = 'refmint-order-pilot-v1';
let session, interval;
function persist() { localStorage.setItem(storageKey, JSON.stringify(session)); }
function showResults() {
  $('result').hidden = false; $('summary').replaceChildren();
  for (const row of summarize(session).filter(row => row.completed)) {
    const tr = document.createElement('tr');
    for (const value of [row.mode, row.route, `${row.success} / ${row.eligible}`, row.medianSuccessMs === null ? '—' : (row.medianSuccessMs / 1000).toFixed(1), row.errors, row.timeouts, row.wrongConfirmations, row.excluded]) {
      const td = document.createElement('td'); td.textContent = String(value); tr.append(td);
    }
    $('summary').append(tr);
  }
  $('scope').textContent = `${session.results.length} of ${session.tasks.length} tasks recorded. ${session.state === 'complete' ? 'Session complete.' : 'Partial results.'} Practice is excluded; medians include successful eligible tasks only.`;
}
function render() {
  $('setup').hidden = !!session; $('export').hidden = !session;
  if (!session) return;
  $('progress').textContent = `${session.results.length} / ${session.tasks.length} tasks recorded`;
  $('task').hidden = !session.active; $('instructions').hidden = !!session.active || session.state === 'complete';
  if (!session.active && session.state !== 'complete') {
    const task = session.tasks[session.results.length];
    $('task-title').textContent = `${task.practice ? 'Practice' : 'Measured task'}: ${task.route} / ${task.mode}`;
    $('instruction').textContent = task.mode === 'manual' ? 'Type the complete code from the card. Pasting is blocked in this mode.'
      : task.mode === 'paste' ? 'Use Copy code, paste into the search box, then Search. Do not type the code by hand.'
      : 'A second person must read the code aloud. Do not open the reader card yourself. If no reader is available, skip this task.';
  }
  if (session.results.length) showResults();
}
function complete(outcome) {
  finish(session, outcome, performance.now()); clearInterval(interval); persist(); render();
}
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    session = JSON.parse(saved);
    if (session.protocol !== 'order-lookup-pilot-v1' || !Array.isArray(session.tasks) || !Array.isArray(session.results)) throw new Error('Stored session is incompatible. Export or clear this site’s local data before starting again.');
    if (session.active) {
      // The prior performance clock cannot be compared after a reload.
      finish(session, 'interrupted', null); persist();
    }
    $('feedback').value = session.feedback || '';
  }
} catch (error) { $('error').textContent = error.message; $('create').disabled = true; }
$('create').addEventListener('click', () => {
  try { session = makeSession($('participant').value.trim(), $('spoken').checked); persist(); render(); }
  catch (error) { $('error').textContent = error.message; }
});
$('start').addEventListener('click', () => {
  const task = start(session, performance.now());
  $('record-label').textContent = task.record.label; $('record-product').textContent = task.record.product;
  $('code').textContent = display(task.route, task.record); $('spoken-code').textContent = display(task.route, task.record);
  $('visual-card').hidden = task.mode === 'spoken'; $('reader-card').hidden = task.mode !== 'spoken'; $('reader-card').open = false;
  $('copy').hidden = task.mode !== 'paste'; $('query').value = ''; $('response').textContent = ''; $('confirm').hidden = true;
  persist(); render(); $('query').focus();
  interval = setInterval(() => {
    if (!session.active) return;
    const remaining = Math.max(0, 90000 - (performance.now() - session.active.startedMs));
    $('timer').textContent = `${Math.ceil(remaining / 1000)} seconds remaining`;
    if (!remaining) complete('timeout');
  }, 100);
});
$('copy').addEventListener('click', async () => {
  const task = session.tasks[session.results.length];
  try { await navigator.clipboard.writeText(display(task.route, task.record)); if (session.active?.taskId === task.taskId) { session.active.copyActions++; persist(); $('response').textContent = 'Copied. Paste the code into the search box.'; } }
  catch { $('response').textContent = 'Clipboard is unavailable. Select the code and copy it with your keyboard.'; }
});
$('query').addEventListener('paste', event => {
  if (!session.active) return;
  const task = session.tasks[session.results.length];
  if (task.mode !== 'paste') { event.preventDefault(); session.active.blockedPastes++; session.active.deviation = true;
    $('response').textContent = 'This task requires typing. The paste attempt is recorded; this task will be excluded.'; }
  else session.active.pastes++;
  persist();
});
$('lookup').addEventListener('submit', event => {
  event.preventDefault(); if (!session?.active) return;
  const result = search(session, $('query').value, performance.now()); persist();
  $('confirm').hidden = result.status !== 'found';
  $('response').textContent = result.status === 'found' ? `Found ${result.record.label}: ${result.record.product}. Confirm only if it matches the requested order.`
    : result.status === 'invalid' ? `Invalid code (${result.error}). Enter the whole code printed on the card, not the order label.`
    : 'No matching order. Check the code and try again.';
});
$('confirm').addEventListener('click', () => { if (session?.active) complete('confirm'); });
$('skip').addEventListener('click', () => { if (session?.active) complete('skip'); });
$('feedback').addEventListener('input', () => { session.feedback = $('feedback').value; persist(); });
$('export').addEventListener('click', () => {
  const data = { ...session, summary: summarize(session), exportedAt: new Date().toISOString(),
    scope: 'Single-participant synthetic lookup pilot. No production or general advantage claim.' };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `order-pilot-${session.participant}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session?.active) complete('interrupted');
});
render();
