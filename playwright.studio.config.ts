import { defineConfig } from '@playwright/test';

const port = process.env.CI ? 14336 : 4336;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'tests/studio',
  workers: 1,
  webServer: {
    command: `pnpm build:studio && pnpm preview:studio --host 127.0.0.1 --port ${port} --ignore-lock`,
    url: baseURL,
    timeout: 120_000,
  },
  use: { baseURL },
});
