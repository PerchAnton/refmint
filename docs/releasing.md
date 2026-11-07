# Release channels and exact-archive qualification

This branch prepares **1.0.0**. It does not publish it, move registry tags, or
approve a consumer dependency update. Use the published beta until a stable
release is explicitly announced. Package versions and wire v1 are independent.

## Channels

| Version | `publishConfig.tag` and explicit npm `--tag` | Intended use |
| --- | --- | --- |
| `X.Y.Z-alpha.N` | `alpha` | Experimental previews |
| `X.Y.Z-beta.N` or `X.Y.Z-rc.N` | `beta` | Compatibility/release trials |
| `X.Y.Z`, major at least 1 | `latest` | Reviewed stable releases |

`latest` is npm's default install channel; there is no separate `stable` alias.
Never send a prerelease to `latest`, or a stable build to a preview tag. The
package gate checks this policy in both the checkout and installed archive.
It intentionally rejects unsupported prerelease labels, leading-zero numeric
identifiers and build metadata; this is our release policy, not a SemVer parser.
A dist-tag is mutable routing, not an integrity or compatibility guarantee.
Consumers should use an exact version and retain their lockfile.

A beta publication changes only `beta`; a stable publication changes only
`latest`. Preserve `alpha` and the previous `beta` for explicit trials. Record
all registry tags immediately before and after publication. Never reassign a
published name/version or relabel an old beta archive as 1.0.0. See npm's
[publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) and
[dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/) documentation.

## Before publication

The owner approves release separately from merging a preparation PR. No workflow
in this repository publishes automatically. Use a clean, reviewed commit whose
CI passed on that exact head, including Node/OS, browser and PDF jobs.

1. Update version, channel, changelog and evidence version together. Keep old
   measurement dates and environments when the runtime is unchanged; label the
   carry-forward. Runtime changes require fresh evidence and compatibility checks.
2. Run `pnpm check`, `pnpm test:demo`, `pnpm test:comparison`,
   `pnpm test:workflows` and `pnpm test:package`. Review known bugs/security reports,
   the [support policy](support.md), [API contract](stable-contract.md), and
   [migration checks](migration-alpha3-to-1.md). Preserve all frozen vectors.
3. Pack once into a directory outside the checkout:

   ```sh
   pnpm pack --pack-destination /absolute/path/to/release-artifacts
   pnpm test:package /absolute/path/to/release-artifacts/refmint-1.0.0.tgz
   ```

   The second command does **not** rebuild or repack. It installs that archive
   offline, checks metadata/channel, inventory, licenses, documentation, runtime
   hashes against the reviewed checkout evidence, types and the
   alpha.3/beta.2/candidate matrix, then prints SHA-256 and
   npm SHA-512 integrity. It checks the archive did not change during validation.
   Temporary consumers/stores are removed on success or failure. Keep the exact
   qualified archive for publication; if its bytes or source change, qualify again.
4. Record commit, CI URLs, commands/results, platform versions, package inventory,
   SHA-256 and SHA-512 integrity in the release record. The file hash identifies
   the candidate; a record containing its own archive hash must live outside it.
5. Authenticate to `https://registry.npmjs.org` using npm's web login/2FA flow.
   Enter secrets only there. Trusted publishing requires a separately configured
   and reviewed workflow; a repository URL does not grant publish permission.
6. Preview the **same archive** with the explicit channel:

   ```sh
   npm publish /absolute/path/to/release-artifacts/refmint-1.0.0.tgz --dry-run --ignore-scripts --tag latest --access public --registry=https://registry.npmjs.org
   ```

   Check name, version, inventory and integrity against step 4. For previews use
   their exact filename and `--tag alpha` or `--tag beta` from the table. A dry run
   does not prove authentication, registry acceptance or successful publication.

## Publication and rollback

After explicit release approval, publish the qualified archive with the same
command, removing only `--dry-run`. Read registry metadata back, verify the chosen
tag/version and unchanged other tags, download the public tarball and compare its
integrity and bytes. Install that registry archive in a fresh consumer and run
`pnpm test:package /absolute/path/to/downloaded.tgz` from the same checkout.
Attach the qualified archive, hashes and evidence to the matching GitHub release.
Do not claim publication until registry readback succeeds.

For a bad release, stop rollout and communicate the affected versions. Publish a
new version for a fix; never overwrite an existing one. Deprecation or moving
`latest` back requires an explicit owner decision and preserved evidence. A tag
rollback does not change existing lockfiles or already-installed applications.
Application owners decide when to revert their exact pin and deploy the old build.
Retain the v1 reader/configuration so newly issued codes still work after rollback;
see the [migration guide](migration-alpha3-to-1.md). Stable release approval does
not approve Billetsys deployment, permissions, or enabling its feature flag.
