# Is another reference useful?

**Current-source experiment, 28 October 2026. No production integration or user study.**
The [Octofleet question](https://github.com/BenediktSchackenberg/octofleet/issues/166#issuecomment-6443864726)
asks whether phone lookup is a recurring problem and whether a simple alias suffices.
The [Invoice Builder question](https://github.com/piratuks/invoice-builder/issues/331#issuecomment-6447823012)
asks for a PDF-to-lookup demo and evidence beyond existing invoice/quote numbers.
Neither conversation establishes a need to adopt RefMint.

## Try the workflow

From current source, with Node 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test:workflows
pnpm demo
```

Open **http://127.0.0.1:4173/workflows/**. Download the sample PDF, copy each of its
three identifiers into the matching field, and compare the results. Switch to the
phone-support fixture to compare hostname search, a short alias and a UUID reference.
Try exact input, a one-symbol change, truncation, an inaccessible record and another
complete valid code. The form supports manual input as well as preset cases.

[Demo source](https://github.com/PerchAnton/refmint/tree/main/examples/workflows) ·
[Sample PDF](https://github.com/PerchAnton/refmint/blob/main/examples/workflows/sample-invoice.pdf) ·
[All recorded outcomes](workflow-results.md) · [Raw evidence and source hashes](workflows.json).
The example is included in the alpha.3 tagged source and is not part of the npm runtime.

## What is compared

All routes use the same six synthetic records and the same allowed scope. One logical
lookup means one call to this in-memory fixture, **not** a measured database request.
The ordinary baselines are intentionally small: hostname substring search, exact
invoice-number lookup, and exact alias lookup. No fuzzy matching or autocorrection
is applied; ambiguity is returned for multiple permitted matches.

Octofleet already has a [search UI](https://github.com/BenediktSchackenberg/octofleet/blob/821d5e8049a0d82ea5bbdd474ac6b443ce9d15e9/frontend/src/components/GlobalSearch.tsx)
and a node-search API; the fixture does not recreate its debounce, backend, OS fields
or ranking. Invoice Builder's existing invoice/quote lookup is acknowledged in the
maintainer's reply. This PDF is an original demo, not an Invoice Builder export, and
we test one invoice rather than claim coverage of every quote/export format.

| Route | Cost and possible benefit |
| --- | --- |
| Existing identifier | No extra reference; hostname search can work with partial input; invoice number preserves leading zeros |
| Simple alias | Shorter to read; requires allocation, uniqueness and a stored alias-to-record mapping |
| RefMint existing-ID codec | Reversible representation of the original public UUID/uint64; no alias table; namespace and checksum checks; longer and adds a dependency |

The sample fleet reference has **49 printed characters**, versus **8** for the hostname
and **5** for the alias. The invoice reference has **21**, versus **15** for its number
and **5** for the alias. RefMint is not the shortest phone identifier in this comparison.

The 54 checks are **2 workflows × 3 routes × 9 selected cases**, not 54 users or a random
error sample. The one-symbol case intentionally lands on a neighboring plain identifier;
the changed RefMint symbol fails its checksum. This exposes a possible silent wrong-record
failure but does not estimate its frequency. A different complete valid RefMint code still
finds the other record. A checksum cannot establish that the user meant that record.

Valid-but-unknown and out-of-scope references both return `not_found` after one logical
lookup. Every route uses the same scope rule. Browser fixtures are public: they only
illustrate the decision; real authorization must run on the server.

## Preserve existing identifiers

- An invoice number such as `INV-2026-000042` remains a string and stays on the PDF.
  Encode a separate internal public numeric key only if that is appropriate; do not
  strip leading zeros or replace a regulated document, tax or accounting identifier.
- Fleet UUIDs remain the record keys. Enrollment IDs, tokens and credentials are not
  inputs to RefMint and are not changed by this experiment. No enrollment API is called.
- RefMint decoding reveals the original ID; it is not encryption. Public references
  must never be treated as secrets, authorization, or proof of document authenticity.

## Reproduce PDF → text → lookup

The PDF is generated from the same fixture. Verification extracts text from the actual
PDF, checks the original invoice number and all three identifiers, and runs them through
the lookup functions. It also checks the local form link and a mistyped extracted code.
No OCR or human transcription performance is measured.

```sh
pnpm workflows
python -m pip install -r examples/workflows/requirements-pdf.txt
python examples/workflows/pdf.py --check
```

Use a Python virtual environment. Omit `--check` to regenerate the deterministic PDF.
These Python packages are development tools, not npm/runtime dependencies. CI checks
the PDF and its extracted identifiers separately from browser tests. Regenerate evidence
with `pnpm workflows`; use `pnpm test:workflows` to reject stale outcomes or source hashes.

## What would justify integration?

Real support transcripts and user outcomes have not been supplied. Keep this an external
prototype until the owner can compare their current workflow, a plain alias and RefMint
on the **same consented, anonymized tasks**. Record completion, wrong-record selections,
corrections, time to the intended record, partial-search usefulness, and setup cost.
Rotate route order and include easy copy/paste cases, not just hand-picked typos.
Keep raw identifiers/credentials private; publish only aggregate results and sample size.

If ordinary lookup already succeeds reliably, or the alias works as well with less
effort, keep it. Adopt RefMint only if a recurring need and a meaningful improvement
outweigh longer input, maintenance and alpha-policy costs. Passing this fixture alone
is not an integration recommendation. [When not to use RefMint](when-not-to-use.md).
