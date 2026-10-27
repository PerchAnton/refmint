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
| What library code is loaded? | Both the full RefMint root and actual codec-only import graph, plus adapter, versus the Bech32 package JS plus adapter; no minification/tree shaking; excludes shared UI and the local browser CJS wrapper |
| Are references shorter? | Original, canonical and grouped lengths for the same source values |
| What does parsing cost here? | Seven rounds in alternating order, same 28-case mix, warmup, diagnostics only; no I/O |

Source for inspection: [RefMint adapter](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/refmint-adapter.mjs), [independent Bech32m adapter](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/bech32-adapter.mjs), [shared scenarios](https://github.com/PerchAnton/refmint/blob/main/examples/comparison/scenarios.mjs), [measurement script](https://github.com/PerchAnton/refmint/blob/main/scripts/compare.mjs).

The RefMint adapter is smaller because the contract implementation is in its library. Count the library too before drawing a size conclusion. Neither this line count nor a synthetic mutation count measures maintainability, human error rate, support cost or adoption. Both implementations use zero-dependency libraries; the Bech32 package is only a development dependency of RefMint, not a runtime requirement.

The numeric example grows from six source digits to 17 canonical characters; the UUID grows from 36 to 39. Both implementations have the same lengths. The extra underscore and two header symbols distinguish legacy codes, format version and value kind. A shorter checksum scheme may be a better trade-off for a short number.

## Before and after optimization

The baseline is still the same independent adapter, with the same inputs and error precedence. Runtime changes stream the checksum without expanded-prefix/combined-word arrays, precompute the 32 possible polynomial feedback values, collect raw offsets only on an invalid-character path, and convert at most ten base32 symbols (50 exact bits) per BigInt chunk. A uint64/UUID is never converted wholesale to a JS number. Frozen vectors, output shapes, Unicode rejection and both APIs are unchanged.

The optional `refmint/codec` entry exports the same codec without importing the random generator and collision planner. The comparison form uses this entry's module graph; the original root import retains every API. The build removes implementation comments from JS only. Authored source, declaration JSDoc and license files are retained; names and whitespace are not minified. Bech32's published JS is measured unchanged. Thus size savings include packaging decisions, not only algorithm changes.

Recorded on 2026-10-27 with Node 24.19.0 / Apple M3; bytes include each implementation's adapter:

| Size | Previous RefMint root | Current RefMint root | Current codec-only form | Bech32m + adapter |
| --- | ---: | ---: | ---: | ---: |
| Unminified JS bytes | 15,255 | 14,147 | 8,773 | 9,327 |
| Summed per-file gzip bytes | 5,791 | 5,083 | 3,353 | 3,160 |

The complete root is 7.3% smaller; the form's import is 42.5% smaller than before. Codec-only JS is 5.9% smaller than the baseline before compression, but **Bech32m remains smaller after gzip**. These are module sizes, not bundle, transfer or package-archive measurements. A bundler may remove unused functions from either implementation and change the comparison.

[optimization.json](optimization.json) records a separate three-way run: previous revision `daaffe813fd0351752bd158314917267acddc1b6`, current build and Bech32m, all in one process. It uses the same 28 scenarios, 1,000 warmup passes per implementation, nine rotated-order rounds and 10,000 passes per round. Results are consumed. The medians were **556,352**, **1,779,391** and **822,457** checks/s respectively: 3.20× the previous RefMint and 2.16× this Bech32m adapter, for this workload. This longer three-way measurement differs from the original shorter two-way method retained in `pnpm compare`; neither is a general speed guarantee or browser measurement.

All **123,146 differential comparisons** matched the previous build: encodings, formatting, both parse modes, diagnostics and raw offsets for numeric/UUID/legacy factories, including malformed UTF-16, truncation and length boundaries. The regular test suite also exhausts ASCII substitutions in canonical and displayed examples and tests every UUID bit boundary against the independent Bech32m decoder.

To reproduce the historical comparison from a checkout containing that commit:

```sh
git worktree add --detach ../refmint-before daaffe813fd0351752bd158314917267acddc1b6
cd ../refmint-before
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
cd ../refmint
pnpm build
pnpm compare
pnpm compare:previous ../refmint-before/dist daaffe813fd0351752bd158314917267acddc1b6
pnpm test:comparison
```

Run sequentially on an otherwise idle machine. The previous-build path and revision are explicit inputs; the script does not download code. Both reports retain source hashes. `pnpm test:comparison` rejects stale current-runtime or baseline-adapter hashes, without asserting timing thresholds across machines.

## Next decision

This experiment can establish behavior and integration cost. A human-entry advantage requires a separate, consented study using the same task and comparable security/error-detection requirements, with task order counterbalanced. Measure completion time, unsuccessful attempts, wrong-record selections and abandonment; compare against the current workflow and a shorter-checksum baseline. Do not treat longer strings as automatically easier to use, or synthetic typo detection as a user study. If the extra length and dependency outweigh the application-code benefit, use the simpler solution.

No study data or references are uploaded by this example. The page only reads its local static assets and recorded measurement file. Refreshing resets the example.
