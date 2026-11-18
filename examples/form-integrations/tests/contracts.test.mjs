import Jedison from "jedison";
import { orderReferenceConstraint } from "../jedison/constraint.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  printed,
  mistyped,
  canonical,
  unknown,
  forbidden,
  otherNamespace,
  lookup,
  matchesShape,
  schema,
  referenceError,
  jsonSchema,
} from "../shared/reference.mjs";
import { referenceAjv } from "../shared/ajv.mjs";
test("selected typo passes shape regex but fails before lookup", () => {
  assert.ok(matchesShape(mistyped));
  assert.match(referenceError(mistyped), /checksum/);
  assert.equal(lookup(mistyped).lookups, 0);
});
test("valid presentation becomes the canonical lookup key", () => {
  assert.equal(lookup(printed).canonical, canonical);
  assert.equal(lookup(canonical).canonical, canonical);
});
test("valid codes do not establish existence or authorization", () => {
  assert.equal(lookup(unknown).status, 404);
  assert.equal(lookup(forbidden).status, 403);
  assert.equal(lookup(printed, "someone-else").status, 403);
});
test("the schema leaves raw input intact on success and reports field failures", () => {
  assert.equal(schema.parse({ reference: printed }).reference, printed);
  const r = schema.safeParse({ reference: mistyped });
  assert.equal(r.success, false);
  assert.deepEqual(r.error.issues[0].path, ["reference"]);
});
for (const raw of [
  "",
  null,
  123,
  "<script>alert(1)</script>",
  otherNamespace,
  printed.toLowerCase().slice(0, 4) + printed.slice(4),
  printed.replace("O", "Ｏ"),
])
  test(`invalid input ${JSON.stringify(raw)}`, () => {
    assert.equal(lookup(raw).status, 422);
    assert.equal(lookup(raw).lookups, 0);
  });
test("Ajv and Zod agree on accepted reference fixtures", () => {
  const validate = referenceAjv().compile(jsonSchema);
  for (const reference of [
    printed,
    canonical,
    mistyped,
    unknown,
    forbidden,
    otherNamespace,
    "",
  ])
    assert.equal(
      validate({ reference }),
      schema.safeParse({ reference }).success,
    );
});

test("jedison applies the schema message for the order-reference constraint", () => {
  const message = "Check the order number on your receipt.";
  const editor = new Jedison.Create({
    schema: {
      type: "string",
      "order-reference": true,
      "x-messages": { "order-reference": message },
    },
    constraints: { "order-reference": orderReferenceConstraint },
    data: mistyped,
  });
  const errors = editor.getErrors();
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0].messages, [message]);
  editor.setValue(printed);
  assert.deepEqual(editor.getErrors(), []);
});
