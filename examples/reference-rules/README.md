# Reference rules in seven validation and form libraries

These consumers cover a narrow case: an application already uses a human-facing
ORDER lookup reference and wants to reject a checksum typo or the wrong namespace.
They use published RefMint 1.0.0, format v1. Existing record IDs and authorization
remain the application's responsibility. If its current identifier and search are
enough, this is not a reason to add a reference field.

| Library | Integration exercised | Verification |
| --- | --- | --- |
| Runtypes 7.0.5 | `String.withConstraint` and `inspect` | Six native cases |
| Valibot 1.5.0 | `pipe(string(), check(...))` and `safeParse` | Six native cases; schema also used by RVF |
| Typia 15.4.1 | Compiled `createValidate<Request>()`, followed by codec diagnostics | Ten native cases |
| RSuite 6.2.5 | `Schema.Model`, `StringType.addRule`, real `Form` submit | Browser |
| RVF 8.1.4 | Standard Schema, `useForm`, field errors, actual submit handler | Browser |
| form-atoms 3.3.3 | `fieldAtom.validate`, `useInputField`, `formAtom` submit | Browser |
| Web Awesome 3.14.0 | `wa-input.setCustomValidity`, `wa-invalid`, native form validation | Browser |

The native cases accept the uppercase/grouped printed reference and reject a
checksum typo, another namespace, empty input, a non-ASCII lookalike and a number.
The Typia pipeline also rejects null, missing-field, array and primitive requests.
All paths keep the original input. Typia checks shape first; the separate codec
check supplies checksum and namespace semantics. There is no string expression
that imports a codec into a custom tag, global hook, or claim that a type alone
validates a checksum. The test executes Typia's compiled output.

Each browser journey rejects four invalid values, accepts the printed sample,
clears an old success indicator when the user edits, and rejects a subsequent
invalid submission. In React, the status is cleared in the bubbling change event,
after field handlers update their state. Clearing it during input capture can
restore a controlled input's previous value before those handlers run.
Web Awesome's required field has the accessible name `Reference *`; its invalid
notification is `wa-invalid`, not the native event on its inner input.

## Run

Use Node 24.22.1. These dependencies belong to the isolated examples, not RefMint's
published runtime. Typia uses TypeScript 7.0.2 and ttsc 0.37.0. The first compilation
builds its native plugin and can take several minutes; subsequent builds use the
compiler's cache.

```sh
cd examples/reference-rules
npm ci --ignore-scripts
npm test
npm run build
npm run test:browser
REFMINT_PREVIEW=1 npm run test:browser
# Or use an installed Chrome:
REFMINT_TEST_CHROME=/path/to/chrome npm run test:browser
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197
```

Open `http://127.0.0.1:5197/?library=rvf` and use the links for the other forms.
The whole code on the card belongs in the input. This page performs validation,
not a database lookup. A server must validate again, check record existence and
permission, and enforce its own rate limits. See [the lookup boundary](../form-integrations/README.md)
for a separate example with stale-response handling.

Local checks: 22 native cases and four browser journeys in both development and
production builds passed on Node 24.22.1 / Chrome 157, with browser retries disabled.
These are consumer checks, not the seven projects' full suites. They neither prove
adoption nor a human entry-speed advantage. No new upstream dependency or built-in
validation rule is requested.
