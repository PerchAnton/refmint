import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 8000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
  use: {
    launchOptions: { executablePath: process.env.REFMINT_TEST_CHROME },
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5187/",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run dev:superforms",
      url: "http://127.0.0.1:5188/",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
