import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/studio',
  workers: 1,
  webServer: {
    command: 'pnpm build:studio && pnpm preview:studio --host 127.0.0.1 --port 4336',
    url: 'http://127.0.0.1:4336',
    timeout: 120_000,
  },
  use: { baseURL: 'http://127.0.0.1:4336' },
});
