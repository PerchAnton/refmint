# Contributing

Start with a concrete reproduction: what reference was entered, expected behavior, actual behavior, runtime and version. Use synthetic public references; do not post private records or access tokens.

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm check`. Run `pnpm test:package` to verify the installed archive's API, types and documents. Builds replace `dist/`; do not keep hand-written files there. Changes to the demo server need `pnpm test:demo` (uses an ephemeral loopback port). Changes to parsing or the form also need `pnpm test:browser` after installing Playwright's browser engines. Keep the format specification and examples consistent. Add a regression that demonstrates a real failure, and retain the standard vectors and independent oracle.

Use `refmint/<task>` for branches. Keep the runtime dependency-free and the API focused. New formats, frameworks or language ports need a demonstrated consumer need. Evidence must describe the environment and measurement method; no unsupported performance or adoption claims.

After runtime changes, run `pnpm evidence` before `pnpm test:package`: the package check compares the installed JavaScript with the measured hashes. Builds use LF line endings on every platform. The evidence command regenerates recorded measurements and the README graphic and labels the new environment. Do not replace another machine's measurements without that label. Contributions to original code are under MIT OR Apache-2.0; preserve third-party notices.

For the existing-ID format or comparison, run `pnpm compare` after the build and `pnpm test:comparison` to verify recorded source hashes and deterministic facts. Do not change frozen v1 vectors to accommodate an incompatible layout. The independent Bech32m adapter must not import RefMint helpers; keep both forms' inputs, validation contract and shared UI equivalent. Report library size and reference-length costs alongside any reduction in adapter code.

The build keeps JSDoc in declarations and removes comments only from emitted JS. Keep the full-root and codec-only size figures separate; include compression costs. After runtime changes, refresh the historical comparison with `pnpm compare:previous PATH_TO_PREVIOUS_DIST FULL_COMMIT_SHA` as described in [comparison methods](docs/comparison.md#before-and-after-optimization). The recorded previous baseline is `daaffe813fd0351752bd158314917267acddc1b6`. Do not compare historical timings collected on different machines as a before/after speedup.

## API compatibility

Preserve the [1.0 preparation contract](docs/stable-contract.md). Run
`pnpm test:compatibility` to compare the packed candidate against SHA-512-pinned
alpha.3 and beta.2; `pnpm test:package` runs the same matrix on its exact archive.
The two historical downloads require network access, fail closed on integrity
errors, and install offline with ignored scripts and no runtime dependencies.
Do not replace their pins or regenerate historical vectors to hide a break.
Keep the TypeScript consumer and both writer/reader directions covered.
Temporary consumers and archives are removed even after failures.

## Preparing and publishing a release

Follow [the release procedure](docs/releasing.md) and [support policy](docs/support.md).
Stable versions use `latest`; alpha uses `alpha`; beta/RC uses `beta`. Both
`publishConfig.tag` and the explicit publication tag must agree. The package gate
checks the channel. Use `pnpm test:package /absolute/path/to/candidate.tgz` to
qualify an existing final archive without rebuilding it. Publication is a separate
owner decision on a clean, reviewed commit with successful CI.

The first npm alpha.2 archive has updated README, changelog and contributor documentation. All other files match the original GitHub alpha.2 archive; the original tag, download and checksums remain intact. Future releases should prepare registry instructions before creating either archive.

After a package exists, npm supports [trusted publishing from GitHub Actions](https://docs.npmjs.com/trusted-publishers/). Configure it against an actual reviewed publication workflow before using it; a repository link alone does not grant publishing access. This repository's CI currently verifies packages and does not publish them.
