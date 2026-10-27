# Contributing

Start with a concrete reproduction: what reference was entered, expected behavior, actual behavior, runtime and version. Use synthetic public references; do not post private records or access tokens.

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm check`. Run `pnpm test:package` to verify the installed archive's API, types and documents. Builds replace `dist/`; do not keep hand-written files there. Changes to the demo server need `pnpm test:demo` (uses an ephemeral loopback port). Changes to parsing or the form also need `pnpm test:browser` after installing Playwright's browser engines. Keep the format specification and examples consistent. Add a regression that demonstrates a real failure, and retain the standard vectors and independent oracle.

Use `refmint/<task>` for branches. Keep the runtime dependency-free and the API focused. New formats, frameworks or language ports need a demonstrated consumer need. Evidence must describe the environment and measurement method; no unsupported performance or adoption claims.

After runtime changes, run `pnpm evidence` before `pnpm test:package`: the package check compares the installed JavaScript with the measured hashes. Builds use LF line endings on every platform. The evidence command regenerates recorded measurements and the README graphic and labels the new environment. Do not replace another machine's measurements without that label. Contributions to original code are under MIT OR Apache-2.0; preserve third-party notices.

For the existing-ID format or comparison, run `pnpm compare` after the build and `pnpm test:comparison` to verify recorded source hashes and deterministic facts. Do not change frozen v1 vectors to accommodate an incompatible layout. The independent Bech32m adapter must not import RefMint helpers; keep both forms' inputs, validation contract and shared UI equivalent. Report library size and reference-length costs alongside any reduction in adapter code.

The build keeps JSDoc in declarations and removes comments only from emitted JS. Keep the full-root and codec-only size figures separate; include compression costs. After runtime changes, refresh the historical comparison with `pnpm compare:previous PATH_TO_PREVIOUS_DIST FULL_COMMIT_SHA` as described in [comparison methods](docs/comparison.md#before-and-after-optimization). The recorded previous baseline is `daaffe813fd0351752bd158314917267acddc1b6`. Do not compare historical timings collected on different machines as a before/after speedup.
