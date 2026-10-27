# RefMint and a Bech32m application adapter

Build current source, run `pnpm compare`, then `pnpm demo` and open **http://127.0.0.1:4173/comparison/**. These existing-ID APIs and examples are not in the published alpha.1 archive.

The form is a return lookup using an existing numeric key or UUID. It restores that original value before looking up one in-memory record. No second alias is generated, stored or indexed. This example does not replace an application's authorization or demonstrate real database savings.

## Fair baseline

The baseline uses the published `bech32@2.0.0` package's Bech32m variant. That is the same checksum algorithm used by RefMint. It has an independent application adapter with the same namespace, version, value-kind, precision, canonicality, presentation and diagnostic rules. It does not import RefMint or its parsing helpers.

Both adapters receive identical input and the same original record, use shared UI/message/lookup code and produce identical reference strings. A low-level Bech32m decoder returns an HRP and words; an application still has to decide what those words mean. The baseline supplies those decisions instead of sending unchecked values to a database or being deliberately incomplete.

This measures the work to implement **this particular v1 contract**. It does not show that all applications need this contract, or that RefMint is the best choice for short numeric check digits, other existing formats or machine-only IDs. Using Bech32 directly remains a reasonable choice.

## Recorded evidence

[comparison.json](comparison.json) contains the source hashes, methods, runtime environment, input outcomes, sizes and timings. Reproduce with `pnpm compare`; `pnpm test:comparison` verifies source hashes and deterministic facts without comparing machine timings or zlib-dependent compression sizes.

| Question | What is measured |
| --- | --- |
| Does either implementation accept unsafe values? | 14 shared input scenarios for each of uint64 and UUID, including recomputed valid checksums on invalid versions, kinds, empty payloads and overflow |
| Does either miss the selected typos? | All alternative alphabet symbols in two fixed fixtures' data/checksum and lowercase alternatives in their namespace |
| Does it save application code? | Nonblank/noncomment lines of the complete adapters; shared UI, records and tests excluded |
| What library code is loaded? | All emitted RefMint JS plus its adapter, versus the Bech32 package JS plus its adapter; no minification/tree shaking; excludes shared UI and the local browser CJS wrapper |
| Are references shorter? | Original, canonical and grouped lengths for the same source values |
| What does parsing cost here? | Seven rounds in alternating order, same 28-case mix, warmup, diagnostics only; no I/O |

Source for inspection: [RefMint adapter](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/refmint-adapter.mjs), [independent Bech32m adapter](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/bech32-adapter.mjs), [shared scenarios](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/scenarios.mjs), [measurement script](https://github.com/PerchAnton/refmint/blob/main/scripts/compare.mjs).

The RefMint adapter is smaller because the contract implementation is in its library. Count the library too before drawing a size conclusion. Neither this line count nor a synthetic mutation count measures maintainability, human error rate, support cost or adoption. Both implementations use zero-dependency libraries; the Bech32 package is only a development dependency of RefMint, not a runtime requirement.

The numeric example grows from six source digits to 17 canonical characters; the UUID grows from 36 to 39. Both implementations have the same lengths. The extra underscore and two header symbols distinguish legacy codes, format version and value kind. A shorter checksum scheme may be a better trade-off for a short number.

## Next decision

This experiment can establish behavior and integration cost. A human-entry advantage requires a separate, consented study using the same task and comparable security/error-detection requirements, with task order counterbalanced. Measure completion time, unsuccessful attempts, wrong-record selections and abandonment; compare against the current workflow and a shorter-checksum baseline. Do not treat longer strings as automatically easier to use, or synthetic typo detection as a user study. If the extra length and dependency outweigh the application-code benefit, use the simpler solution.

No study data or references are uploaded by this example. The page only reads its local static assets and recorded measurement file. Refreshing resets the example.
