# Changelog

## 0.1.0-alpha.2 — 2026-10-27

Second GitHub prerelease, including the existing-ID API, compatibility checks, comparison form and measured optimizations. Distributed as a package archive; not published to the npm registry.

- Optimize checksum evaluation and parsing without changing formats or diagnostics; use exact 50-bit chunks for bigint decoding. Add an optional `refmint/codec` import and strip implementation comments from shipped JS while preserving source/type documentation. Record full-root and codec-only sizes, a same-process comparison against the previous build, and differential behavior checks.
- Encode existing uint64 and UUID values with an explicit v1 contract, without allocating a second random ID. Preserve integer precision through bigint and reject overflow/noncanonical encodings.
- Keep alpha.1 random references unchanged and structurally separate from the new format; add frozen compatibility vectors and namespace/kind TypeScript brands.
- Add opt-in `diagnose` results with raw-input invalid-character positions and explicit length/namespace details. Existing parse result shapes remain unchanged; checksum errors never autocorrect a code.
- Add a return-lookup form and an independent Bech32m adapter with identical input rules, records and diagnostics. Record shared scenarios, mutation fixtures, adapter/loaded-code sizes, reference lengths and local timings with explicit evidence limits.

[Release notes and downloads](https://github.com/PerchAnton/refmint/releases/tag/v0.1.0-alpha.2).

## 0.1.0-alpha.1 — 2026-10-27

First GitHub prerelease, distributed as a package archive. The npm registry publication is separate. The API and reference format are experimental.

- Generate public references with Web Crypto and a prefix-bound Bech32m checksum.
- Choose a payload length from a lifetime collision budget or use a fixed length.
- Parse human input, require canonical storage input, and format groups of four.
- Distinguish record namespaces in TypeScript and validate them at runtime.
- Include a ticket lookup demo, standard vectors, independent-oracle tests and reproducible evidence.
- Reject Unicode lookalikes before case folding, including the Kelvin sign that previously normalized to ASCII `k`.
- Snapshot configuration once so dynamic getters cannot make the prefix disagree with its length plan.
- Extend finite mutation tests with insertions, deletions, adjacent swaps and 3,000 distinct multiple-substitution samples; exercise Unicode rejection in three browser engines.
- Verify an offline installation of the packed archive, including public exports, TypeScript brands, documentation links and measured runtime hashes.
- Include the README graphic and supporting documents in the archive, and default future npm publications to the `alpha` tag.
- Clean previous build output before compiling, so deleted modules cannot leak into the archive; verify this with a synthetic stale module during package checks.
- Return HTTP 400 for malformed demo URLs without stopping the local server; test the asset allowlist and subsequent requests.
- Check all 912 supported prefix/payload length combinations and 1,766 count/budget pairs around exact floating-point cutoffs, including unattainable budgets.

[Release notes and downloads](https://github.com/PerchAnton/refmint/releases/tag/v0.1.0-alpha.1).
