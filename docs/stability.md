# Alpha scope and stability criteria

RefMint 0.1.0-alpha.3 is a prerelease. npm publication and successful CI do not
change that status. Pin the exact reviewed version for an evaluation and keep the
existing identifier/search path available. There is no stable-release date promised.

The [existing-ID v1 wire contract](format-v1.md) freezes its layout, canonical
encoding and accepted presentation forms. Incompatible wire changes require a new
version and reader. This is not a promise that the alpha API, error diagnostics,
supported environments or support policy will never change. Applications must
retain the readers needed for references they have already issued.

## Criteria before a stable release

- Review and freeze the public API and error behavior; document any migration from
  alpha with examples, including rejected input and exact integer handling.
- Verify released-format compatibility against the retained frozen vectors and an
  independent implementation; never update old vectors to conceal incompatibility.
- Verify the exact package archive in supported Node/browser environments, including
  TypeScript consumers, and record its source identity and checksums.
- Resolve known correctness/security blockers and document remaining limits,
  versioning, deprecation and maintenance policies.
- Review consumer feedback and document concrete supported uses, integration cost
  and an exit/migration path. Any claim of faster entry or fewer human mistakes
  additionally requires human evidence with its method and limitations published.

These are gates to review, not a statement that all are already met. The current
synthetic tests and release records cover only their named properties and versions.
A stable API could be useful without a speed advantage; conversely, a faster
single-person trial would not establish API stability.

## Stability is not an adoption requirement by itself

A stable release can remove a prerelease-policy obstacle. It cannot create a
manual-entry problem where existing IDs and search already work. Adoption remains
a separate product decision, including the dependency and operational costs in
[the decision guide](adoption.md). Do not reopen declined integrations just because
the version label changes.
