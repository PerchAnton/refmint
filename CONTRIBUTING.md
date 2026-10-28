# Contributing

Start with a concrete reproduction: what reference was entered, expected behavior, actual behavior, runtime and version. Use synthetic public references; do not post private records or access tokens.

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm check`. Run `pnpm test:package` to verify the installed archive's API, types and documents. Builds replace `dist/`; do not keep hand-written files there. Changes to the demo server need `pnpm test:demo` (uses an ephemeral loopback port). Changes to parsing or the form also need `pnpm test:browser` after installing Playwright's browser engines. Keep the format specification and examples consistent. Add a regression that demonstrates a real failure, and retain the standard vectors and independent oracle.

Use `refmint/<task>` for branches. Keep the runtime dependency-free and the API focused. New formats, frameworks or language ports need a demonstrated consumer need. Evidence must describe the environment and measurement method; no unsupported performance or adoption claims.

After runtime changes, run `pnpm evidence` before `pnpm test:package`: the package check compares the installed JavaScript with the measured hashes. Builds use LF line endings on every platform. The evidence command regenerates recorded measurements and the README graphic and labels the new environment. Do not replace another machine's measurements without that label. Contributions to original code are under MIT OR Apache-2.0; preserve third-party notices.

For the existing-ID format or comparison, run `pnpm compare` after the build and `pnpm test:comparison` to verify recorded source hashes and deterministic facts. Do not change frozen v1 vectors to accommodate an incompatible layout. The independent Bech32m adapter must not import RefMint helpers; keep both forms' inputs, validation contract and shared UI equivalent. Report library size and reference-length costs alongside any reduction in adapter code.

The build keeps JSDoc in declarations and removes comments only from emitted JS. Keep the full-root and codec-only size figures separate; include compression costs. After runtime changes, refresh the historical comparison with `pnpm compare:previous PATH_TO_PREVIOUS_DIST FULL_COMMIT_SHA` as described in [comparison methods](docs/comparison.md#before-and-after-optimization). The recorded previous baseline is `daaffe813fd0351752bd158314917267acddc1b6`. Do not compare historical timings collected on different machines as a before/after speedup.

## Publishing an alpha

Use a clean, reviewed commit and verify that its CI passed. Keep the version, changelog and evidence version in sync. A published npm name/version cannot be reused. For a prerelease, keep both `publishConfig.tag` and the explicit publication tag set to `alpha`.

1. Run `pnpm check`, `pnpm test:demo`, `pnpm test:comparison`, `pnpm test:workflows` and `pnpm test:package`; the matching CI must also cover browsers, PDF extraction/lookup and the supported Node/OS matrix.
2. Pack with `pnpm pack --pack-destination artifacts`. Record the commit, package SHA-256 and npm SHA-512 integrity. Inspect the file inventory and install this exact archive into an isolated consumer before publication.
3. Authenticate to `https://registry.npmjs.org` with `npm login --auth-type=web`. Enter passwords and second-factor challenges only in npm's login flow. Never commit credentials or put them in an issue/PR. Direct publication requires account 2FA or another authentication method supported by npm; prefer the interactive account flow for the first release.
4. Run `npm publish ./artifacts/refmint-VERSION.tgz --dry-run --ignore-scripts --tag alpha --access public --registry=https://registry.npmjs.org`, substituting the actual version. Inspect the name, version, files and integrity. Then publish the same archive by removing only `--dry-run`.
5. Read the public registry metadata back. Check the version, `alpha` tag and tarball integrity, then install `refmint@alpha` in a fresh consumer and exercise both `refmint` and `refmint/codec`. Download the registry tarball and compare it with the published archive. Keep the proof with the release record.

The first npm alpha.2 archive has updated README, changelog and contributor documentation. All other files match the original GitHub alpha.2 archive; the original tag, download and checksums remain intact. Future releases should prepare registry instructions before creating either archive.

After a package exists, npm supports [trusted publishing from GitHub Actions](https://docs.npmjs.com/trusted-publishers/). Configure it against an actual reviewed publication workflow before using it; a repository link alone does not grant publishing access. This repository's CI currently verifies packages and does not publish them.
