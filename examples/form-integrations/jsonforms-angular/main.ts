import "zone.js";
import "@angular/compiler";
import { Component, provideZoneChangeDetection, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { ReactiveFormsModule } from "@angular/forms";
import { JsonFormsModule, JsonFormsControl } from "@jsonforms/angular";
import { rankWith, isStringControl } from "@jsonforms/core";
import { jsonSchema, uiSchema, submitReference } from "../shared/reference.mjs";
import { referenceAjv } from "../shared/ajv.mjs";
class ReferenceControl extends JsonFormsControl {
  getEventValue = (event: Event) => (event.target as HTMLInputElement).value;
}
Component({
  selector: "json-reference-field",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<label [for]="id">Order reference</label><input [id]="id" [formControl]="form" (input)="onChange($event)"/><p role="alert">{{error}}</p>`,
})(ReferenceControl);
class App {
  schema = jsonSchema;
  uischema = uiSchema;
  data = { reference: "" };
  ajv = referenceAjv();
  errors: any[] = [];
  result = signal<any>(null);
  renderers = [
    { tester: rankWith(3, isStringControl), renderer: ReferenceControl },
  ];
  async submit(event: Event) {
    event.preventDefault();
    if (!this.errors.length)
      this.result.set(await submitReference(this.data.reference));
  }
}
Component({
  selector: "json-example",
  standalone: true,
  imports: [JsonFormsModule],
  template: `<form (submit)="submit($event)" novalidate><jsonforms [schema]="schema" [uischema]="uischema" [data]="data" [renderers]="renderers" [ajv]="ajv" (dataChange)="data=$event; result.set(null)" (errors)="errors=$event"/><button>Submit reference</button></form><output data-testid="result">{{result()?.ok ? result().canonical : result()?.error}}</output>`,
})(App);
document.getElementById("app").innerHTML = "<json-example></json-example>";
bootstrapApplication(App, { providers: [provideZoneChangeDetection()] });
