import React from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from '@mantine/form';
import { referenceError } from '../shared/reference.mjs';
import { useLookup, Result } from '../shared/react-lookup';
function App() {
  const lookup = useLookup();
  const form = useForm({ initialValues: { reference: '' }, validate: { reference: referenceError } });
  const { error, ...input } = form.getInputProps('reference');
  return <form noValidate onSubmit={form.onSubmit(values => lookup.submit(values.reference))} onInput={lookup.invalidate}>
    <div className="reference-field"><label htmlFor="reference">Order reference</label><input id="reference" {...input}/>
      {error && <p role="alert">{error}</p>}
    </div>
    <button type="submit">Submit reference</button>
    <button type="button" onClick={() => { form.reset(); lookup.invalidate(); }}>Reset</button>
    <Result value={lookup.result}/>
  </form>;
}
createRoot(document.getElementById('app')).render(<App/>);
