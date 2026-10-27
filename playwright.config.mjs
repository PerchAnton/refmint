import { defineConfig } from '@playwright/test';
const url = `http://127.0.0.1:${process.env.REFMINT_PORT ?? 4173}`;
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: url, headless: true },
  webServer: { command: 'node scripts/serve.mjs', url, reuseExistingServer: false },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ]
});
