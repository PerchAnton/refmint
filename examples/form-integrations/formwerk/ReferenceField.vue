<script setup>
import { useTextField } from "@formwerk/core";
const { inputProps, labelProps, errorMessageProps, errorMessage, inputEl } =
  useTextField({ name: "reference", label: "Order reference" });
</script>
<template>
  <label v-bind="labelProps">Order reference</label>
  <input ref="inputEl" v-bind="inputProps" />
  <p role="alert" v-bind="errorMessageProps">{{ errorMessage }}</p>
</template>
