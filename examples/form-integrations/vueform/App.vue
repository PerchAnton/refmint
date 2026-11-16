<script setup>
import { ref } from "vue";
import { Validator } from "@vueform/vueform";
import { referenceError, submitReference } from "../shared/reference.mjs";
const result = ref(null);
class ReferenceRule extends Validator {
  get msg() {
    return referenceError(this.element$.value) || "Check the reference.";
  }
  check(value) {
    return !referenceError(value);
  }
}
async function send(_formData, form$) {
  result.value = await submitReference(form$.data.reference);
}
</script>
<template>
  <div @input="result = null">
    <Vueform :endpoint="send" validate-on="submit">
      <TextElement
        name="reference"
        label="Order reference"
        :rules="['required', ReferenceRule]"
      />
      <ButtonElement
        name="submit"
        button-label="Submit reference"
        :submits="true"
      />
    </Vueform>
  </div>
  <output data-testid="result">{{
    result?.ok ? result.canonical : result?.error
  }}</output>
</template>
