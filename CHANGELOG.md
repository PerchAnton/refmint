# Changelog

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
