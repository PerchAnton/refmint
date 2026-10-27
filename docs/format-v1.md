# Existing-ID format v1

This is a reversible representation of an existing public ID. It allocates no random ID and requires no alias column. It uses standard Bech32m; the application contract below is RefMint-specific. It does not hide the original value, preserve string sort order, or provide authorization.

## Wire contract

`namespace + "_1" + version + kind + payload + checksum`

All data symbols use `qpzry9x8gf2tvdw0s3jn54khce6mua7l`, indexed from 0 to 31.

| Part | Rule |
| --- | --- |
| Namespace | 1–16 lowercase ASCII letters/digits, starting with a letter |
| Bech32m HRP | Namespace followed by `_`; the last `1` separates HRP and data |
| Version | One symbol: integer 1, encoded as `p` |
| Kind | One symbol: integer 0 (`q`) for uint64, 1 (`p`) for UUID |
| uint64 payload | Unsigned integer 0 through 2^64−1 in minimal-width big-endian base32; 1–13 symbols; zero is one `q` |
| UUID payload | Exactly 26 big-endian base32 symbols for all 128 bits; prepend two zero bits; first symbol value must be ≤7 |
| Checksum | Standard six-symbol Bech32m with constant `0x2bc830a3`, over the complete HRP and data |

No unused high bits may be set. Leading zero symbols on a multi-symbol uint64 are invalid even when their checksum is valid. UUID leading zero symbols are required to preserve its fixed 128-bit width. UUID support preserves bits; it does not validate the version/variant semantics or generate a UUID. Nil and all-ones UUIDs are representable.

Canonical lengths, including namespace and checksum: `namespace.length + 10 + payload.length`. The maximum is 52 characters (16-character namespace and UUID payload). Grouped display adds hyphens after each four body symbols, counting version, kind, payload and checksum together. Whole-code uppercase and surrounding ASCII space/tab/CR/LF are accepted only at human-input boundaries. Other normalization and checksum repair are forbidden.

## API

```ts
import { createReferenceCodec } from 'refmint'

const returns = createReferenceCodec({ prefix: 'rma', kind: 'uint64', version: 1 })
const reference = returns.encode(123456n)
const result = returns.decode(returns.format(reference).toUpperCase())
if (result.ok) {
  const original: bigint = result.value
  // Query using original, with the application's authorization rules.
}
```

`kind: 'uuid'` accepts and returns the canonical lowercase hexadecimal UUID string with hyphens. `kind: 'uint64'` requires `bigint`; JavaScript numbers are rejected even when currently safe, so the contract never changes with value magnitude. Convert database values explicitly according to the database driver's type rules. A numeric codec does not preserve leading zeros from a text identifier; identifiers such as `000042` need a different application contract and are not supported here.

The factory snapshots and validates `prefix`, `kind` and `version` once, rejects unknown options and returns an immutable object. Version defaults to 1. An unsupported version in configuration throws. Encoding invalid values throws; decoding unknown input returns a discriminated result.

- `encode(value)` → `EncodedReference<Prefix, Kind>`.
- `decode(input)` → `{ ok: true, id, value, normalized }` or `{ ok: false, error }`.
- `decodeCanonical(input)` → same result, requiring the exact stored representation.
- `diagnose(input)` → same successful result, or `{ ok: false, error, details }`.
- `format(id)` → grouped display; rejects references from another namespace/kind or noncanonical input at runtime.

Namespace and kind are both part of the TypeScript brand. Existing random `Reference<P>` values have a different brand.

## Validation order

Use the common [input presentation rules](../SPEC.md#parsing-and-error-precedence): type/128-code-unit bound, ASCII, case, HRP grammar, exact grouping, alphabet, then checksum. For this format the HRP grammar requires the trailing underscore.

After a valid checksum: check namespace; require two header symbols; check version; check kind; check payload length; check numeric overflow; reject a nonminimal uint64; then apply strict canonical-input rules when requested. Unknown kinds/versions are rejected, never interpreted as legacy payloads. Neither database existence nor authorization is tested by a decoder.

`DecodeError` includes the existing parser errors plus `version`, `kind`, and `overflow`. Diagnostics can contain `positions`, `expected`, `actual`, and `unit`. Positions are zero-based UTF-16 offsets in the **original** input, including surrounding whitespace and grouping. Non-BMP characters report the offset of their first surrogate. Length units are explicit: `input_code_units`, `data_symbols` (header included), or `payload_symbols` (header/checksum excluded). Positions are supplied only for known invalid characters, not guessed checksum-error locations. Checksum failures have empty details.

## Compatibility commitment

The v1 layout, canonical encoding and accepted presentation forms defined here are frozen. Changes to that wire contract require a new version and reader; they must not change v1 output. Package APIs may continue to evolve during alpha. Explicit versioning does not authorize removal of v1 readers from deployed applications.

The alpha.1 random-reference format remains available through `createReferences`, with its generation, parsing and error-result shapes preserved. Its HRP grammar prohibits underscores. The new HRP requires one, so the formats are structurally disjoint even when the namespace and data lengths happen to match. Each API rejects the other's format. Do not fall back from a failed v1 parse to guessing a legacy ID or another version.

Frozen compatibility vectors live in [tests/fixtures/formats-v1.json](https://github.com/PerchAnton/refmint/blob/main/tests/fixtures/formats-v1.json). They cover small and maximal uint64 values, the JavaScript precision boundary, UUID bit preservation, a namespace containing separator digits, and legacy codes. They were generated once with the independent `bech32@2.0.0` implementation and radix-32 conversion. Tests compare exact text and recovered values; do not regenerate vectors to make an incompatible implementation pass.
