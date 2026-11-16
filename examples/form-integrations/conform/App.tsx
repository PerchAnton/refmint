import React, { useEffect, useState } from "react";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { schema } from "../shared/reference.mjs";
export function App({ lastResult, result }: any) {
  const [visibleResult, setVisibleResult] = useState(result);
  useEffect(() => {
    document.querySelector("main").dataset.ready = "true";
  }, []);
  const [form, fields] = useForm({
    id: "reference-form",
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onSubmit",
    shouldRevalidate: "onInput",
  });
  return (
    <>
      <form
        onInput={() => setVisibleResult(null)}
        method="post"
        {...getFormProps(form)}
        noValidate
      >
        <div className="reference-field">
          <label htmlFor={fields.reference.id}>Order reference</label>
          <input
            {...getInputProps(fields.reference, { type: "text" })}
            key={fields.reference.key}
          />
          <p id={fields.reference.errorId} role="alert">
            {fields.reference.errors}
          </p>
        </div>
        <button>Submit reference</button>
      </form>
      <output data-testid="result">
        {visibleResult?.ok ? visibleResult.canonical : visibleResult?.error}
      </output>
    </>
  );
}
