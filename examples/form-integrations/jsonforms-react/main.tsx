import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { JsonForms } from "@jsonforms/react";
import { vanillaRenderers, vanillaCells } from "@jsonforms/vanilla-renderers";
import { jsonSchema, uiSchema, submitReference } from "../shared/reference.mjs";
import { referenceAjv } from "../shared/ajv.mjs";
const ajv = referenceAjv();
function App() {
  const [data, setData] = useState({ reference: "" });
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!errors.length) setResult(await submitReference(data.reference));
      }}
    >
      <div className="reference-field">
        <JsonForms
          schema={jsonSchema}
          uischema={uiSchema}
          data={data}
          renderers={vanillaRenderers}
          cells={vanillaCells}
          ajv={ajv}
          onChange={(event) => {
            setData(event.data);
            setErrors(event.errors ?? []);
            setResult(null);
          }}
          validationMode="ValidateAndShow"
        />
      </div>
      <button type="submit">Submit reference</button>
      <output data-testid="result">
        {result?.ok ? result.canonical : result?.error}
      </output>
    </form>
  );
}
createRoot(document.getElementById("app")).render(<App />);
