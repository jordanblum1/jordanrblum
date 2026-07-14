import { test, expect } from '@playwright/test';

// Task 10 carry-forward regression checks (from Task 6/7 review flags).

test.describe('lighttable rootMargin viewport variance', () => {
  // lighttable.ts uses rootMargin: '0px 0px 350px 0px', calibrated against the
  // default 1280x720 test viewport. Confirm the develop-in still fires on load
  // (no scroll needed) at a small mobile viewport and a larger desktop one.
  const viewports = [
    { name: 'mobile 390x844', width: 390, height: 844 },
    { name: 'desktop 1440x900', width: 1440, height: 900 },
  ];
  for (const vp of viewports) {
    test(`all prints gain .is-visible on load at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      const prints = page.locator('#light-table .print');
      const total = await prints.count();
      await expect(page.locator('#light-table .print.is-visible')).toHaveCount(total);
    });
  }
});

test('facedown flip still reveals content under reduced motion (instant snap is acceptable)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const fd = page.locator('.print.facedown');
  await fd.click();
  await expect(fd).toHaveClass(/flipped/);
  // rotateY(180deg) as a 3D matrix — confirms the flip actually happened (not stuck),
  // even though prefers-reduced-motion swaps the transition to a fast opacity-only one
  // (transform itself snaps instantly, no animation) per global.css/LightTable.astro.
  const transform = await fd.locator('.flip').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).toBe('matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
});
