<script setup>
import { ref } from "vue";
import { useForm } from "@formwerk/core";
import { schema, submitReference } from "../shared/reference.mjs";
import ReferenceField from "./ReferenceField.vue";
const result = ref(null);
const { handleSubmit, reset } = useForm({
  schema,
  initialValues: { reference: "" },
});
const submit = handleSubmit(async (data) => {
  result.value = await submitReference(data.toObject().reference);
});
</script>
<template>
  <form @submit="submit" @input="result = null" novalidate>
    <div class="reference-field"><ReferenceField /></div>
    <button type="submit">Submit reference</button>
    <button
      type="button"
      @click="
        reset();
        result = null;
      "
    >
      Reset
    </button>
  </form>
  <output data-testid="result">{{
    result?.ok ? result.canonical : result?.error
  }}</output>
</template>
