import React from 'react';
import { createRoot } from 'react-dom/client';
import { Form, Field } from 'react-final-form';
import { referenceError } from '../shared/reference.mjs';
import { useLookup, Result } from '../shared/react-lookup';
function App() {
  const lookup = useLookup();
  return <Form initialValues={{ reference: '' }} onSubmit={values => lookup.submit(values.reference)}>
    {({ handleSubmit, form }) => <form noValidate onSubmit={handleSubmit} onInput={lookup.invalidate}>
      <div className="reference-field"><Field name="reference" validate={referenceError}>
        {({ input, meta }) => <><label htmlFor="reference">Order reference</label><input {...input} id="reference"/>
          {(meta.touched || meta.submitFailed) && meta.error && <p role="alert">{meta.error}</p>}</>}
      </Field></div>
      <button type="submit">Submit reference</button>
      <button type="button" onClick={() => { form.restart(); lookup.invalidate(); }}>Reset</button>
      <Result value={lookup.result}/>
    </form>}
  </Form>;
}
createRoot(document.getElementById('app')).render(<App/>);
