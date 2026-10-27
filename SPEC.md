# RefMint alpha.1 format and API

This is a narrow application of generic Bech32m, not a new checksum algorithm or a Bitcoin address implementation. Freeze a deployed namespace's prefix and random length. Alpha formats may change in later versions; no transparent migration is promised.

## Canonical representation

`prefix + "1" + randomPayload + checksum`

- Prefix: 1–16 lowercase ASCII letters/digits, starting with a letter. `1` is allowed in the prefix; the **last** `1` is the separator because the data alphabet excludes it.
- Payload: 8–64 symbols from `qpzry9x8gf2tvdw0s3jn54khce6mua7l` (the standard Bech32 alphabet, in that order). Default: 26.
- Checksum: six symbols of that alphabet, calculated over the prefix and payload using the BIP-350 constant `0x2bc830a3`.
- Maximum canonical length: 87 ASCII characters, below Bech32m's 90-character limit.
- Random bytes: `crypto.getRandomValues`, one byte per payload symbol. Mask each byte by 31. Because 256 is divisible by 32, every symbol has eight preimages; this introduces no modulo bias for uniform bytes. No timestamp, counter, machine fingerprint, user-provided seed or insecure fallback.

The public API does not encode arbitrary bytes, accept custom alphabets or expose a general-purpose Bech32m codec. The internal codec is checked against all 21 generic BIP-350 test vectors and the independent `bech32` package in development tests.

## Length planning

Let `L` be payload length, `n` the expected total number issued in one namespace, and `S = 32^L`. Under independent, uniform sampling:

- Expected colliding pairs: `n(n-1)/(2S)`.
- Conservative union bound for at least one collision: `min(1, n(n-1)/(2S))`.
- Birthday approximation: `-expm1(-n(n-1)/(2S))`.

`planReferences` selects the shortest integer `L` in 8–64 whose **union bound** fits the requested maximum. It does not use the approximation to accept a budget. The returned `collisionProbability` is explicitly the approximation, while `collisionUpperBound` is the bound. Neither accounts for faulty randomness or application bugs. Inputs must be finite; `n` must be a positive safe integer and the target strictly between 0 and 1. An unattainable target throws. Count every issuer and every issued code, including deleted records; prefixes and checksum characters do not enlarge the random space within a namespace.

The pair count is calculated exactly with BigInt and rounded upward, when necessary, before division by the exact power-of-two space size. This prevents floating-point rounding from understating the bound at large counts; the approximation remains a separate value.

For one code `n=1`, pairwise collision probability is zero and the planner still enforces the eight-character minimum. This does not imply resistance to guessing; collision risk and secrecy are different properties. Use these codes only as public references, not access credentials.

## Parsing and error precedence

`parse` accepts unknown input and returns a discriminated result; malformed input does not throw. Configuration errors and unavailable random sources do throw.

1. Non-string → `type`; raw input longer than 128 UTF-16 code units → `too_long` before further work.
2. Any non-ASCII character → `character`, before case folding. This includes Unicode whitespace and lookalikes such as `K`; they cannot normalize to an ASCII code. Trim surrounding ASCII space, tab, CR and LF.
3. Mixed upper/lowercase letters → `case`. Uniform uppercase is normalized to lowercase.
4. Find the last `1` and validate prefix syntax; malformed prefix/separator → `format`.
5. Ungrouped body is accepted. If hyphens occur, every group except the last must contain exactly four characters; last group must contain 1–4. Only these hyphens are removed; malformed groups → `format`.
6. A body symbol outside the fixed alphabet → `character`.
7. Verify generic Bech32m, including length and checksum → `checksum` on failure.
8. A valid but different namespace → `prefix`.
9. A valid namespace but different payload length → `length`.
10. In `parseCanonical`, any difference from the original input → `non_canonical`.
11. Return `{ ok: true, id, normalized }`; otherwise `{ ok: false, error }`.

Errors identify a validation stage, not necessarily the user's exact mistake. A damaged prefix cannot reliably be called the wrong record type until its checksum is valid. Neither parser searches a database or autocorrects a code. `format` accepts only a valid canonical reference for the factory and groups the entire body (payload + checksum) by four. The display representation is not itself canonical Bech32m; remove only documented presentation formatting before verification.

## Public exports

- `createReferences(options)` → immutable `{ prefix, plan, generate, parse, parseCanonical, format }`.
- `planReferences(options)` → immutable plan without generating an ID or requiring randomness.
- `collisionProbability(randomLength, count)` → birthday approximation, with the same supported length/count limits.
- Types: `Reference`, `ReferenceOptions`, `ReferencePlan`, `References`, `ParseError`, `ParseResult`.

Options: `{ prefix }` for the 26-character default; `{ prefix, randomLength }` for a fixed length; or `{ prefix, expectedCount, maxCollisionProbability }` for planning. The two sizing modes cannot be combined. Unknown options are rejected so a misspelled budget cannot silently select a default. Different prefixes have different TypeScript brands; lengths within one prefix are enforced at runtime.

The factory reads each option once during construction. Its namespace and immutable plan use that same snapshot, even when an option is supplied by a getter. Later changes to the options object do not reconfigure an existing factory.

## Evidence limits

The Bech32m specification describes checksum properties. Our finite mutation tests exercise selected fixtures; they do not independently prove all error patterns. Formatting normalization intentionally accepts case and separator differences, so those are not claimed as detected mutations. A valid checksum does not imply unique issuance, a real record, an authorized user, resistance to forgery or better human performance. A unique storage constraint and an authorization policy remain application responsibilities.
