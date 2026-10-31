# Decide whether another reference is useful

Start from a support task that is currently difficult, not from a preferred ID
library. If users already paste a link or find the right record using ObjectId,
an invoice number, a name or a hostname, keeping that workflow may be best.
RefMint's checksum can reject some mistyped public references before lookup; it
does not speed up a database query, identify a customer or grant access.

| Existing workflow | First choice | What RefMint would add |
| --- | --- | --- |
| ObjectId with working search or copied links | Keep ObjectId and the current search | No built-in ObjectId codec; a new alias requires a field/mapping or a separately specified codec |
| A short ticket or invoice number people already use reliably | Keep the number | A longer checked representation, new terminology and training |
| Repeated manual entry of uint64 or UUID values with measured mistakes | Compare current input, a simple alias and RefMint | Reversible checked presentation of the same ID; no additional alias column required |
| Copy/paste or QR scanning | Improve that path first | Checksum validation may still detect some corruption, but faster human entry is unproven |
| Secret invitation or authenticated lookup | Use the application's security design | Nothing: a public reversible checksum is not a credential |

Do not truncate an ObjectId to uint64, pretend it is a UUID, or silently convert
an unsupported identifier. Such changes lose information or create an undocumented
format. A new codec should follow a demonstrated need and an explicit compatibility
contract. BookCars and Movinin feedback showed no established need beyond their
existing ObjectId workflow; a later stable RefMint release would not invalidate
that decision or constitute permission to resume an integration.

## Account for the integration cost

For a random alias stored alongside an existing key, budget for the new field or
mapping table, unique index, collision retries, backfill, deletion/retention rules,
backup/restore and tenant boundaries. Decide whether aliases can ever be reused.
Both a simple alias and a RefMint random reference have these lifecycle costs.

For the existing uint64/UUID codec, decoding returns the original key, so a mapping
can be avoided. You still own namespace/version selection, input validation,
presentation, error messages, old-reader retention, tests, dependency upgrades and
support documentation. Keep existing URLs, regulated numbers and search available.
Do not store display grouping as a different key from canonical storage.

All routes must apply the same server-side tenant and permission checks. RefMint
does not prove record existence or prevent a valid reference from selecting the
wrong record. Ask users to confirm record context before sensitive operations.

## Decide on evidence

Define the actual problem and acceptable costs before testing. Use
[the manual-entry protocol](manual-entry-study.md) and retain a no-adoption outcome.
A checksum test demonstrates an algorithmic property; it does not demonstrate
less support work, fewer human errors, faster entry or a product's need for RefMint.
No such human-entry advantage is currently established. An opt-in pilot is an
evaluation, not proof of adoption or readiness for all users.
