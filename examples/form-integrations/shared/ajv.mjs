import Ajv from "ajv";
import { referenceError } from "./reference.mjs";
export function referenceAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addFormat("order-reference", {
    type: "string",
    validate: (raw) => !referenceError(raw),
  });
  return ajv;
}
