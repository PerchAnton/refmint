# Security

RefMint generates **public lookup references**. It does not generate or verify authentication tokens, passwords, signatures or authorization grants. A checksum can be recomputed by anyone. Prefixes disclose the configured record type; codes contain no timestamp or machine identity.

Keep a unique database constraint, retry conflicts with a limit, authorize lookups, and rate-limit public endpoints. Collision calculations assume independent uniform generation across the namespace's whole lifetime. A checksum does not improve collision entropy. Never fall back to `Math.random` when Web Crypto is unavailable.

Do not attempt to repair an invalid code automatically: a guessed correction can select the wrong record. The parser only normalizes the presentation differences documented in SPEC.md.

For a potential vulnerability, use GitHub's private vulnerability reporting if available, or contact the repository owner through their GitHub profile without disclosing exploit details in a public issue. Ordinary reproducible bugs belong in issues. This alpha has not had an independent security audit.
