# Evidence methods

Run `pnpm check && pnpm evidence` from a clean checkout after installing the locked development dependencies. The script writes `docs/evidence.json` and regenerates `docs/assets/evidence.svg` for the README. Generated JavaScript hashes identify the measured runtime bytes; environment, timestamp and raw timing samples are retained in JSON.

## Correctness

Core tests check all 7 valid and 14 invalid generic Bech32m vectors from BIP-350. They compare generated output with a separate implementation (`bech32` 2.0.0) for all payload lengths from 8 through 64 and four prefixes. The planner is checked against exact BigInt pair counts at representative budgets. Type checks demonstrate namespace separation.

The evidence script enumerates 31 alternate symbols at every payload and checksum position for four known references. Their payload lengths are 8, 14, 26 and 64, giving `(14 + 20 + 32 + 70) × 31 = 4,216` substitutions. All must be rejected or the script fails. The core suite additionally checks 3,000 deterministic samples with 2–4 substituted positions. This is finite test evidence; it is not an exhaustive proof of the standard's error-detection properties. Case folding and valid grouping are deliberately accepted and are not counted as detected errors.

Browser tests exercise the actual form in Chromium, Firefox and WebKit: printed uppercase reference, one typo, unknown valid reference, replacing the sample ticket, and a narrow viewport. Hosted results are available in the CI workflow. Local results and hosted results must be identified separately.

## Size and speed

Runtime dependency count comes from package.json. Emitted JavaScript bytes are measured without minification. gzip bytes are recorded for each module separately and summed; that sum is not a minified bundle benchmark. Source maps, declarations and documentation are not part of the JavaScript-only figure; the install archive is larger.

Timings use 2,000 warmup calls and seven rounds of 20,000 calls per operation in one Node process. The median and all raw samples are recorded. Generation includes Web Crypto and checksumming; parsing includes display normalization and validation. These are different operations, not comparable speed competitors. Hardware load, runtime and JIT affect results. There is no claim of being faster or smaller than Nano ID, UUID or another library.

## Benefit still to establish

The sample demonstrates a complete input/lookup flow and distinct error states. It does not prove user adoption, fewer human mistakes or reduced support costs. A later study needs real users, representative tasks and a declared baseline. New integrations should follow an actual consumer request rather than a generic dependency proposal.
