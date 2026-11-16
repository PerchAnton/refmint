import React, { useEffect, useMemo, useState } from 'react';
import '../shared/style.css';
import { createRoot } from 'react-dom/client';
import { AutoForm, AutoField, ErrorsField, SubmitField } from 'uniforms-unstyled';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import Ajv from 'ajv';
import { jsonSchema, referenceError } from '../shared/reference.mjs';
import { latestLookup } from '../shared/latest-lookup.mjs';
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('order-reference', { type: 'string', validate: raw => !referenceError(raw) });
const validate = ajv.compile(jsonSchema);
const bridge = new JSONSchemaBridge({ schema: jsonSchema, validator(model) {
  return validate(model) ? null : { details: validate.errors };
} });
function App() {
  const [result, setResult] = useState(null);
  const lookup = useMemo(() => latestLookup(setResult), []);
  useEffect(() => () => lookup.dispose(), [lookup]);
  return <><AutoForm schema={bridge} onChange={lookup.invalidate} onSubmit={values => lookup.submit(values.reference)}>
    <div className="reference-field"><AutoField name="reference"/><ErrorsField/></div>
    <SubmitField value="Submit reference"/>
  </AutoForm><output data-testid="result">{result?.ok ? result.canonical : result?.error}</output></>;
}
createRoot(document.getElementById('app')).render(<App/>);
