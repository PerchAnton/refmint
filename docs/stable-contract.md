# Public API contract for 1.x

This contract fixes the public surface of the published RefMint 1.0.0 release.
[Registry verification](evidence/npm-1.0.0.json) records the exact archive and
compatibility checks. Consumer upgrades require their own review. Future 1.x
changes must preserve this contract and the historical-release checks.
Release and support readiness remain separate [gates](stability.md).

## Imports and environments

The public ESM entry points are `refmint` and `refmint/codec`. The root exports
`createReferences`, `createReferenceCodec`, `planReferences` and
`collisionProbability`. `refmint/codec` exports `createReferenceCodec` and its
codec types; it does not require random generation or a Web Crypto source.
Internal `dist/*` paths are not public imports. There is no CommonJS entry point.
The runtime has no package dependencies and declares `sideEffects: false`.

The current Node floor is 22. CI checks Node 22/24/26 on Linux and Node 24 on
Windows/macOS, plus Chromium, Firefox and WebKit. These jobs do not claim coverage
of every OS/Node combination or every historical browser. Browsers need native
BigInt and the standard ES2022 APIs used by the package; random generation also
needs secure `crypto.getRandomValues`. There is no insecure randomness fallback.
Installed TypeScript consumers are checked with 5.9.3 using strict NodeNext;
older compiler versions are not promised without their own checks.

## Factories and values

| API | Stable inputs and behavior |
| --- | --- |
| `createReferences(options)` | Prefix plus a fixed `randomLength`, a complete collision budget, or the default 26-symbol payload. Returns `prefix`, `plan`, `generate`, `parse`, `parseCanonical`, `diagnose`, `format` |
| `planReferences(options)` | Same options and immutable plan, without requiring randomness. Chooses the shortest supported payload satisfying the conservative bound |
| `collisionProbability(length, count)` | Validated length/count and the documented birthday approximation; no uniqueness guarantee |
| `createReferenceCodec(options)` | `prefix`, `kind: 'uint64' \| 'uuid'`, optional `version: 1`. Returns `prefix`, `kind`, `version`, `encode`, `decode`, `decodeCanonical`, `diagnose`, `format` |

Factories validate and snapshot options once; later mutation does not reconfigure
them. Factory objects and random-reference plans are immutable. Unknown options,
incomplete budgets, unsupported versions and invalid bounds are rejected.

For uint64, `encode` accepts **bigint only**, from 0 through 2^64−1. It never
rounds a Number or coerces decimal text. UUID input/output is lowercase hyphenated
hexadecimal preserving all 128 bits, including nil and all-ones values. It does
not validate UUID version/variant semantics. A consumer can impose a narrower
range: Billetsys accepts only positive Java Long IDs through 2^63−1.

The exported types remain available from the same entry points:

- Random API: `Reference`, `ReferenceOptions`, `ReferencePlan`, `References`,
  `ParseError`, `ParseResult`, `ParseDiagnostic`, `ValidationDetails` at the root.
- Codec API: `ReferenceKind`, `ReferenceValue`, `EncodedReference`,
  `ReferenceCodecOptions`, `ReferenceCodec`, `DecodeError`, `DecodeResult`,
  `DecodeDiagnostic` at both entry points.

Brands prevent accidental mixing of namespaces, random/existing-ID references,
and codec kinds. They are compile-time checks, not credentials. A caller upgrading
must still validate untrusted input; casting a string does not validate it.

## Results, errors and diagnostics

`parse`/`parseCanonical` return `{ ok: true, id, normalized }` or
`{ ok: false, error }`. Codec decoding adds `value` on success: bigint for uint64,
string for UUID. `diagnose` has the same successful result and adds `details` on
failure. Ordinary parse/decode results do not acquire a mandatory details object.

The random error codes are `type`, `too_long`, `format`, `case`, `character`,
`checksum`, `prefix`, `length`, `non_canonical`. The codec also has `version`,
`kind` and `overflow`. The order in [SPEC.md](../SPEC.md#parsing-and-error-precedence)
and [format v1](format-v1.md#validation-order) is contractual: e.g. a damaged
prefix fails checksum before it can be identified as a different namespace.

Human-input boundaries accept only the documented ASCII surrounding whitespace,
uniform uppercase and exact groups of four. Canonical methods require the exact
lowercase, ungrouped stored code. The raw limit remains 128 UTF-16 code units.
Unicode lookalikes and malformed grouping are rejected, never repaired.
Diagnostics use zero-based UTF-16 offsets in the original input, including its
whitespace/grouping; a non-BMP character uses its first code-unit offset. Length
units remain `input_code_units`, `data_symbols` or `payload_symbols`. A checksum
failure supplies no guessed character position or replacement identifier.

Malformed human input returns an error result, without invoking object coercion
hooks. Encoding and configuration errors use these exception classes, so callers
can distinguish a wrong value type from a value outside the supported range:

| Invalid operation | Exception |
| --- | --- |
| Non-object options, unknown option keys, or combining fixed length with a collision budget | `TypeError` |
| Invalid/missing prefix or codec kind; unsupported explicitly supplied version | `RangeError` |
| Invalid length, count or probability; incomplete or unattainable collision budget | `RangeError` |
| uint64 input other than bigint; noncanonical or non-string UUID input | `TypeError` |
| uint64 bigint below zero or above 2^64−1 | `RangeError` |
| `format` given an invalid, foreign or noncanonical code | `TypeError` |
| Random generation without secure Web Crypto | `Error` |

If multiple configuration fields are invalid, validation may fail at an earlier
field; these categories describe an invalid field with the other options valid.
Exceptions raised by a caller's own option getter or host crypto provider are
not suppressed. Human-readable exception prose and ordering of optional
information are not machine protocols. Adding optional diagnostics must preserve
existing field types and meanings.

## Identifier compatibility is independent of package version

The [v1 wire contract](format-v1.md) remains unchanged. `refmint@1.0.0` does not
mean wire version 2. Canonical encoding, grouping, normalization, recovered values
and namespace separation must preserve existing valid codes. Unknown versions or
kinds are errors, never a reason to guess another format.

The legacy random format remains supported with its original prefix and payload
length. Persist that configuration; do not recalculate an existing namespace's
length from a revised collision budget and invalidate old codes. A different
format needs an explicit new reader/writer and an application lifecycle plan.
Old readers must remain available wherever previously issued references are
still expected to work, even across a future package-major upgrade.

## Change policy

For the 1.x contract, removals or incompatible changes to signatures,
brands, result fields, error behavior, accepted values, defaults or minimum
platform requirements require a new package major and migration notes. Changes
to exported unions (including error codes) need special review: adding a case can
break an exhaustive TypeScript consumer. They are not automatically safe minors.
Compatible additions use a minor; fixes use a patch only after the compatibility
gates pass. No release may silently reinterpret a v1 code as a different ID.

A necessary security correction needs a documented impact analysis, regression
and migration or repair path; never conceal a compatibility failure by replacing
old fixtures. Follow [SECURITY.md](../SECURITY.md) for disclosure. This contract
does not promise an independent audit, calendar support period or response-time
SLA. The [support policy](support.md) and [release procedure](releasing.md)
apply before stable publication. Neither a stable API nor its checksum proves authorization, record
existence, or a practical manual-entry advantage.

## Executable checks

`pnpm test:compatibility` packs the checkout, verifies the SHA-512-pinned npm
alpha.3 and beta.2 archives, and installs all three outside the checkout. It checks
all nine writer/reader pairs, 20 existing-ID and three legacy frozen vectors,
five historical synthetic Billetsys codes, negative cases, entry points and the
same strict TypeScript consumer against each package.
Every accepted presentation is also checked against the canonical reader:
uppercase, surrounding ASCII whitespace and grouping must be rejected there,
while human-input readers return the canonical ID and correct `normalized` flag.
Exception checks assert the documented classes, not just that something throws.

`pnpm test:package` also runs this matrix on **its exact archive** on every core
CI platform. It retains its offline-install, inventory, documentation and runtime
hash checks. The matrix fetches the two pinned archives; a network failure is a
failed check, not a skipped compatibility result. Installation uses a fresh
offline store and ignores lifecycle scripts. Temporary archives/consumers are
removed on success or failure. For an already packed candidate:

```sh
pnpm test:compatibility /absolute/path/to/refmint-candidate.tgz
```

The candidate's version must match the checkout; it is identified by its archive
hash and its candidate manifest version. Historical digests and vectors
must not be regenerated to accommodate changes. The matrix supplements, rather
than replaces, independent Bech32m, boundary, browser, PDF and application tests.
See the [alpha.3 migration guide](migration-alpha3-to-1.md).
