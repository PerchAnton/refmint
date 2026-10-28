import { routes, records, identifier, lookup, scenarios } from './model.mjs';

const select = document.querySelector('#domain');
function run() {
  for (const route of routes) {
    const result = lookup(select.value, route, document.getElementById(route).value);
    const output = document.getElementById(`${route}-result`);
    output.dataset.state = result.status;
    const message = result.status === 'found' ? `Found: ${result.record.label}. Original ID: ${result.record.id}.`
      : result.status === 'invalid' ? `Invalid input (${result.reason}).`
      : result.status === 'ambiguous' ? `${result.matches} permitted records match. Refine the search.`
      : 'No accessible record found.';
    output.textContent = `${message} Logical lookups: ${result.queries}.`;
  }
}
function useCase(name) {
  for (const route of routes) document.getElementById(route).value = scenarios(select.value, route).find(s => s.name === name).input;
  run();
}
function update() {
  const record = records.find(r => r.domain === select.value);
  document.querySelector('#context').textContent = select.value === 'invoice'
    ? 'Same PDF, same permitted invoice. The invoice number is a string: its leading zeros and prefix are preserved.'
    : 'A caller describes press-07. Compare the existing hostname search with a five-character alias and a UUID-based reference. Enrollment and credentials stay separate.';
  for (const route of routes) document.getElementById(`${route}-length`).textContent = `${identifier(record, route).length} canonical characters / ${identifier(record, route, true).length} printed characters`;
  useCase('Exact');
}
document.querySelector('#lookup').addEventListener('submit', event => { event.preventDefault(); run(); });
select.addEventListener('change', update);
for (const button of document.querySelectorAll('[data-case]')) button.addEventListener('click', () => useCase(button.dataset.case));
update();
