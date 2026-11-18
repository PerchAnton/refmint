import { superValidate, message } from "sveltekit-superforms/server";
import { zod4 } from "sveltekit-superforms/adapters";
import { fail } from "@sveltejs/kit";
import { schema, lookup } from "../../../shared/reference.mjs";
export const load = async () => ({ form: await superValidate(zod4(schema)) });
export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4(schema));
    if (!form.valid) return fail(422, { form });
    const result = lookup(form.data.reference);
    return message(form, result, { status: result.status });
  },
};
