# Reviewing an alpha.3 → 1.0 upgrade

[RefMint 1.0.0 is published](evidence/npm-1.0.0.json). This guide describes its
[API contract](stable-contract.md) and the checks required before upgrading.
Keep the consumer's current exact pin until the integration change has been
reviewed and tested. Installing a prerelease does not satisfy a stable-1.0
requirement, and npm dist-tags must not be used as compatibility evidence.

## Preferred path: keep v1 and the same API

The alpha.3 and beta.2 APIs are preserved in 1.0.0. Callers continue
to use the same imports, factory configuration and result checks:

```ts
import { createReferenceCodec } from 'refmint/codec';

const tickets = createReferenceCodec({ prefix: 'btk', kind: 'uint64', version: 1 });
const code = tickets.encode(42n); // btk_1pqp2cy59jf
const printed = tickets.format(code); // btk_1pqp2-cy59-jf
const result = tickets.decode(printed);
if (result.ok) {
  const existingId: bigint = result.value;
  // Apply the application's ID bounds and authorization before lookup.
}
```

For Billetsys, retain `btk` / uint64 / wire v1 and positive signed Java Long IDs.
Use exact decimal strings for JSON values beyond Number's safe-integer range;
converting an already-rounded Number to bigint cannot recover the original ID.
Keep the normal ticket routes, server permission checks and default-off feature
flag. The example and frozen application vectors are exercised by the installed
package compatibility matrix; they do not exercise a live Billetsys server.

1. Inventory previously issued codes and their namespace/kind/version or random
   prefix/length configuration. Preserve the old package and lockfile. Unknown
   deployment history is not evidence that no codes were issued.
2. Check `pnpm test:compatibility` on the exact candidate archive. Both directions
   matter: old codes must resolve in the candidate, and newly generated v1 codes
   must resolve in alpha.3 for mixed deployments and rollback. Preserve all old
   vectors, including boundary IDs and codes copied from synthetic documents.
3. After a stable version is published and accepted by the consumer's maintainers,
   update the exact dependency and lockfile in a separate integration PR. No
   intermediate beta.2 deployment is required. Keep API usage and format settings.
4. Run the application's existing tests and real permission/lookup checks, test
   missing/forbidden/wrong-record cases, and exercise old and new frontends together.
   In Billetsys retain the disabled/enabled bundle tests and lazy-loading behavior.
5. Test rollback of the package/bundle. With unchanged v1, new codes remain readable
   by the previous application. Keep ordinary identifier search available.

When those gates pass and format/configuration stay unchanged, there is **no
database migration, mapping table, backfill, ID replacement or code reissue**.
Printed/emailed codes keep their identity. Random-reference users must retain
their existing mapping, uniqueness constraints and namespace length.

## If an incompatible change becomes necessary

An API-only change needs explicit call-site migration or a compatible adapter;
it need not change stored identifiers. Prefer preserving the alpha.3 calls.

A necessary new wire format must get its own version and specification. Deploy
readers for both formats while still writing v1, then enable the new writer only
after consumer approval. Retain v1 readers for the lifetime of already-issued
references. A failed checksum or unknown version must not trigger fallback guessing.
After issuing v2, rollback must keep the dual reader: a v1-only binary cannot read
v2. Switching writers back to v1 does not undo codes already shared with users.

If a prior bug admitted ambiguous or invalid codes, isolate the affected case,
add a regression and agree a repair path. Never silently choose another record
or rewrite historical vectors. No such format change is required by this PR.

## Remaining release and integration decisions

Stable publication, release-channel checks, support/deprecation ownership and
consumer-native acceptance remain [release gates](stability.md). The library owner
reviews and publishes the package; consumer maintainers choose the pin, target
branch, timing, rollout and whether to enable the feature. There is no calendar
release promise here. The [pilot limitations](manual-entry-pilot.md), PDF demo and
security boundaries continue to apply; compatibility is not a speed claim.
