<script setup>
import { ref } from "vue";
import { JsonForms } from "@jsonforms/vue";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { jsonSchema, uiSchema, submitReference } from "../shared/reference.mjs";
import { referenceAjv } from "../shared/ajv.mjs";
const ajv = referenceAjv();
const renderers = Object.freeze(vanillaRenderers);
const data = ref({ reference: "" });
const errors = ref([]);
const result = ref(null);
function changed(event) {
  data.value = event.data;
  errors.value = event.errors ?? [];
  result.value = null;
}
async function submit() {
  if (!errors.value.length)
    result.value = await submitReference(data.value.reference);
}
</script>
<template>
  <form @submit.prevent="submit" @input="result = null" novalidate>
    <div class="reference-field">
      <JsonForms
        :schema="jsonSchema"
        :uischema="uiSchema"
        :data="data"
        :renderers="renderers"
        :ajv="ajv"
        @change="changed"
        validation-mode="ValidateAndShow"
      />
    </div>
    <button type="submit">Submit reference</button
    ><output data-testid="result">{{
      result?.ok ? result.canonical : result?.error
    }}</output>
  </form>
</template>
