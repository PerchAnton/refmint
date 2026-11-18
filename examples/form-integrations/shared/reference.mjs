import { createReferenceCodec } from "refmint/codec";
import { z } from "zod";

export const codec = createReferenceCodec({
  prefix: "order",
  kind: "uint64",
  version: 1,
});
export const canonical = codec.encode(42n);
export const printed = codec.format(canonical).toUpperCase();
const last = printed.at(-1);
export const mistyped = printed.slice(0, -1) + (last === "Q" ? "P" : "Q");
export const unknown = codec.format(codec.encode(43n)).toUpperCase();
export const forbidden = codec.format(codec.encode(44n)).toUpperCase();
export const otherNamespace = createReferenceCodec({
  prefix: "other",
  kind: "uint64",
  version: 1,
}).encode(42n);
export const messages = {
  required: "Enter the reference from the sample card.",
  checksum: "The checksum does not match. Check the code on the card.",
  prefix: "Use an ORDER reference.",
  character: "Use the original ASCII characters from the card.",
  format: "Check the reference format and grouping.",
};
export function referenceError(raw) {
  if (typeof raw !== "string" || !raw) return messages.required;
  const result = codec.diagnose(raw);
  return result.ok ? undefined : (messages[result.error] ?? messages.format);
}
// A shape check is deliberately separate: it cannot prove the checksum.
export function matchesShape(raw) {
  return /^ORDER_[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(raw);
}
export const schema = z.object({
  reference: z.string().superRefine((value, ctx) => {
    const message = referenceError(value);
    if (message) ctx.addIssue({ code: "custom", message });
  }),
});
export const jsonSchema = {
  type: "object",
  required: ["reference"],
  properties: {
    reference: {
      type: "string",
      title: "Order reference",
      format: "order-reference",
    },
  },
};
export const uiSchema = { type: "Control", scope: "#/properties/reference" };

// This in-memory service represents a trusted server, not a client-side access gate.
// Invalid syntax/checksums are rejected before any lookup. A valid code is not a credential.
export function lookup(raw, principal = "demo-owner") {
  const error = referenceError(raw);
  if (error) return { ok: false, status: 422, error, lookups: 0 };
  const parsed = codec.diagnose(raw);
  if (parsed.value === 44n || principal !== "demo-owner")
    return {
      ok: false,
      status: 403,
      error: "This record is not available to this account.",
      lookups: 1,
    };
  if (parsed.value !== 42n)
    return {
      ok: false,
      status: 404,
      error: "No matching sample record.",
      lookups: 1,
    };
  return {
    ok: true,
    status: 200,
    canonical: parsed.id,
    record: "Sample order 42",
    lookups: 1,
  };
}
export async function submitReference(reference) {
  const response = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  return response.json();
}
