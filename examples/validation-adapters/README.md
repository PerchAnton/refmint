# Optional reference validation in ten libraries

Use these recipes when an application already needs a manually entered lookup
reference with a checksum. If its existing ID and search are enough, do not add
another identifier. The examples use published RefMint 1.0.0, format v1, without
changing invoice numbers, UUIDs, database keys, or authorization.

| Library | Real extension point exercised | Run |
| --- | --- | --- |
| Modular Forms / Solid 0.25.1 | Field `validate`, real form submit and error state | Browser |
| VineJS 4.4.0 | `createRule` in a compiled schema | Node |
| class-validator 0.15.1 | `ValidateBy` and `validateSync` | Node |
| TypeBox 1.4.7 | Registered `Format.Set` and `Value.Check` | Node |
| Vuelidate 2.0.3 | `helpers.withMessage` and `$validate` | Browser |
| Felte vanilla 0.3.14 | Form `validate`, error store, submit callback | Browser |
| Regle 1.29.5 | `createRule` and `$validate` | Browser |
| JSON Editor 2.17.4 | `custom_validators`, `validate(currentValue)` | Browser |
| express-validator 7.3.2 | `body().custom`, `validationResult`, `matchedData` | Node |
| validatorjs 3.22.1 | Registered custom rule with `required` | Node |

All recipes retain the exact input. They accept the printed uppercase/grouped
sample and reject a checksum typo, a different namespace, empty input and a
non-ASCII lookalike. A regular expression for the shape cannot establish checksum
validity. For TypeBox, the format implementation must be registered: the format
annotation alone is not that implementation.

JSON Editor's no-argument `validate()` can return cached results from its previous
animation-frame update. The submit handler explicitly validates `getValue()`.
A queued change event clears a success indicator only when the value changed.
Its published UMD bundle is loaded as a browser script.
The demo navigates between full pages; a single-page application must retain and
call its framework disposal hooks when unmounting a form. This is a consumer recipe;
JSON Editor remains in maintenance mode and no new upstream feature is requested.

## Run

Use Node 24.22.1. Dependencies are isolated from RefMint's published runtime.

```sh
cd examples/validation-adapters
npm ci --ignore-scripts
npm test
npm run build
npm run test:browser
REFMINT_PREVIEW=1 npm run test:browser
# For an installed local Chrome instead of Playwright's Chromium:
REFMINT_TEST_CHROME=/path/to/chrome npm run test:browser
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5193
```

Open `http://127.0.0.1:5193/?library=felte`, or choose one of the five browser
libraries in the page. Each successful result explicitly says authorization has
not been checked. The Node examples call actual validation pipelines, but they
are not a complete HTTP server. The express-validator example uses its supported
manual `.run(request)` API.

Validation and a checksum do not establish that a record exists or the caller
may access it. A real server must validate again, perform an authorized lookup,
and apply its own rate limits. See the existing [form integration examples](../form-integrations/README.md)
for that separate lookup boundary and stale-response handling. These recipes do
not measure human entry speed, prove upstream adoption, or replace a user study.

Local verification on Node 24.22.1 and Chrome 157: 25 native cases passed,
followed by five browser journeys against the development server and the same
five against the production build. Browser journeys check four invalid values,
a valid printed code, and clearing the success indicator on a subsequent edit.
Retries were disabled. These are example checks, not the upstream projects' suites.
