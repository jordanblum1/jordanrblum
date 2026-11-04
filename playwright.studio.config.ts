import { defineConfig } from '@playwright/test';

const personalPort = process.env.CI ? 14335 : 4335;
const studioPort = process.env.CI ? 14336 : 4336;
const personalBaseURL = `http://127.0.0.1:${personalPort}`;
const studioBaseURL = `http://127.0.0.1:${studioPort}`;

export default defineConfig({
  workers: 1,
  projects: [
    {
      name: 'jordanblum',
      testDir: 'tests/e2e',
      testMatch: 'launch-personas.spec.ts',
      use: { baseURL: personalBaseURL },
    },
    {
      name: 'buildwithblum',
      testDir: '.',
      testMatch: ['tests/studio/**/*.spec.ts', 'tests/e2e/launch-personas.spec.ts'],
      use: { baseURL: studioBaseURL },
    },
  ],
  webServer: [
    {
      command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${personalPort} --ignore-lock`,
      url: personalBaseURL,
      timeout: 120_000,
    },
    {
      command: `pnpm build:studio && pnpm preview:studio --host 127.0.0.1 --port ${studioPort} --ignore-lock`,
      url: studioBaseURL,
      timeout: 120_000,
    },
  ],
});
