import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm as useRvfForm } from '@rvf/react';
import { fieldAtom, formAtom, useForm, useInputField } from 'form-atoms';
import { Provider } from 'jotai';
import { formSchema } from './schemas.mjs';
import { good, valid, message } from './reference.mjs';

const accepted = 'Valid reference; authorization not checked.';
document.querySelector('#sample').textContent = good;
function Rvf() {
  const [status, setStatus] = useState('');
  const form = useRvfForm({ schema: formSchema, defaultValues: { reference: '' },
    handleSubmit: () => { setStatus(accepted); } });
  return <form {...form.getFormProps()} onChange={() => setStatus('')}>
    <label>Reference<input {...form.getInputProps('reference')} /></label>
    <p role="alert">{form.error('reference') || ''}</p><button type="submit">Check reference</button><p role="status">{status}</p>
  </form>;
}
const referenceAtom = fieldAtom({ value: '', validate: ({ value }) => valid(value) ? [] : [message] });
const referenceForm = formAtom({ reference: referenceAtom });
function Atoms() {
  const [status, setStatus] = useState('');
  const { submit } = useForm(referenceForm);
  const field = useInputField(referenceAtom);
  return <form onSubmit={submit(() => setStatus(accepted))} onChange={() => setStatus('')}>
    <label>Reference<input {...field.props} /></label><p role="alert">{field.state.errors.join(' ')}</p>
    <button type="submit">Check reference</button><p role="status">{status}</p>
  </form>;
}
const library = new URL(location.href).searchParams.get('library') || 'rvf';
if (library === 'webawesome') {
  await import('@awesome.me/webawesome/dist/styles/webawesome.css');
  await import('@awesome.me/webawesome/dist/components/input/input.js');
  document.querySelector('#app').innerHTML = '<form><wa-input label="Reference" name="reference" required></wa-input><p role="alert"></p><button type="submit">Check reference</button><p role="status"></p></form>';
  const form = document.querySelector('form'), input = form.querySelector('wa-input');
  const alert = form.querySelector('[role=alert]'), status = form.querySelector('[role=status]');
  await customElements.whenDefined('wa-input');
  const update = () => { input.setCustomValidity(valid(input.value) ? '' : message); status.textContent = ''; alert.textContent = ''; };
  input.addEventListener('input', update);
  input.addEventListener('wa-invalid', () => { alert.textContent = message; });
  form.addEventListener('submit', event => { event.preventDefault(); if (input.checkValidity()) { alert.textContent = ''; status.textContent = accepted; } });
  update();
} else {
  createRoot(document.querySelector('#app')).render(library === 'atoms' ? <Provider><Atoms /></Provider> : <Rvf />);
}
