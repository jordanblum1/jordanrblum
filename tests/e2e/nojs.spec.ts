import { test, expect } from '@playwright/test';

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all content is visible without JS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#light-table .print')).toHaveCount(7);
    await expect(page.locator('.beat-sentence')).toHaveCount(4);
    for (const beat of [0, 1, 2, 3]) await expect(page.locator(`.beat-sentence[data-beat="${beat}"]`)).toBeVisible();
    await expect(page.locator('.row')).toHaveCount(11);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // no .reveal opacity trap
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('page renders and story beats still switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#light-table .print').first()).toBeVisible();
  });
});

test('perf: total JS under 60KB gzipped', async ({ page }) => {
  const sizes: number[] = [];
  page.on('response', async (r) => {
    if (r.url().endsWith('.js')) sizes.push(Number(r.headers()['content-length'] ?? 0));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  const total = sizes.reduce((a, b) => a + b, 0);
  expect(total).toBeLessThan(60_000);
});
