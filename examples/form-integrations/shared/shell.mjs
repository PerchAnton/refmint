import { printed, mistyped } from "./reference.mjs";
export const examples = [
  "rjsf",
  "formik",
  "final-form",
  "mantine",
  "formily",
  "primevue",
  "vueform",
  "autoform",
  "formwerk",
  "formly",
  "jsonforms-react",
  "jsonforms-vue",
  "jsonforms-angular",
  "jedison",
  "conform",
];
export function shell(title, body, script = "", props = "") {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · RefMint</title><link rel="stylesheet" href="/shared/style.css"></head><body><a href="/">All examples</a><h1>${title}</h1><p>Enter or paste the code from the sample card. Submit, then try the one-character typo and correct it.</p><section class="card"><strong>Sample order 42</strong><p class="sample-code">${printed}</p><p>Selected typo: <code>${mistyped}</code></p><p class="hint">Both strings match the example's shape regex. Only the original passes the checksum. This is a code check, not a study of human speed or accuracy.</p></section><main id="app">${body}</main>${props}${script ? `<script type="module" src="${script}"></script>` : ""}</body></html>`;
}
