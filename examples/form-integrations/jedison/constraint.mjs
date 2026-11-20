import { referenceError } from "../shared/reference.mjs";

export function orderReferenceConstraint({ path, value }) {
  const message = referenceError(value);
  return message
    ? [{ type: "error", constraint: "order-reference", path, messages: [message] }]
    : [];
}
