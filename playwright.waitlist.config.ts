import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',
  testMatch:'waitlist.spec.ts',
  workers:1,
  webServer:[
    { command:'PUBLIC_WAITLIST_API_URL=http://127.0.0.1:4334/api/studio/waitlist node_modules/.bin/astro build --mode test && node_modules/.bin/astro preview --host 127.0.0.1 --port 4333',url:'http://127.0.0.1:4333/apps/stamp-shift',timeout:60000 },
    { command:'node scripts/tests/waitlist-fixture.mjs',url:'http://127.0.0.1:4334/_fixture',timeout:10000 },
  ],
  use:{ baseURL:'http://127.0.0.1:4333' },
});
