# Reference fields in fifteen form libraries

These runnable examples validate an optional public order reference with
**RefMint 1.0.0 from npm**, using each library's own validation hook. JSON Forms
has three renderers, so the fifteen libraries have seventeen browser routes.

The narrow use case is a person entering a code from a printed label or message.
A shape-only regular expression accepts the selected one-character typo; the
checksum rejects it before a record lookup. This is useful only when an
application already needs such references. If an order number, UUID, barcode or
existing search works well, keep it. These examples do not show faster human
entry, fewer real-world errors, or adoption by the form-library maintainers.

## Run

Use Node.js 24.22 or newer. Dependencies are isolated from RefMint's root package.
From this directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix uniforms ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open <http://127.0.0.1:5187/>. For the Superforms example, run in a second terminal:

```sh
npm run dev:superforms
```

Open <http://127.0.0.1:5188/>. For Uniforms, run `npm --prefix uniforms run dev`
in another terminal and open <http://127.0.0.1:5189/>. All three servers bind only to the local machine. They
use synthetic in-memory records and are development examples, not deployable
account or authentication services.

1. Copy the valid code from **Sample order 42** into **Order reference**.
2. Click **Submit reference**. The server returns its canonical lookup key.
3. Change the last character to the selected typo shown on the page and submit.
4. The field shows an error and keeps the text for correction. Correct it and
   submit again. A new edit clears the previous lookup result.

Conform and Superforms also support native form submission with JavaScript
turned off. The other examples need JavaScript to render their forms.

## Integration points

| Library | Example and installed version | Validation hook | Specific lesson |
| --- | --- | --- | --- |
| Vueform | [App.vue](vueform/App.vue), 1.13.13 | `Validator.check` and `msg` | Keep invalid input; show a checksum or namespace error through Vueform's rule interface. |
| AutoForm | [main.tsx](autoform/main.tsx), 5.0.0 / Zod provider 6.0.0 | Zod `superRefine`, React Hook Form field | A schema-generated form can display a semantic error that a string pattern cannot detect. |
| Superforms | [page](superforms/src/routes/+page.svelte), [server action](superforms/src/routes/+page.server.js), 3.1.0 | `zod4Client` and server `superValidate` | Share the validation contract, retain failed input, and still validate a native POST without JavaScript. |
| Conform | [App.tsx](conform/App.tsx), [server](conform/server.tsx), 1.21.3 | Client and server `parseWithZod` | SSR, hydration and native POST use the same field error and raw value. |
| Formwerk | [App.vue](formwerk/App.vue), [field](formwerk/ReferenceField.vue), 0.14.4 | `useForm` schema and `useTextField` | Typed form submission and Reset retain the library's own state handling. |
| Formly | [main.ts](formly/main.ts), 11.2.0 / Angular 22.2.6 | Field validator expression and message | Application-level validation; no custom keyword or dependency in Formly itself. |
| JSON Forms | [React](jsonforms-react/main.tsx), [Vue](jsonforms-vue/App.vue), [Angular](jsonforms-angular/main.ts), all 3.8.0 | Shared Ajv `order-reference` format | The same schema and fixtures run through three real renderers. Ajv must receive the custom format. |
| Jedison | [main.mjs](jedison/main.mjs), 1.31.1 | Custom constraint returning an `error` | A blocking checksum error, rather than a warning, prevents the invalid lookup. |
| RJSF | [main.tsx](rjsf/main.tsx), 6.11.1 | `customizeValidator` with Ajv custom format | Explicit format registration rejects the typo, while the submitted field remains raw. |
| Formik | [main.tsx](formik/main.tsx), 2.4.9 | `Field.validate` | Correction and Reset use Formik state; validation blocks the lookup. |
| React Final Form | [main.tsx](final-form/main.tsx), 7.0.1 / Final Form 5.0.1 | Field validator before async submit | A late lookup response cannot replace the result after the field was edited. |
| Uniforms | [main.tsx](uniforms/main.tsx), 4.0.0 / React 18.3.1 | `JSONSchemaBridge` and Ajv validator | Error details flow through the actual bridge. React 18 is isolated to satisfy Uniforms' peer range. |
| Mantine | [main.tsx](mantine/main.tsx), form 9.8.1 | `useForm.validate` | Semantic validation and Reset without adding an ID format to Mantine. |
| Formily | [main.tsx](formily/main.tsx), 2.3.7 | Field validator and feedback messages | Raw input stays available when the field's checksum feedback blocks submit. |
| PrimeVue | [App.vue](primevue/App.vue), 4.5.5 | Forms' Zod resolver | The MIT-licensed v4 example uses the form's own valid-submit result. No v5 license is required. |

The seven additional recipes use [latest-lookup.mjs](shared/latest-lookup.mjs).
Editing or resetting increments a local request revision and clears the displayed
result. Only the latest request can publish success or failure. This protects the
example UI from an old response; it is separate from server authorization and
does not cancel a request already received by the server.

These are external consumer recipes. They do not add a dependency to any of the
upstream libraries or change their validators. The Angular examples use JIT
compilation to keep the standalone harness small; a production Angular app
should use its normal build and rendering setup.

## Shared contract

[reference.mjs](shared/reference.mjs) configures `order`, `uint64`, format v1.
The field retains what the person entered. Valid uppercase, grouped text can be
normalized by the server to the canonical lowercase reference. Requests carry
the raw string; the server validates it again before using the decoded value.

| Input | Result |
| --- | --- |
| Empty, malformed, wrong namespace or selected checksum typo | Field error; no record lookup |
| Valid code for sample 42 | Canonical reference and synthetic record |
| Valid code for unknown sample 43 | Not found; checksum validity does not imply existence |
| Valid code for restricted sample 44 | Forbidden; checksum validity does not imply authorization |

[Ajv configuration](shared/ajv.mjs) and the Zod schema call the same diagnostic
function. The JSON Schema `format` name alone does not install validation. A
plain regular expression checks presentation only, not the Bech32m checksum.

Keep database IDs, regulated invoice numbers and authorization rules intact.
An alias needs storage, uniqueness, lookup and lifecycle rules. Encoding an
existing integer reveals that integer; it is not an access token or encryption.
The fixed demo principal illustrates a separate authorization decision. A real
server must obtain its principal from its own trusted authentication layer.

## Checks

```sh
npm run test:contracts
npm run build
npx playwright install chromium
npm test
```

For an already installed Chromium-compatible browser, set `REFMINT_TEST_CHROME`
to its executable path instead of installing another browser. The lockfile pins
all package versions. `npm test` starts and stops all three local servers itself;
close manually started servers on these ports first.

The browser suite uses one worker and **zero retries**. It checks all seventeen routes:
invalid input, correction, namespace rejection, clearing stale results and real
clipboard paste. It also checks six Reset controls, seven delayed-response cases, both native POST flows
without JavaScript, and direct API requests that bypass client validation.
Contract tests cover invalid types, shape-vs-checksum behavior, shared Ajv/Zod
fixtures and separate not-found/authorization results.

The build compiles fourteen main Vite pages, the isolated Uniforms page and the Superforms server bundle. Conform
SSR is exercised by browser tests through Vite's development server; this is not
a Conform production deployment recipe. The form examples' CI job runs Chromium;
there is no claim of Firefox, WebKit, screen-reader, production-load or human
usability coverage for these examples. Clipboard automation is a functional
check, not a participant study. Layout reserves space for field errors so a
message disappearing on blur does not move the Submit button during a click.

No fixture changes the frozen v1 format, the package API, historical performance
measurements or participant results. These files are excluded from the published
runtime package; all framework dependencies belong to this example directory.
