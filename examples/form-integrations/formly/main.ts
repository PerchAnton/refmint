import "zone.js";
import "@angular/compiler";
import {
  Component,
  importProvidersFrom,
  provideZoneChangeDetection,
  signal,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { ReactiveFormsModule, FormGroup } from "@angular/forms";
import { FormlyModule, FieldType, FormlyFieldConfig } from "@ngx-formly/core";
import { referenceError, submitReference } from "../shared/reference.mjs";
class ReferenceType extends FieldType {}
Component({
  selector: "reference-field",
  standalone: true,
  imports: [ReactiveFormsModule, FormlyModule],
  template: `<label [for]="id">Order reference</label><input [id]="id" [formControl]="formControl" [formlyAttributes]="field"/><p role="alert"><formly-validation-message [field]="field"/></p>`,
})(ReferenceType);
class App {
  form = new FormGroup({});
  model = { reference: "" };
  result = signal<any>(null);
  fields: FormlyFieldConfig[] = [
    {
      key: "reference",
      type: "reference",
      props: { label: "Order reference", required: true },
      validation: { show: true },
      validators: {
        reference: {
          expression: (c) => !referenceError(c.value),
          message: (_err, field) => referenceError(field.formControl.value),
        },
      },
    },
  ];
  async submit() {
    this.form.markAllAsTouched();
    if (this.form.valid)
      this.result.set(await submitReference(this.model.reference));
  }
}
Component({
  selector: "form-example",
  standalone: true,
  imports: [ReactiveFormsModule, FormlyModule],
  template: `<form (input)="result.set(null)" [formGroup]="form" (ngSubmit)="submit()" novalidate><div class="reference-field"><formly-form [form]="form" [model]="model" [fields]="fields"/></div><button>Submit reference</button></form><output data-testid="result">{{result()?.ok ? result().canonical : result()?.error}}</output>`,
})(App);
document.getElementById("app").innerHTML = "<form-example></form-example>";
bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(
      FormlyModule.forRoot({
        types: [{ name: "reference", component: ReferenceType }],
      }),
    ),
  ],
});
