# Maintenance and support policy

This policy is prepared for the first stable 1.x release. The 1.0.0 candidate is
not yet published. RefMint is maintained by PerchAnton on a best-effort basis;
there is no paid support, response-time SLA, promised release date or independent
security audit. Stable describes a compatibility commitment, not a security or
human-performance guarantee.

## Supported lines

- After 1.0 is published, fixes target the latest stable 1.x release. Older 1.x
  minors/patches are not separate maintained branches; update to the latest
  compatible patch/minor after application testing.
- Alpha/beta/RC versions are previews, not long-term support lines. Historical
  alpha.3/beta.2 archives and vectors remain compatibility baselines. Keeping
  previously issued codes readable does not promise backports to old packages.
- A future major must announce its migration/support plan before publication.
  Ending 1.x maintenance requires an explicit notice with the supported successor
  and migration path. No end date is assigned here, and no indefinite staffing
  or vulnerability-response guarantee is implied.

## Compatibility commitments

Keep the [public API contract](stable-contract.md) and [wire v1](format-v1.md).
Incompatible changes to public types, errors, accepted values, defaults or minimum
platform requirements require a major and migration notes. Additive changes must
also preserve exhaustive TypeScript consumers; an added union case is not
necessarily compatible. Deprecation must be documented with an alternative and
cannot remove working 1.x behavior in a minor or patch.

Old v1 and legacy random references must keep their identity and supported
normalization. Applications retain namespace/kind/version and random payload
length, and keep necessary readers for the lifetime of their issued references.
Do not replace fixtures to hide a failure. A security correction that affects
compatibility needs a regression, explicit impact analysis and a coordinated
repair/migration path, never silent reinterpretation as another record.

## Environments and reports

The supported baseline is Node 22+, native BigInt/ES2022 and ESM; secure Web Crypto
is required for random generation only. CI tests Node 22/24/26 on Linux, Node 24
on Windows/macOS, and the pinned Chromium/Firefox/WebKit engines. TypeScript is
checked with 5.9.3 in strict NodeNext. This is not every OS/runtime/browser version.
Removing a promised minimum environment is a breaking change. New combinations
need reproducible evidence before being advertised as tested.

For ordinary bugs, open an issue with exact package version, environment,
synthetic input, expected/actual results and a minimal reproduction. Keep private
records, credentials and account data out of reports. Report security concerns
through [SECURITY.md](../SECURITY.md). Consumer maintainers own authorization,
lookup/rate limits, uniqueness, rollout and rollback. Library tests cannot certify
those controls in a deployed application. See the [adoption guide](adoption.md).
