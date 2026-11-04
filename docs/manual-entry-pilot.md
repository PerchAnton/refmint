# Manual-entry pilot — 4 November 2026

This small pilot **does not establish a practical advantage for RefMint**. One
participant, the project owner, completed two manual tasks and one copy/paste task
per format. RefMint was slower than the existing number and short alias in both
modes. The raw per-task times used for the table are in the
[de-identified numeric record](evidence/manual-entry-pilot.json).

| Format | Characters shown | Manual: confirmed lookup median | Incorrect manual queries | Paste: confirmed lookup time | Incorrect paste queries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Number | 15 | 8.7 s (2 tasks) | 0 | 4.4 s (1 task) | 0 |
| UUID | 36 | 33.9 s (2 tasks) | 1 | 4.6 s (1 task) | 0 |
| Alias | 5 | 5.1 s (2 tasks) | 0 | 3.4 s (1 task) | 0 |
| RefMint | 21 | 13.1 s (2 tasks) | 0 | 7.0 s (1 task) | 0 |

All twelve measured tasks were completed without interruption or a protocol
violation. The UUID error was a correctly shaped code with no matching record;
no wrong record was confirmed. Zero RefMint errors in two manual tasks does not
establish fewer mistakes or measure the benefit of its checksum.

## Method and limits

The source card stayed visible. The participant entered its code, searched the
same in-memory set of 120 synthetic records and confirmed the record name. Timing
ran from showing the card to confirmation, including reading, input, local lookup
and the confirmation click. These are workflow times, not codec benchmarks.

The number used `INV-2026-` plus six digits; UUID used its 36-character display;
the alias used five characters. RefMint used alpha.3's uint64 codec, namespace
`invoice`, wire version 1, a three-digit numeric ID and formatted 21-character
output. RefMint did **not** encode the UUID, so this comparison cannot establish
an advantage for UUID-derived references. The routes and record lengths are fixed.

Four practice tasks were excluded. During the first practice task, unclear wording
led the participant to search by the record's label instead of its full code and
the task timed out. The instructions were clarified before any measured task;
the remaining twelve targets and their order were unchanged. This was a coached
single-person pilot, not a blinded or independent study.

Manual order: alias / RefMint / number / UUID, then UUID / number / RefMint / alias.
Paste order: RefMint / alias / UUID / number. This partial order reversal does not
remove learning, fatigue, code-length or order effects. Corrections before a query
were not fully observed; deletion actions are not a count of typos. The very small
sample supports description only, without significance tests or population claims.

## Decision

Keep an existing number or alias when it serves the task. This pilot provides no
reason to add RefMint to that workflow and no copy/paste speed advantage. Test a
specific unmet need before integration; source ownership, migration, lookup fields
and authorization remain costs even if a later study finds an input advantage.
The [study protocol](manual-entry-study.md), [PDF demo](workflows.md) and existing
synthetic comparisons remain separate evidence with their original scope.
