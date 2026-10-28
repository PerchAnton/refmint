# When RefMint is unnecessary

Start with the identifier and search workflow users already know.

| Situation | Prefer |
| --- | --- |
| Existing invoice/quote numbers or hostnames are short and lookup works | Keep them; a second identifier creates training and maintenance cost |
| People paste a link, scan a QR code, or never type an identifier | Improve that flow first; no manual-entry benefit has been demonstrated |
| A five-character local alias handles the support case | A small unique alias mapping, if its lifecycle is manageable |
| You need compact general-purpose random IDs | An established ID generator; checksum overhead may not help |
| A regulated number or a string with leading zeros must be preserved | Keep its exact string; the uint64 codec is not a numbering-system replacement |
| Your dependency policy excludes prereleases | Wait or use a supported stable alternative |
| You need a credential, signature, unguessable access link or encrypted ID | An appropriate security design; never a public checksum |

RefMint is worth evaluating when people repeatedly enter a **public** reference and
the application benefits from consistent namespaces, display forms and diagnostics.
There is no demonstrated human-entry speedup, reduced support cost, or confirmed need
in Octofleet/Invoice Builder from the current synthetic demo.

## npm availability and compatibility are separate

The package is **alpha**, even when `npm install refmint` resolves to it. Registry tags
are distribution pointers; they do not certify stability. Pin the reviewed version and
check your organization's policy before adopting it.

The existing-ID **v1 wire contract is already frozen**: canonical encoding and accepted
presentation forms must remain compatible; incompatible formats require a new version
and reader. That commitment is described in [format-v1.md](format-v1.md) and checked
with frozen vectors. It does not promise a stable alpha API, operational support, or
that an application can safely remove old readers. Keep version/kind/namespace choices
with your schema and test migrations. npm publication alone adds no compatibility promise.

For the separate random-reference API, persist the configured prefix and payload length;
do not recalculate them from the current row count. See [SPEC.md](../SPEC.md).

## A checksum is not authorization

Anyone can generate or recompute a checksum, including for another valid existing ID.
The codec is reversible and does not hide sequential IDs. Always enforce authorization
on the server and confirm the intended record before sensitive actions. Error detection
does not prove the sender, document authenticity, record existence or permission.

[Evaluate all three routes](workflows.md) before adding another reference to a product.
