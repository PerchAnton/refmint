# Changelog

## 0.1.0-alpha.1 — initial source version

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

This version number identifies the source/package candidate. Publication to npm or a GitHub release is not implied.
