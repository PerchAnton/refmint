import Jedison from "jedison";
import { orderReferenceConstraint } from "./constraint.mjs";
import { submitReference } from "../shared/reference.mjs";
const app = document.querySelector("#app");
app.innerHTML =
  '<form novalidate><div id="field" class="reference-field"></div><button>Submit reference</button></form><output data-testid="result"></output>';
const editor = new Jedison.Create({
  container: document.querySelector("#field"),
  theme: new Jedison.Theme(),
  data: "",
  showErrors: "always",
  schema: { type: "string", title: "Order reference", "order-reference": true },
  constraints: { "order-reference": orderReferenceConstraint },
});
app.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (editor.getErrors().length) return;
  const result = await submitReference(editor.getValue());
  app.querySelector("output").textContent = result.ok
    ? result.canonical
    : result.error;
});
editor.on("change", () => {
  app.querySelector("output").textContent = "";
});

app.addEventListener("input", () => {
  app.querySelector("output").textContent = "";
});
