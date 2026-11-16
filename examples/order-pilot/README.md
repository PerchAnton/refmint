# Order lookup pilot

Compare a UUID, an eight-character alias and a RefMint random reference in a
small, participant-operated lookup task. This is a new protocol, not a reanalysis
of the earlier invoice pilot. [The first completed session](results-2026-11-16.md)
provided five valid manual observations and exposed instruction problems; it
does not establish a practical advantage.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm demo
```

Open <http://127.0.0.1:4173/order-pilot/>. Enter a participant code, not a name or
email. The page uses fictional orders and stores results only in this browser's
local storage. Download the JSON before clearing site data. To start a different
participant, use a fresh browser profile or clear this site's storage.
If downloading is unavailable, **Show JSON on this page** provides a selectable
copy of the same results, including partial state and exclusions.

## What to do

1. Press **Start this task**. Timing starts here.
2. Enter the entire **Code on the card**, including its separators. Do not enter
   the label “Example order …”. In manual tasks type it; in paste tasks use
   **Copy code**, then paste it into **Code to look up**.
3. Press **Search**, check the returned order label, then explicitly confirm the
   record. A successful lookup alone does not finish the task.

There are three practice tasks and twelve measured tasks: two repetitions for
each of three formats in manual and paste modes. Order is randomized within
practice and measured blocks. Practice is excluded from the summary. Reloading
or hiding the page interrupts the active task; partial results stay partial.
Tasks time out after 90 seconds. Failed and timed-out measured tasks stay in the
denominator; medians describe successful tasks only. Paste in a manual task is
blocked and recorded as a deviation. A paste-mode success without a paste event
is also excluded as a deviation. A lookup submitted before any paste event
remains a deviation even if the participant pastes later in the same task.

Optional spoken tasks require a **second real person** to read the card without
showing it to the participant. Select that option only when a reader is present.
They add three tasks and must be reported separately. This is not a telephone or
production support study. Do not automate the form and count that as a person.

## Fair comparison and costs

The short-alias baseline matters: [r10c#577](https://github.com/r10c-technologies/r10c/issues/577)
already proposes an eight-character reference. A checksum adds characters; it
does not automatically improve lookup time or reduce human errors.

| Format | Random payload | Printed characters |
| --- | --- | ---: |
| UUID v4 | 122 random bits | 36 |
| Alias | 40 random bits | 9, including one separator |
| RefMint `ord` | 40 random bits | 21, including grouping |

The random alias and RefMint use the same payload size, while UUID is a familiar
baseline with a larger space. Forty bits is a pilot choice, **not a production
capacity recommendation**. Measure real workload size and collision budget.
Report sample sizes, errors, timeouts, exclusions, and manual/paste/spoken
results separately. One participant cannot establish a population advantage.

## Application boundary model

`model.mjs` demonstrates unique-reference allocation with bounded collision
redraw, an owner-scoped idempotency key, unchanged primary UUIDs and a separate
owner check during lookup. An exact retry returns the same stored reference;
reusing a key for a different basket is rejected. Responses are copies.

This synchronous in-memory model is **not** a database concurrency test or an
authentication system. A production host needs a unique index, a transaction
covering allocation and idempotency, authenticated ownership checks, retention
rules and a migration plan. Checksums do not authorize access. Keep an existing
order number and search when they already work adequately.

## Checks

```sh
node --test tests/order-pilot.test.mjs
pnpm exec playwright test tests/browser/order-pilot.spec.mjs
```

These checks exercise the model, explicit confirmation, practice exclusion,
partial exports and interrupted tasks. They verify the apparatus and are not
human usability results. Existing invoice PDF and lookup demos remain separate.
