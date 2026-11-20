import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createForm } from '@formily/core';
import { Field, FormProvider, observer, useField } from '@formily/react';
import { referenceError } from '../shared/reference.mjs';
import { useLookup, Result } from '../shared/react-lookup';
const ReferenceInput = observer(({ value = '', onChange }) => {
  const field = useField();
  return <div className="reference-field"><label htmlFor="reference">Order reference</label>
    <input id="reference" value={value} onChange={onChange}/>
    {field.errors.flatMap(error => error.messages).map((message, i) => <p role="alert" key={i}>{message}</p>)}
  </div>;
});
function App() {
  const lookup = useLookup();
  const form = useMemo(() => createForm({ initialValues: { reference: '' } }), []);
  return <FormProvider form={form}><form noValidate onInput={lookup.invalidate} onSubmit={e => {
    e.preventDefault();
    void form.submit(values => lookup.submit(values.reference)).catch(() => {});
  }}>
    <Field name="reference" validator={value => referenceError(value) ?? ''} component={[ReferenceInput]}/>
    <button type="submit">Submit reference</button>
    <button type="button" onClick={() => { void form.reset(); lookup.invalidate(); }}>Reset</button>
    <Result value={lookup.result}/>
  </form></FormProvider>;
}
createRoot(document.getElementById('app')).render(<App/>);
