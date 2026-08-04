import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  // The scroll/animation physics tests are timing-sensitive; shared CI
  // runners can stall long enough to miss an animation window. Retries keep
  // a one-off stall from failing the deploy; local runs stay strict.
  retries: process.env.CI ? 2 : 0,
  webServer: { command: 'pnpm build && pnpm preview --port 4321', port: 4321, reuseExistingServer: true, timeout: 120_000 },
  use: { baseURL: 'http://localhost:4321' },
});
