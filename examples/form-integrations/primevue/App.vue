<script setup>
import { ref, onUnmounted } from 'vue';
import { Form } from '@primevue/forms';
import InputText from 'primevue/inputtext';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { schema } from '../shared/reference.mjs';
import { latestLookup } from '../shared/latest-lookup.mjs';
const result = ref(null);
const lookup = latestLookup(value => { result.value = value; });
const resolver = zodResolver(schema);
onUnmounted(() => lookup.dispose());
async function submit({ valid, values }) {
  if (valid) await lookup.submit(values.reference);
}
</script>
<template>
  <Form v-slot="$form" :initial-values="{ reference: '' }" :resolver="resolver" @submit="submit" @input="lookup.invalidate">
    <div class="reference-field"><label for="reference">Order reference</label>
      <InputText id="reference" name="reference"/>
      <p v-if="$form.reference?.invalid" role="alert">{{ $form.reference.error.message }}</p>
    </div>
    <button type="submit">Submit reference</button>
  </Form>
  <output data-testid="result">{{ result?.ok ? result.canonical : result?.error }}</output>
</template>
