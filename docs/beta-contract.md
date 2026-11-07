# Beta API and format contract

[RefMint 0.1.0-beta.1 on npm](https://www.npmjs.com/package/refmint/v/0.1.0-beta.1)
adds a compatibility contract and checks frozen identifiers through the installed
archive. The runtime JavaScript matches alpha.3.

## Beta.2 distribution

Published on 5 November 2026 (Europe/Kyiv). [Package on npm](https://www.npmjs.com/package/refmint/v/0.1.0-beta.2) · [GitHub prerelease and checksums](https://github.com/PerchAnton/refmint/releases/tag/v0.1.0-beta.2) · [Installation checks](evidence/release-beta2.json).

## What stays compatible

| Surface | Commitment for beta |
| --- | --- |
| Imports | ESM `refmint` and `refmint/codec`; the same exported factories/functions and TypeScript types; no runtime dependencies |
| Platforms | Node 22+; browsers with the standard APIs used by the package; secure Web Crypto is required for random generation |
| Random references | Existing prefix/length configuration and canonical identifiers remain readable; keep configuration with the stored schema |
| Existing-ID codec | Frozen format v1 for uint64/UUID, same canonical bytes and normalization; incompatible encodings require a different wire version |
| Values | uint64 uses `bigint`, including above the safe-number limit; UUID input uses canonical lowercase hyphenated text; no ObjectId encoding or truncation |
| Results | Keep the `ok` discriminant, canonical `id`, `normalized`, codec `value`, and current error codes; human input methods return failures rather than correcting an identifier |
| Diagnostics | Preserve raw-input position semantics and bounded details. Treat human prose and the ordering of optional diagnostic details as non-contractual |
| Rejection | Preserve finite input bounds, Unicode-lookalike rejection and strict canonical methods. Invalid options/encoding values still throw; parse/decode do not coerce arbitrary input objects |

The random API and existing-ID codec remain different namespaces; neither accepts
the other's format. Checksums detect many entry errors, not a valid-but-wrong record,
and do not provide authorization, secrecy, uniqueness or authentication. A random
reference still needs a unique database index and collision retry. No automatic
database migration, search endpoint or regulated invoice-number replacement occurs.

## Upgrade checks

Pin `refmint@0.1.0-beta.2` to evaluate this release. Existing alpha.2/alpha.3 callers and identifiers need no
API or data migration. Keep the prior reader during application rollout and rerun
the application's native lookup/permission tests on the exact installed archive.

`pnpm test:package` reads all 20 existing-ID and 3 legacy frozen vectors through
the installed package, verifies exact re-encoding/canonical results, and rejects
cross-namespace use. It also checks public type branding, private import blocking,
zero dependencies, shipped documentation and unchanged measured runtime hashes.
The fixtures are not regenerated for beta. Existing independent-oracle, input,
workflow, PDF and three-engine browser checks remain required.

Preserve this contract during beta. A necessary incompatible correction requires a
new prerelease, explicit migration notes and regression evidence; never replace
an existing version. Internal modules, example UI and benchmark timings are outside
this contract. A stable 1.0 support/deprecation policy is a separate decision.

## Stable API continuation

The [1.0 API contract](stable-contract.md) and [alpha.3 migration guide](migration-alpha3-to-1.md)
carry these existing guarantees forward. The installed-archive check now compares
alpha.3, beta.2 and published 1.0.0, without changing wire v1.
[Registry verification](evidence/npm-1.0.0.json) confirms publication;
consumer-native acceptance remains a separate step.

## What beta does not prove

The [existing workflow comparison](workflows.md) is synthetic. The
[human study](manual-entry-study.md) still has no results establishing shorter lookup
times or fewer mistakes. An existing number, UUID search or short alias may remain
better; [adoption costs](adoption.md) do not disappear with a version label.

We can supply exact archive/source hashes, licenses, dependency/type inventory,
compatibility tests and a scoped integration/local-alias comparison. Maintainers
decide whether the workflow needs another code, which source to accept, and who
owns storage, permission checks, deployment and updates. Do not weaken their gates
or label the package approved because a pin or beta package exists.
