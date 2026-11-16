import React from 'react';
import { createRoot } from 'react-dom/client';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { referenceError } from '../shared/reference.mjs';
import { useLookup, Result } from '../shared/react-lookup';
function App() {
  const lookup = useLookup();
  return <Formik initialValues={{ reference: '' }} onSubmit={values => lookup.submit(values.reference)}>
    {({ resetForm }) => <Form noValidate onInput={lookup.invalidate}>
      <div className="reference-field"><label htmlFor="reference">Order reference</label>
        <Field name="reference" id="reference" validate={referenceError}/>
        <ErrorMessage name="reference" component="p"/>
      </div>
      <button type="submit">Submit reference</button>
      <button type="button" onClick={() => { resetForm(); lookup.invalidate(); }}>Reset</button>
      <Result value={lookup.result}/>
    </Form>}
  </Formik>;
}
createRoot(document.getElementById('app')).render(<App/>);
