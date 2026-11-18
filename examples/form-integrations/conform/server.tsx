import React from "react";
import { renderToString } from "react-dom/server";
import { parseWithZod } from "@conform-to/zod/v4";
import { App } from "./App";
import { schema, lookup } from "../shared/reference.mjs";
import { shell } from "../shared/shell.mjs";
export async function render(req) {
  let props: any = {};
  let status = 200;
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 8192) return { status: 413, html: "Request too large" };
    }
    const formData = new FormData();
    for (const [key, value] of new URLSearchParams(body))
      formData.append(key, value);
    const submission = parseWithZod(formData, { schema });
    props.lastResult = submission.reply();
    if (submission.status === "success") {
      props.result = lookup(submission.value.reference);
      status = props.result.status;
    } else status = 422;
  }
  const encoded = JSON.stringify(props).replace(/</g, "\\u003c");
  return {
    status,
    html: shell(
      "Conform",
      renderToString(<App {...props} />),
      "/conform/main.tsx",
      `<script type="application/json" id="initial-state">${encoded}</script>`,
    ),
  };
}
