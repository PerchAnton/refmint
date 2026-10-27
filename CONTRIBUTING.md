# Contributing

Start with a concrete reproduction: what reference was entered, expected behavior, actual behavior, runtime and version. Use synthetic public references; do not post private records or access tokens.

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm check`. Changes to the form also need `pnpm test:browser` after installing Playwright's browser engines. Keep the format specification and examples consistent. Add a regression that demonstrates a real failure, and retain the standard vectors and independent oracle.

Use `refmint/<task>` for branches. Keep the runtime dependency-free and the API focused. New formats, frameworks or language ports need a demonstrated consumer need. Evidence must describe the environment and measurement method; no unsupported performance or adoption claims.

`pnpm evidence` regenerates recorded measurements and the README graphic. Do not replace another machine's measurements without labeling the new environment. Contributions to original code are under MIT OR Apache-2.0; preserve third-party notices.
