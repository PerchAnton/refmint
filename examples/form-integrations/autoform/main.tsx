import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AutoForm } from "@autoform/react/react-hook-form";
import { ZodProvider } from "@autoform/zod";
import { useController } from "react-hook-form";
import { schema, submitReference } from "../shared/reference.mjs";
function ReferenceField({ id, inputProps, error }) {
  const { field } = useController({ name: id });
  return (
    <input
      {...inputProps}
      {...field}
      id={id}
      value={field.value ?? ""}
      aria-invalid={!!error}
    />
  );
}
const Wrapper = ({ children }) => <div>{children}</div>;
const uiComponents = {
  Form: (props) => <form {...props} noValidate />,
  FieldWrapper: ({ children, error, id }) => (
    <div className="reference-field">
      <label htmlFor={id}>Order reference</label>
      {children}
      {error && <p role="alert">{error}</p>}
    </div>
  ),
  ErrorMessage: ({ error }) => <p role="alert">{error}</p>,
  SubmitButton: () => <button type="submit">Submit reference</button>,
  ObjectWrapper: Wrapper,
  ArrayWrapper: Wrapper,
  ArrayElementWrapper: Wrapper,
};
const provider = new ZodProvider(schema);
function App() {
  const [result, setResult] = useState(null);
  const [epoch, setEpoch] = useState(0);
  return (
    <>
      <div onInput={() => setResult(null)}>
        <AutoForm
          key={epoch}
          schema={provider}
          uiComponents={uiComponents}
          formComponents={{ string: ReferenceField }}
          defaultValues={{ reference: "" }}
          withSubmit
          onSubmit={async (values) =>
            setResult(await submitReference(values.reference))
          }
        />
      </div>
      <button
        onClick={() => {
          setEpoch(epoch + 1);
          setResult(null);
        }}
      >
        Reset
      </button>
      <output data-testid="result">
        {result?.ok ? result.canonical : result?.error}
      </output>
    </>
  );
}
createRoot(document.getElementById("app")).render(<App />);
