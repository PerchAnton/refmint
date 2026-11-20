import React from 'react';
import { createRoot } from 'react-dom/client';
import Form from '@rjsf/core';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { jsonSchema, referenceError } from '../shared/reference.mjs';
import { useLookup, Result } from '../shared/react-lookup';
const validator = customizeValidator({ customFormats: { 'order-reference': raw => !referenceError(raw) } });
function App() {
  const lookup = useLookup();
  return <><Form schema={jsonSchema} validator={validator} noHtml5Validate showErrorList={false}
    onChange={lookup.invalidate} onSubmit={({ formData }) => lookup.submit(formData.reference)}>
    <button type="submit">Submit reference</button>
  </Form><Result value={lookup.result}/></>;
}
createRoot(document.getElementById('app')).render(<App/>);
