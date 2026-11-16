<script>
  import { onMount } from 'svelte';
  import { superForm } from 'sveltekit-superforms/client';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { schema, printed, mistyped } from '../../../shared/reference.mjs';
  import '../../../shared/style.css';

  let { data, form: actionData } = $props();
  const { form, errors, message, enhance, submitting } = superForm(
    actionData?.form ?? data.form,
    { validators: zod4Client(schema), resetForm: false },
  );
  onMount(() => { document.querySelector('main').dataset.ready = 'true'; });
</script>

<svelte:head><title>Superforms · RefMint</title></svelte:head>
<a href="http://127.0.0.1:5187/">All examples</a>
<h1>Superforms</h1>
<p>Enter or paste the code, submit, then try the selected one-character typo.</p>
<section class="card">
  <strong>Sample order 42</strong>
  <p class="sample-code">{printed}</p>
  <p>Selected typo: <code>{mistyped}</code></p>
  <p>The checksum check runs on client and server. It is not authorization.</p>
</section>
<main>
  <form oninput={() => { $message = undefined; }} method="POST" use:enhance>
    <div class="reference-field">
      <label for="reference">Order reference</label>
      <input disabled={$submitting} id="reference" name="reference"
        bind:value={$form.reference}
        aria-invalid={$errors.reference ? 'true' : undefined}
        aria-describedby="reference-error" />
      <p id="reference-error" role="alert">{$errors.reference?.join(' ')}</p>
    </div>
    <button disabled={$submitting}>Submit reference</button>
  </form>
  <output data-testid="result">{$message?.ok ? $message.canonical : $message?.error}</output>
</main>
