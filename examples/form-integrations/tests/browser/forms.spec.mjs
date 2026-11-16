import { test, expect } from "@playwright/test";
import {
  printed,
  mistyped,
  canonical,
  otherNamespace,
  unknown,
  forbidden,
} from "../../shared/reference.mjs";
const routes = [
  "vueform",
  "autoform",
  "formwerk",
  "formly",
  "jsonforms-react",
  "jsonforms-vue",
  "jsonforms-angular",
  "jedison",
  "conform",
  "superforms",
];
const url = (name) =>
  name === "superforms"
    ? "http://127.0.0.1:5188/"
    : `http://127.0.0.1:5187/${name}/`;
for (const name of routes) {
  test(`${name}: checksum failure preserves input, correction submits canonical lookup key`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST") posts++;
    });
    await page.goto(url(name));
    if (["conform", "superforms"].includes(name))
      await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
    const field = page.getByRole("textbox", { name: "Order reference" });
    await field.fill(mistyped);
    await page.getByRole("button", { name: "Submit reference" }).click();
    await expect(field).toHaveValue(mistyped);
    await expect(page.locator("main")).toContainText(
      /checksum|order-reference/i,
    );
    await expect(page.getByTestId("result")).toBeEmpty();
    expect(posts).toBe(0);
    await field.fill(printed);
    await page.getByRole("button", { name: "Submit reference" }).click();
    await expect(page.getByTestId("result")).toHaveText(canonical);
    await expect(field).toHaveValue(printed);
    expect(errors).toEqual([]);
    await field.fill(mistyped);
    await expect(page.getByTestId("result")).toBeEmpty();
  });
  test(`${name}: wrong namespace is rejected`, async ({ page }) => {
    await page.goto(url(name));
    if (["conform", "superforms"].includes(name))
      await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
    const field = page.getByRole("textbox", { name: "Order reference" });
    await field.fill(otherNamespace);
    await page.getByRole("button", { name: "Submit reference" }).click();
    await expect(field).toHaveValue(otherNamespace);
    await expect(page.getByTestId("result")).toBeEmpty();
    await expect(page.locator("main")).toContainText(
      /ORDER reference|order-reference/i,
    );
  });
}
for (const name of ["conform", "superforms"])
  test(`${name}: server remains authoritative without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(url(name));
    const field = page.getByRole("textbox", { name: "Order reference" });
    await field.fill(mistyped);
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Submit reference" }).click(),
    ]);
    await expect(field).toHaveValue(mistyped);
    await expect(page.locator("main")).toContainText(/checksum/i);
    await expect(page.getByTestId("result")).toBeEmpty();
    await field.fill(printed);
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Submit reference" }).click(),
    ]);
    await expect(page.getByTestId("result")).toHaveText(canonical);
    await context.close();
  });

for (const name of routes)
  test(`${name}: clipboard paste preserves the printed code`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(url(name));
    if (["conform", "superforms"].includes(name))
      await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
    const field = page.getByRole("textbox", { name: "Order reference" });
    await page.evaluate(
      (value) => navigator.clipboard.writeText(value),
      printed,
    );
    await field.focus();
    await field.press("ControlOrMeta+V");
    await expect(field).toHaveValue(printed);
    await page.getByRole("button", { name: "Submit reference" }).click();
    await expect(page.getByTestId("result")).toHaveText(canonical);
  });
for (const name of ["autoform", "formwerk"])
  test(`${name}: reset clears invalid text and lookup output`, async ({
    page,
  }) => {
    await page.goto(url(name));
    const field = page.getByRole("textbox", { name: "Order reference" });
    await field.fill(printed);
    await page.getByRole("button", { name: "Submit reference" }).click();
    await expect(page.getByTestId("result")).toHaveText(canonical);
    await field.fill(mistyped);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(field).toHaveValue("");
    await expect(page.getByTestId("result")).toBeEmpty();
  });
for (const [reference, status, lookups] of [
  [mistyped, 422, 0],
  [otherNamespace, 422, 0],
  [unknown, 404, 1],
  [forbidden, 403, 1],
  [printed, 200, 1],
])
  test(`server rejects bypass or resolves: ${status} ${reference}`, async ({
    request,
  }) => {
    const response = await request.post("http://127.0.0.1:5187/api/lookup", {
      data: { reference },
    });
    expect(response.status()).toBe(status);
    expect((await response.json()).lookups).toBe(lookups);
  });
test("server rejects null JSON without crashing", async ({ request }) => {
  const response = await request.post("http://127.0.0.1:5187/api/lookup", {
    data: "null",
    headers: { "content-type": "application/json" },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).lookups).toBe(0);
});
