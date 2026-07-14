import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  webServer: { command: 'pnpm build && pnpm preview --port 4321', port: 4321, reuseExistingServer: true, timeout: 120_000 },
  use: { baseURL: 'http://localhost:4321' },
});
