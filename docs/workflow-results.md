# Local lookup results

Synthetic fixtures, recorded 28 October 2026. No production support cases or human timing data.

| Domain | Route | Canonical characters | Printed characters |
| --- | --- | ---: | ---: |
| fleet | existing | 8 | 8 |
| fleet | alias | 5 | 5 |
| fleet | refmint | 41 | 49 |
| invoice | existing | 15 | 15 |
| invoice | alias | 5 | 5 |
| invoice | refmint | 19 | 21 |

| Domain | Route | Case | Result | Logical lookups | Different record from intended? |
| --- | --- | --- | --- | ---: | --- |
| fleet | existing | Exact | found | 1 | no |
| fleet | existing | Printed / pasted | found | 1 | no |
| fleet | existing | One-symbol change | found | 1 | yes |
| fleet | existing | Truncated | ambiguous | 1 | no |
| fleet | existing | Wrong record type | not_found | 1 | no |
| fleet | existing | Valid but unknown | not_found | 1 | no |
| fleet | existing | Outside allowed scope | not_found | 1 | no |
| fleet | existing | Another valid code | found | 1 | yes |
| fleet | existing | Empty | invalid (input) | 0 | no |
| fleet | alias | Exact | found | 1 | no |
| fleet | alias | Printed / pasted | found | 1 | no |
| fleet | alias | One-symbol change | found | 1 | yes |
| fleet | alias | Truncated | not_found | 1 | no |
| fleet | alias | Wrong record type | not_found | 1 | no |
| fleet | alias | Valid but unknown | not_found | 1 | no |
| fleet | alias | Outside allowed scope | not_found | 1 | no |
| fleet | alias | Another valid code | found | 1 | yes |
| fleet | alias | Empty | invalid (input) | 0 | no |
| fleet | refmint | Exact | found | 1 | no |
| fleet | refmint | Printed / pasted | found | 1 | no |
| fleet | refmint | One-symbol change | invalid (checksum) | 0 | no |
| fleet | refmint | Truncated | invalid (checksum) | 0 | no |
| fleet | refmint | Wrong record type | invalid (prefix) | 0 | no |
| fleet | refmint | Valid but unknown | not_found | 1 | no |
| fleet | refmint | Outside allowed scope | not_found | 1 | no |
| fleet | refmint | Another valid code | found | 1 | yes |
| fleet | refmint | Empty | invalid (input) | 0 | no |
| invoice | existing | Exact | found | 1 | no |
| invoice | existing | Printed / pasted | found | 1 | no |
| invoice | existing | One-symbol change | found | 1 | yes |
| invoice | existing | Truncated | not_found | 1 | no |
| invoice | existing | Wrong record type | not_found | 1 | no |
| invoice | existing | Valid but unknown | not_found | 1 | no |
| invoice | existing | Outside allowed scope | not_found | 1 | no |
| invoice | existing | Another valid code | found | 1 | yes |
| invoice | existing | Empty | invalid (input) | 0 | no |
| invoice | alias | Exact | found | 1 | no |
| invoice | alias | Printed / pasted | found | 1 | no |
| invoice | alias | One-symbol change | found | 1 | yes |
| invoice | alias | Truncated | not_found | 1 | no |
| invoice | alias | Wrong record type | not_found | 1 | no |
| invoice | alias | Valid but unknown | not_found | 1 | no |
| invoice | alias | Outside allowed scope | not_found | 1 | no |
| invoice | alias | Another valid code | found | 1 | yes |
| invoice | alias | Empty | invalid (input) | 0 | no |
| invoice | refmint | Exact | found | 1 | no |
| invoice | refmint | Printed / pasted | found | 1 | no |
| invoice | refmint | One-symbol change | invalid (checksum) | 0 | no |
| invoice | refmint | Truncated | invalid (checksum) | 0 | no |
| invoice | refmint | Wrong record type | invalid (prefix) | 0 | no |
| invoice | refmint | Valid but unknown | not_found | 1 | no |
| invoice | refmint | Outside allowed scope | not_found | 1 | no |
| invoice | refmint | Another valid code | found | 1 | yes |
| invoice | refmint | Empty | invalid (input) | 0 | no |

A valid code for another record still passes its checksum. Scope restrictions apply equally to all routes.
The one-symbol cases were selected to expose a failure mode, not sampled to estimate its frequency.
